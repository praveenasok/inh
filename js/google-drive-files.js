// Google Drive Files integration
(function(){
  const cfg = window.GoogleDriveConfig || {};
  let gapiReady = false;
  let authInstance = null;
  let userProfile = null;
  let accessToken = null;
  let tokenClient = null;
  let filesCache = [];
  let filters = { term: '', type: '' };
  let ui = { onAuthChanged: null, renderFiles: null, onFolderChanged: null, onFileOpen: null, onPathChanged: null };
  // Track folder navigation state
  let currentFolderId = (window.GoogleDriveConfig && window.GoogleDriveConfig.FOLDER_ID) || null;
  const folderStack = [];
  const pathStack = [];
  let currentFolderName = 'Shared Folder';

  function humanFileSize(bytes){
    if (!bytes) return '';
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
    const units = ['KB','MB','GB','TB','PB','EB','ZB','YB'];
    let u = -1;
    do { bytes /= thresh; ++u; } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
  }

  async function ensureSignedIn(){
    const scopes = Array.isArray(cfg.SCOPES) && cfg.SCOPES.length ? cfg.SCOPES.join(' ') : 'https://www.googleapis.com/auth/drive.readonly';
    if (accessToken) return;
    if (window.google && google.accounts && google.accounts.oauth2) {
      await new Promise((resolve, reject) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: cfg.CLIENT_ID,
          scope: scopes,
          callback: (resp) => { if (resp && resp.access_token) { accessToken = resp.access_token; resolve(); } else { reject(new Error('Token error')); } }
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      });
      return;
    }
    throw new Error('Google Identity Services not available');
  }

  // Public listing without OAuth: works for folders/files shared to anyone with link
  async function listFilesPublic(folderIdArg){
    const folderId = folderIdArg || currentFolderId || cfg.FOLDER_ID;
    if (!folderId) throw new Error('Missing FOLDER_ID in GoogleDriveConfig');
    const apiKey = cfg.API_KEY;
    if (!apiKey) throw new Error('Missing API_KEY for public listing');
    const qTypes = "(mimeType contains 'image/' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut')";
    const query = `'${folderId}' in parents and ${qTypes}`;
    const params = new URLSearchParams({
      q: query,
      pageSize: '100',
      fields: 'files(id,name,mimeType,thumbnailLink,iconLink,webViewLink,webContentLink,size,shortcutDetails/targetId,shortcutDetails/targetMimeType)',
      key: apiKey,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true'
    });
    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Public list failed ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    const files = (data && data.files) ? data.files : [];
    return files.map(f => {
      const isShortcut = f.mimeType === 'application/vnd.google-apps.shortcut';
      const targetMimeType = isShortcut && f.shortcutDetails ? f.shortcutDetails.targetMimeType : null;
      const targetId = isShortcut && f.shortcutDetails ? f.shortcutDetails.targetId : null;
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder' || (isShortcut && targetMimeType === 'application/vnd.google-apps.folder');
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbUrl: f.thumbnailLink,
        icon: isFolder ? 'fas fa-folder' : 'fas fa-file',
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        size: f.size,
        sizeHuman: humanFileSize(Number(f.size||0)),
        isShortcut,
        targetMimeType,
        targetId,
        isFolder
      };
    });
  }

  async function listFiles(folderIdArg){
    const folderId = folderIdArg || currentFolderId || cfg.FOLDER_ID;
    await ensureSignedIn();
    const qTypes = "(mimeType contains 'image/' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut')";
    const query = `'${folderId}' in parents and ${qTypes}`;
    let files = [];
    if (accessToken) {
      const params = new URLSearchParams({ q: query, pageSize: '100', fields: 'files(id,name,mimeType,thumbnailLink,iconLink,webViewLink,webContentLink,size,shortcutDetails/targetId,shortcutDetails/targetMimeType)', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await resp.json();
      files = (data && data.files) ? data.files : [];
    }
    return files.map(f => {
      const isShortcut = f.mimeType === 'application/vnd.google-apps.shortcut';
      const targetMimeType = isShortcut && f.shortcutDetails ? f.shortcutDetails.targetMimeType : null;
      const targetId = isShortcut && f.shortcutDetails ? f.shortcutDetails.targetId : null;
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder' || (isShortcut && targetMimeType === 'application/vnd.google-apps.folder');
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        thumbUrl: f.thumbnailLink,
        icon: isFolder ? 'fas fa-folder' : 'fas fa-file',
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        size: f.size,
        sizeHuman: humanFileSize(Number(f.size||0)),
        isShortcut,
        targetMimeType,
        targetId,
        isFolder
      };
    });
  }

  function applyFilters(list){
    let result = Array.isArray(list) ? list.slice() : [];
    const term = (filters.term||'').toLowerCase();
    const type = filters.type||'';
    if (term) result = result.filter(f => (f.name||'').toLowerCase().includes(term));
    if (type === 'image') result = result.filter(f => (f.mimeType||'').startsWith('image/'));
    if (type === 'pdf') result = result.filter(f => (f.mimeType||'')==='application/pdf');
    if (type === 'folder') result = result.filter(f => f.isFolder === true);
    return result;
  }

  window.ShareFiles = {
    async init(hooks){
      ui = Object.assign({}, ui, hooks || {});
      currentFolderId = cfg.FOLDER_ID; // ensure starting folder
      if (typeof ui.onFolderChanged === 'function') ui.onFolderChanged(currentFolderId);
      if (typeof ui.onPathChanged === 'function') ui.onPathChanged([...pathStack, { id: currentFolderId, name: currentFolderName }]);
      try {
        await ensureSignedIn();
        if (typeof ui.onAuthChanged === 'function') ui.onAuthChanged({ email: null });
        const files = await listFiles(currentFolderId);
        filesCache = files;
        if (typeof ui.renderFiles === 'function') ui.renderFiles(applyFilters(filesCache));
      } catch (e) {
        try {
          const files = await listFilesPublic(currentFolderId);
          filesCache = files || [];
          if (typeof ui.renderFiles === 'function') ui.renderFiles(applyFilters(filesCache));
        } catch(_) { if (typeof ui.renderFiles === 'function') ui.renderFiles([]); }
      }
    },
    async loadFiles(){
      try {
        await ensureSignedIn();
        const files = await listFiles(currentFolderId);
        filesCache = files;
        if (typeof ui.renderFiles === 'function') ui.renderFiles(applyFilters(filesCache));
      } catch (e) {
        try {
          const files = await listFilesPublic(currentFolderId);
          filesCache = files || [];
          if (typeof ui.renderFiles === 'function') ui.renderFiles(applyFilters(filesCache));
        } catch(_) { if (typeof ui.renderFiles === 'function') ui.renderFiles([]); }
      }
    },
    // Expose unfiltered cache for UI components that should ignore type filters
    getCachedFiles(){ return filesCache.slice(); },
    getAccessToken(){ try { return accessToken || null; } catch(_) { return null; } },
    async peekFolder(folder){
      // Return files for a specific folder without changing current state
      const folderId = folder && (folder.isShortcut && folder.targetId ? folder.targetId : folder.id);
      if (!folderId) return [];
      try {
        await ensureSignedIn();
        const files = await listFiles(folderId);
        return files;
      } catch (e) {
        if (isOriginError(e)) {
          try { return await listFilesPublic(folderId); } catch(_) { return []; }
        }
        return [];
      }
    },
    authorize(){ return ensureSignedIn().then(() => { if (typeof ui.onAuthChanged === 'function') ui.onAuthChanged({ email: null }); }); },
    search(term){ filters.term = term || ''; if (typeof ui.renderFiles==='function') ui.renderFiles(applyFilters(filesCache)); },
    filterType(type){ filters.type = type || ''; if (typeof ui.renderFiles==='function') ui.renderFiles(applyFilters(filesCache)); },
    async shareFile(file){
      try {
        await ensureShareable(file.id);
        const link = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
        await navigator.clipboard.writeText(link);
        alert('Shareable link copied to clipboard');
      } catch (e){ alert('Unable to make shareable: ' + (e.message||e)); }
    },
    async copyLink(file){
      const link = file.webViewLink || file.webContentLink || `https://drive.google.com/file/d/${file.id}/view`;
      try { await navigator.clipboard.writeText(link); alert('Link copied'); } catch (_) { window.prompt('Copy this link:', link); }
    },
    openFile(file){
      const isFolder = (file.mimeType || '') === 'application/vnd.google-apps.folder' || (file.isShortcut && file.targetMimeType === 'application/vnd.google-apps.folder');
      if (isFolder){
        if (currentFolderId) {
          folderStack.push(currentFolderId);
          pathStack.push({ id: currentFolderId, name: currentFolderName });
        }
        currentFolderId = file.isShortcut && file.targetId ? file.targetId : file.id;
        currentFolderName = file.name || currentFolderName;
        if (typeof ui.onFolderChanged === 'function') ui.onFolderChanged(currentFolderId);
        if (typeof ui.onPathChanged === 'function') ui.onPathChanged([...pathStack, { id: currentFolderId, name: currentFolderName }]);
        this.loadFiles();
        return;
      }
      // For files, use hook to keep viewing in-page
      if (typeof ui.onFileOpen === 'function') {
        try { ui.onFileOpen(file); return; } catch (e) {
          console.warn('onFileOpen failed, falling back to Drive link', e);
        }
      }
      // Fallback: open Drive preview link (supports shortcuts)
      const targetId = (file.isShortcut && file.targetId) ? file.targetId : file.id;
      const link = file.webViewLink || `https://drive.google.com/file/d/${targetId}/view`;
      window.location.href = link;
    },
    goBack(){
      if (!folderStack.length) return;
      const prev = pathStack.pop();
      currentFolderId = folderStack.pop();
      currentFolderName = prev && prev.name ? prev.name : currentFolderName;
      if (typeof ui.onFolderChanged === 'function') ui.onFolderChanged(currentFolderId);
      if (typeof ui.onPathChanged === 'function') ui.onPathChanged([...pathStack, { id: currentFolderId, name: currentFolderName }]);
      this.loadFiles();
    },
    goToPath(index){
      // index refers to position in [...pathStack, current]
      const path = [...pathStack, { id: currentFolderId, name: currentFolderName }];
      if (index < 0 || index >= path.length) return;
      const target = path[index];
      // Rebuild stacks to match target
      const newPathStack = path.slice(0, index);
      pathStack.length = 0; // clear
      for (const seg of newPathStack) pathStack.push({ id: seg.id, name: seg.name });
      folderStack.length = 0; // mirror ids for back stack
      for (const seg of newPathStack) folderStack.push(seg.id);
      currentFolderId = target.id;
      currentFolderName = target.name || currentFolderName;
      if (typeof ui.onFolderChanged === 'function') ui.onFolderChanged(currentFolderId);
      if (typeof ui.onPathChanged === 'function') ui.onPathChanged([...pathStack, { id: currentFolderId, name: currentFolderName }]);
      this.loadFiles();
    },
    async shareFolder(){
      try {
        await ensureShareable(cfg.FOLDER_ID);
        const link = `https://drive.google.com/drive/folders/${cfg.FOLDER_ID}`;
        await navigator.clipboard.writeText(link);
        alert('Folder share link copied to clipboard');
      } catch (e){ alert('Unable to share folder: ' + (e.message||e)); }
    },
    async copyFolderLink(){
      const link = `https://drive.google.com/drive/folders/${cfg.FOLDER_ID}`;
      try { await navigator.clipboard.writeText(link); alert('Folder link copied'); } catch (_) { window.prompt('Copy this link:', link); }
    }
  };

  async function ensureShareable(fileId){
    await ensureSignedIn();
    if (accessToken) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }) });
    } else {
      await gapi.client.drive.permissions.create({ fileId, resource: { role: 'reader', type: 'anyone' } });
    }
  }
})();
  function isOriginError(err){
    try {
      const msg = (err && (err.details || err.error || err.message)) ? (err.details || err.error || err.message) : '';
      return /origin/i.test(msg) || /idpiframe_initialization_failed/i.test(msg) || /not\s+a\s+valid\s+origin/i.test(msg) || /gapi is not defined/i.test(msg) || /ERR_BLOCKED_BY_ORB/i.test(msg);
    } catch(_) { return false; }
  }
