// State Management
let recordings = [];
let activeRecording = null;
let activeCategoryFilter = 'All';

// Dynamic Category Mapping
const categoryMeta = {
  'Business': { emoji: '💼', label: 'Business' },
  'Technical': { emoji: '🛠️', label: 'Tech' },
  'Personal': { emoji: '👤', label: 'Personal' },
  'Logistics': { emoji: '📦', label: 'Logistics' },
  'Philosophy': { emoji: '🧠', label: 'Philosophy' }
};

function getRecordingCategory(rec) {
  if (rec.category === 'book_draft') return 'Philosophy';
  
  const text = (rec.full_transcript + ' ' + rec.title + ' ' + rec.id).toLowerCase();
  
  if (text.includes('cigarette') || text.includes('movie') || text.includes('ergonomics')) {
    return 'Personal';
  }
  if (text.includes('shopify') || text.includes('rules') || text.includes('audio routing') || text.includes('script') || text.includes('mic test') || text.includes('system test')) {
    return 'Technical';
  }
  if (text.includes('vendor') || text.includes('fabricat') || text.includes('dispatch') || text.includes('banner') || text.includes('logistics') || text.includes('trade show') || text.includes('box a')) {
    return 'Logistics';
  }
  if (text.includes('operations') || text.includes('merchandising') || text.includes('fair') || text.includes('huddle') || text.includes('client relations') || text.includes('briefing') || text.includes('sales')) {
    return 'Business';
  }
  
  return 'Business';
}

function setCategoryFilter(category) {
  activeCategoryFilter = category;
  
  // Update active styling on category pills
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    // Check custom text content or custom data-category attribute
    const clickAttr = pill.getAttribute('onclick') || '';
    if (clickAttr.includes(category)) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  renderTimeline();
}

window.setCategoryFilter = setCategoryFilter;

function getPhraseVariations(phrase) {
  phrase = phrase.toLowerCase().trim();
  const terms = new Set([phrase]);
  
  if (phrase.endsWith('e') && phrase.length > 3) {
    const stem = phrase.slice(0, -1); // "smoke" -> "smok"
    terms.add(stem + 'ing');
    terms.add(stem + 'ed');
    terms.add(stem + 's');
    terms.add(stem + 'es');
    terms.add(stem + 'er');
    terms.add(stem + 'ers');
  } else if (phrase.endsWith('y') && phrase.length > 3) {
    const stem = phrase.slice(0, -1); // "study" -> "stud"
    terms.add(stem + 'ied');
    terms.add(stem + 'ies');
    terms.add(stem + 'ying');
  } else if (phrase.length > 3) {
    terms.add(phrase + 's');
    terms.add(phrase + 'es');
    terms.add(phrase + 'ed');
    terms.add(phrase + 'ing');
  }
  
  return Array.from(terms);
}


// Safe LocalStorage Loading
let completedReminders = {};
try {
  completedReminders = JSON.parse(localStorage.getItem('cue_completed_reminders')) || {};
} catch (e) {
  completedReminders = {};
}

let customCatchPhrases = ['warehouse speed', 'alignment is key', 'disciplined', 'merchandising flow', 'ergonomics matter'];
try {
  const stored = localStorage.getItem('cue_custom_phrases');
  if (stored) {
    customCatchPhrases = JSON.parse(stored) || customCatchPhrases;
  }
} catch (e) {
  // Use defaults
}


// =============================================================
// IndexedDB helpers for offline audio blob storage
// =============================================================
const DB_NAME = 'cue_audio_db';
const STORE_NAME = 'audio_blobs';
const DB_VERSION = 1;

function openAudioDB() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      const timeout = setTimeout(() => {
        reject(new Error("IndexedDB connection timed out."));
      }, 3000);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        clearTimeout(timeout);
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        clearTimeout(timeout);
        reject(e.target.error || new Error("Failed to open IndexedDB"));
      };
      request.onblocked = () => {
        clearTimeout(timeout);
        reject(new Error("IndexedDB database access blocked"));
      };
    } catch (err) {
      reject(err);
    }
  });
}

async function saveAudioBlob(id, blob) {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, id);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to save audio blob to IndexedDB:', err);
    return false;
  }
}

async function getAudioBlob(id) {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Failed to get audio blob from IndexedDB:', err);
    return null;
  }
}


// DOM Element Selectors
const timelineList = document.getElementById('timeline-list');
const recordingsSearch = document.getElementById('recordings-search');
const welcomeScreen = document.getElementById('welcome-screen');
const activeFileWorkspace = document.getElementById('active-file-workspace');

// Active File Workspace Elements
const activeFileDate = document.getElementById('active-file-date');
const activeFileTitle = document.getElementById('active-file-title');
const activeFileFilename = document.getElementById('active-file-filename');

// Audio Player DOM
const mainAudio = document.getElementById('main-audio-element');
const visualizer = document.querySelector('.premium-audio-player');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnSkipBack = document.getElementById('btn-skip-back');
const btnSkipForward = document.getElementById('btn-skip-forward');
const btnMute = document.getElementById('btn-mute');
const volumeSlider = document.getElementById('volume-slider');
const playerTimeCurrent = document.getElementById('player-time-current');
const playerTimeTotal = document.getElementById('player-time-total');
const progressContainer = document.getElementById('player-progress-container');
const progressFill = document.getElementById('player-progress-fill');
const progressHandle = document.getElementById('player-progress-handle');

// Transcript DOM
const transcriptFilter = document.getElementById('transcript-filter');
const transcriptContainer = document.getElementById('transcript-lines-container');

// Sidebar Tabs DOM
const fileRemindersCount = document.getElementById('file-reminders-count');
const fileRemindersList = document.getElementById('file-reminders-list');
const filePhrasesCount = document.getElementById('file-phrases-count');
const filePhrasesList = document.getElementById('file-phrases-list');
const globalRemindersList = document.getElementById('global-reminders-list');
const customPhrasesContainer = document.getElementById('custom-phrases-list-container');
const newPhraseInput = document.getElementById('new-phrase-input');

/* -------------------------------------------------------------
 * INITIALIZATION & LOADING
 * ------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // 0. Restore collapsed sidebar state
    const isSidebarCollapsed = localStorage.getItem('cue_sidebar_collapsed') === 'true';
    const workspace = document.getElementById('main-workspace');
    if (isSidebarCollapsed && workspace) {
      workspace.classList.add('sidebar-collapsed');
    }

    // 1. Fetch Transcripts Database & Merge with LocalStorage Custom Recordings
    let baseRecordings = [];
    try {
      const response = await fetch('data/transcripts.json');
      if (response.ok) {
        baseRecordings = await response.json();
      }
    } catch (e) {
      console.warn('Failed to load local base transcripts.json', e);
    }
    
    let customRecordings = [];
    try {
      const stored = localStorage.getItem('cue_custom_recordings');
      if (stored) {
        customRecordings = JSON.parse(stored) || [];
      }
    } catch (e) {
      console.warn('Failed to load custom recordings from localStorage', e);
    }
    
    // Merge base and custom recordings. Prevent duplicates by ID.
    const mergedMap = new Map();
    baseRecordings.forEach(rec => mergedMap.set(rec.id, rec));
    customRecordings.forEach(rec => {
      if (!rec.computedCategory) {
        rec.computedCategory = getRecordingCategory(rec);
      }
      mergedMap.set(rec.id, rec);
    });
    
    recordings = Array.from(mergedMap.values());
    
    // Sort recordings chronologically by date
    recordings.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Initialize UI
    renderTimeline();
    renderGlobalReminders();
    renderCustomPhrasesManager();
    setupAudioPlayerListeners();
    setupGlobalEventListeners();

    // 3. Load default active recording if available
    if (recordings.length > 0) {
      // Find a highly interesting default file, e.g. the INH merchandising file
      const defaultRec = recordings.find(r => r.id.includes('INH_Fair_Merchandising')) || recordings[0];
      loadRecording(defaultRec);
    } else {
      showWelcome();
    }
    
    // 4. Initialize Cloud Sync Watcher Polling
    initCloudSyncPolling();
  } catch (error) {
    console.error('Error bootstrapping app:', error);
    timelineList.innerHTML = `<div class="loading-state" style="color:hsl(0, 80%, 65%)">
      <i class="fa-solid fa-triangle-exclamation"></i> Error loading database. Please run the prepopulated data script first.
    </div>`;
  }
});

function toggleRightSidebar() {
  const workspace = document.getElementById('main-workspace');
  if (workspace) {
    workspace.classList.toggle('sidebar-collapsed');
    const isCollapsed = workspace.classList.contains('sidebar-collapsed');
    localStorage.setItem('cue_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }
}

window.toggleRightSidebar = toggleRightSidebar;

/* -------------------------------------------------------------
 * CLOUD SYNC & AUTO-IMPORT FUNCTIONALITY
 * ------------------------------------------------------------- */
let currentSyncStatus = 'idle';
let currentSyncFile = 'None';
let currentSyncTime = 'Never';
let daemonActive = false;
let isManualSyncRunning = false;

async function initCloudSyncPolling() {
  // Perform immediate status check on load
  await checkSyncStatus(true);
  
  // Set up periodic check every 5 seconds
  setInterval(() => {
    checkSyncStatus(false);
  }, 5000);
}

async function checkSyncStatus(isInitial = false) {
  try {
    let data = null;
    
    // 1. Attempt to fetch status from the local sync daemon API
    try {
      const daemonRes = await fetch('http://localhost:3001/status', { mode: 'cors' });
      if (daemonRes.ok) {
        data = await daemonRes.json();
        daemonActive = true;
      }
    } catch (err) {
      daemonActive = false;
    }
    
    // 2. Graceful fallback: Read status from static data directory
    if (!daemonActive) {
      try {
        const staticRes = await fetch('data/sync_status.json?t=' + Date.now());
        if (staticRes.ok) {
          data = await staticRes.json();
        }
      } catch (staticErr) {
        // Safe silent fail
      }
    }
    
    if (!data) return;
    
    const syncPill = document.getElementById('stat-sync');
    const syncText = document.getElementById('sync-status-text');
    
    if (!syncPill) return;
    
    // Update live status variables
    const oldStatus = currentSyncStatus;
    currentSyncStatus = data.status || 'idle';
    currentSyncFile = data.lastSyncFile || 'None';
    currentSyncTime = data.lastSyncTime || 'Never';
    
    // Update Sync Pill UI Elements
    if (currentSyncStatus === 'transcribing') {
      syncPill.className = 'stat-pill active syncing';
      if (syncText) syncText.innerText = 'Syncing...';
      
      // If transitioned to transcribing, show toast
      if (oldStatus !== 'transcribing' && !isInitial) {
        showToast(
          'Mobile Sync Active', 
          `Transcribing new voice note: <strong>${currentSyncFile}</strong> with Gemini 2.5 Flash...`, 
          'syncing'
        );
      }
    } else if (currentSyncStatus === 'unconfigured') {
      syncPill.className = 'stat-pill unconfigured';
      if (syncText) syncText.innerText = 'Cloud Sync: Configure';
    } else {
      // Idle
      syncPill.className = 'stat-pill active';
      if (syncText) {
        syncText.innerText = daemonActive ? 'Cloud Sync: Active' : 'Cloud Sync: Static';
      }
      
      // If transitioned from transcribing to idle
      if (oldStatus === 'transcribing' && !isInitial) {
        dismissToast();
        isManualSyncRunning = false;
        resetSyncButtons();
        
        if (data.lastSuccess) {
          // Show success toast
          showToast(
            'Sync Complete!', 
            `New voice memo <strong>${currentSyncFile}</strong> has been fully transcribed and added to your timeline!`, 
            'success'
          );
          
          // CRITICAL: Reload database dynamically
          await reloadTranscriptsAndTimeline();
        } else {
          showToast(
            'Sync Failed', 
            `Error transcribing <strong>${currentSyncFile}</strong>: ${data.error || 'Unknown error'}`, 
            'error'
          );
        }
      }
    }
    
    // Sync status values inside the Modal if it's currently open
    updateSyncModalUI(data);
  } catch (err) {
    console.error('Error checking sync status:', err);
  }
}

async function triggerManualSync(event) {
  if (event) {
    event.stopPropagation(); // Stop opening the modal if clicked in the header
  }
  
  if (isManualSyncRunning) return;
  
  // 1. Put buttons into loading/spinning state
  const headerIcon = document.getElementById('header-sync-btn-icon');
  const modalIcon = document.getElementById('modal-sync-btn-icon');
  const modalBtn = document.getElementById('btn-modal-sync-now');
  const headerBtn = document.getElementById('btn-header-sync');
  
  if (headerIcon) headerIcon.classList.add('fa-spin');
  if (modalIcon) modalIcon.classList.add('fa-spin');
  if (modalBtn) {
    modalBtn.disabled = true;
    modalBtn.querySelector('span').innerText = 'Scanning Cloud Folder...';
  }
  if (headerBtn) {
    headerBtn.disabled = true;
    headerBtn.querySelector('span').innerText = 'Syncing...';
  }
  
  isManualSyncRunning = true;
  showToast('Initiating Sync', 'Scanning cloud directory for new files...', 'syncing');
  
  try {
    const res = await fetch('http://localhost:3001/sync', { method: 'POST', mode: 'cors' });
    if (res.ok) {
      const result = await res.json();
      console.log('Manual sync scan triggered:', result);
      
      // Poll immediate status check
      setTimeout(async () => {
        await checkSyncStatus(false);
      }, 500);
      
      // Keep running sync overlay, it will auto-dismiss when daemon status turns idle
      setTimeout(() => {
        if (isManualSyncRunning && currentSyncStatus !== 'transcribing') {
          isManualSyncRunning = false;
          resetSyncButtons();
          dismissToast();
          showToast('Sync Scan Finished', 'All files are up to date.', 'success');
          reloadTranscriptsAndTimeline();
        }
      }, 2500);
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast('Sync Deferred', errData.message || 'Daemon was busy or folder unconfigured.', 'error');
      isManualSyncRunning = false;
      resetSyncButtons();
    }
  } catch (err) {
    console.error('Local daemon API offline:', err);
    isManualSyncRunning = false;
    resetSyncButtons();
    
    // Open sync settings modal
    openSyncSettingsModal();
    
    // Highlight the direct upload dropzone to guide the user
    setTimeout(() => {
      const dropzone = document.getElementById('direct-upload-dropzone');
      if (dropzone) {
        dropzone.style.borderColor = 'var(--accent-cyan)';
        dropzone.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.4)';
        dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          dropzone.style.borderColor = '';
          dropzone.style.boxShadow = '';
        }, 3000);
      }
    }, 300);
    
    showToast(
      'Online Direct Sync Available',
      'The daemon is offline. Please drop or select an audio file directly below to transcribe and sync in the browser!',
      'info'
    );
  }
}

function resetSyncButtons() {
  const headerIcon = document.getElementById('header-sync-btn-icon');
  const modalIcon = document.getElementById('modal-sync-btn-icon');
  const modalBtn = document.getElementById('btn-modal-sync-now');
  const headerBtn = document.getElementById('btn-header-sync');
  
  if (headerIcon) headerIcon.classList.remove('fa-spin');
  if (modalIcon) modalIcon.classList.remove('fa-spin');
  if (modalBtn) {
    modalBtn.disabled = false;
    modalBtn.querySelector('span').innerText = 'Sync Cloud Folder Now';
  }
  if (headerBtn) {
    headerBtn.disabled = false;
    headerBtn.querySelector('span').innerText = 'Sync';
  }
}

async function reloadTranscriptsAndTimeline() {
  try {
    let freshRecordings = [];
    try {
      const response = await fetch('data/transcripts.json?t=' + Date.now());
      if (response.ok) {
        freshRecordings = await response.json();
      }
    } catch (e) {
      console.warn('Failed to load fresh base transcripts.json', e);
    }
    
    let customRecordings = [];
    try {
      const stored = localStorage.getItem('cue_custom_recordings');
      if (stored) {
        customRecordings = JSON.parse(stored) || [];
      }
    } catch (e) {
      console.warn('Failed to load custom recordings from localStorage', e);
    }
    
    const mergedMap = new Map();
    freshRecordings.forEach(rec => mergedMap.set(rec.id, rec));
    customRecordings.forEach(rec => {
      if (!rec.computedCategory) {
        rec.computedCategory = getRecordingCategory(rec);
      }
      mergedMap.set(rec.id, rec);
    });
    
    recordings = Array.from(mergedMap.values());
    
    if (recordings.length > 0) {
      // Sort recordings chronologically by date
      recordings.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Re-render
      renderTimeline();
      renderGlobalReminders();
      
      // Update header totals
      updateHeaderStatsPills();
      
      // Load the new file automatically if it's the latest
      const lastRec = recordings[recordings.length - 1];
      if (lastRec) {
        loadRecording(lastRec);
      }
    }
  } catch (e) {
    console.error('Error reloading transcripts database:', e);
  }
}

function updateHeaderStatsPills() {
  const recCountPill = document.getElementById('stat-recordings-count');
  const remCountPill = document.getElementById('stat-reminders-count');
  
  if (recCountPill) {
    recCountPill.querySelector('span').innerText = `${recordings.length} Recordings`;
  }
  
  if (remCountPill) {
    // Count active reminders
    let totalReminders = 0;
    recordings.forEach(rec => {
      rec.reminders.forEach((rem, i) => {
        const remId = `${rec.id}-rem-${i}`;
        if (!completedReminders[remId]) {
          totalReminders++;
        }
      });
    });
    remCountPill.querySelector('span').innerText = `${totalReminders} Active Reminders`;
  }
}

function updateSyncModalUI(data) {
  const modalIndicator = document.getElementById('modal-sync-indicator');
  const modalStatusLabel = document.getElementById('modal-sync-status-label');
  const modalPath = document.getElementById('modal-sync-path');
  
  const daemonPill = document.getElementById('daemon-connection-pill');
  const daemonLabel = document.getElementById('daemon-connection-label');
  const networkPill = document.getElementById('mac-network-pill');
  const networkLabel = document.getElementById('mac-network-label');
  const historyList = document.getElementById('modal-recent-syncs-list');
  
  if (modalIndicator) {
    if (data.status === 'transcribing') {
      modalIndicator.className = 'indicator-dot syncing';
    } else if (data.status === 'unconfigured') {
      modalIndicator.className = 'indicator-dot unconfigured';
    } else {
      modalIndicator.className = 'indicator-dot active';
    }
  }
  
  if (modalStatusLabel) {
    if (data.status === 'transcribing') {
      modalStatusLabel.innerText = 'Watcher Status: Transcribing...';
    } else if (data.status === 'unconfigured') {
      modalStatusLabel.innerText = 'Watcher Status: Unconfigured';
    } else {
      modalStatusLabel.innerText = 'Watcher Status: Active & Watching';
    }
  }
  
  if (modalPath && data.watchedDir) {
    modalPath.innerText = data.watchedDir;
  }

  // Update daemon connection pill
  if (daemonPill && daemonLabel) {
    if (daemonActive) {
      daemonPill.style.background = 'var(--accent-purple-glow)';
      daemonPill.style.borderColor = 'rgba(79, 70, 229, 0.25)';
      daemonPill.querySelector('i').style.color = 'var(--accent-purple)';
      daemonLabel.innerHTML = 'Sync Daemon: <strong>Active (Connected)</strong>';
    } else {
      daemonPill.style.background = 'rgba(239, 68, 68, 0.08)';
      daemonPill.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      daemonPill.querySelector('i').style.color = 'hsl(0, 80%, 60%)';
      daemonLabel.innerHTML = 'Sync Daemon: <strong>Offline</strong>';
    }
  }

  // Update Mac Network status
  if (networkPill && networkLabel) {
    const isOnline = data.networkStatus === 'online' || navigator.onLine;
    if (isOnline) {
      networkPill.style.background = 'var(--accent-emerald-glow)';
      networkPill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      networkPill.querySelector('i').style.color = 'var(--accent-emerald)';
      networkPill.querySelector('i').className = 'fa-solid fa-wifi';
      networkLabel.innerHTML = 'Mac Network: <strong>Online</strong>';
    } else {
      networkPill.style.background = 'rgba(239, 68, 68, 0.08)';
      networkPill.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      networkPill.querySelector('i').style.color = 'hsl(0, 80%, 60%)';
      networkPill.querySelector('i').className = 'fa-solid fa-wifi-slash';
      networkLabel.innerHTML = 'Mac Network: <strong>Offline</strong>';
    }
  }

  // Render recent sync history logs list
  if (historyList) {
    const logs = data.recentSyncs || [];
    if (logs.length === 0) {
      historyList.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 20px 0; background: rgba(0,0,0,0.01); border-radius: var(--radius-sm); border: 1px dashed var(--border-light);">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size: 1.5rem; margin-bottom: 8px; opacity: 0.5; color: var(--accent-purple);"></i>
          <p>No files synced recently yet.</p>
        </div>
      `;
    } else {
      historyList.innerHTML = '';
      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'sync-log-history-card';
        item.style.cssText = 'background: rgba(255, 255, 255, 0.6); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;';
        
        let statusBadge = '';
        if (log.status === 'success') {
          statusBadge = `<span style="font-size: 0.7rem; font-weight: 600; background: var(--accent-emerald-glow); color: var(--accent-emerald); border: 1px solid rgba(16, 185, 129, 0.2); padding: 2px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-circle-check"></i> Synced</span>`;
        } else {
          statusBadge = `<span style="font-size: 0.7rem; font-weight: 600; background: rgba(239, 68, 68, 0.08); color: hsl(0, 80%, 60%); border: 1px solid rgba(239, 68, 68, 0.2); padding: 2px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;" title="${log.error || 'Unknown error'}"><i class="fa-solid fa-triangle-exclamation"></i> Failed</span>`;
        }

        item.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 4px; max-width: 70%; text-align: left;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono);">${log.file}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${log.time}</span>
          </div>
          <div>
            ${statusBadge}
          </div>
        `;
        historyList.appendChild(item);
      });
    }
  }
}

// Modal Toggle Handlers
function openSyncSettingsModal() {
  const modal = document.getElementById('sync-settings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Check status immediately
    checkSyncStatus(true);
  }
}

function closeSyncSettingsModal(e) {
  const modal = document.getElementById('sync-settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Toast Notification Manager
function showToast(title, desc, type = 'info') {
  let toast = document.getElementById('cue-toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cue-toast-notification';
    toast.className = 'cue-toast-alert';
    document.body.appendChild(toast);
  }
  
  let iconClass = 'fa-solid fa-cloud-arrow-up';
  let spinClass = '';
  if (type === 'syncing') {
    spinClass = 'syncing';
  } else if (type === 'success') {
    iconClass = 'fa-solid fa-circle-check';
    spinClass = 'success';
  } else if (type === 'error') {
    iconClass = 'fa-solid fa-triangle-exclamation';
    spinClass = 'error';
  }
  
  toast.innerHTML = `
    <div class="toast-icon ${spinClass}">
      <i class="${iconClass}"></i>
    </div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${desc}</div>
    </div>
  `;
  
  toast.classList.add('show');
  
  // Auto dismiss non-syncing toasts after 6 seconds
  if (type !== 'syncing') {
    setTimeout(() => {
      toast.classList.remove('show');
    }, 6000);
  }
}

function dismissToast() {
  const toast = document.getElementById('cue-toast-notification');
  if (toast) {
    toast.classList.remove('show');
  }
}

window.openSyncSettingsModal = openSyncSettingsModal;
window.closeSyncSettingsModal = closeSyncSettingsModal;
window.triggerManualSync = triggerManualSync;

/* -------------------------------------------------------------
 * DATE FORMATTING UTILITIES
 * ------------------------------------------------------------- */
function formatDayHeader(dateStr) {
  // Format dates nicely, e.g. "2026-05-24" -> "May 24, 2026"
  const dateObj = new Date(dateStr);
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
}

function getDayOfWeek(dateStr) {
  const dateObj = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dateObj.getDay()];
}

function formatDuration(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatSecondsToTimestamp(timeInSecs) {
  return formatDuration(timeInSecs);
}

/* -------------------------------------------------------------
 * TIMELINE RENDERING (Left Sidebar)
 * ------------------------------------------------------------- */
function renderTimeline() {
  const query = recordingsSearch.value.toLowerCase().trim();
  timelineList.innerHTML = '';

  // Group recordings by date
  const groups = {};
  recordings.forEach(rec => {
    // 1. Assign dynamic category
    const cat = getRecordingCategory(rec);
    rec.computedCategory = cat; // cache it

    // 2. Filter by Category
    if (activeCategoryFilter !== 'All' && cat !== activeCategoryFilter) {
      return;
    }

    // 3. Apply search filter if active
    if (query) {
      const matchTitle = rec.title.toLowerCase().includes(query);
      const matchTranscript = rec.full_transcript.toLowerCase().includes(query);
      const matchDate = rec.date.includes(query);
      const matchCategory = cat.toLowerCase().includes(query);
      if (!matchTitle && !matchTranscript && !matchDate && !matchCategory) return;
    }

    if (!groups[rec.date]) {
      groups[rec.date] = [];
    }
    groups[rec.date].push(rec);
  });

  const dates = Object.keys(groups).sort((a, b) => new Date(a) - new Date(b));

  if (dates.length === 0) {
    timelineList.innerHTML = `<div class="no-results-state">
      <i class="fa-solid fa-magnifying-glass"></i> No matching recordings found.
    </div>`;
    return;
  }

  dates.forEach(dateStr => {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'timeline-day-group';

    // Day Header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'timeline-day-title';
    dayHeader.innerHTML = `${formatDayHeader(dateStr)} <span>${getDayOfWeek(dateStr)}</span>`;
    dayGroup.appendChild(dayHeader);

    // Recording Items in Day
    groups[dateStr].forEach(rec => {
      const itemCard = document.createElement('div');
      itemCard.className = `recording-item-card ${activeRecording && activeRecording.id === rec.id ? 'active' : ''}`;
      itemCard.setAttribute('id', `card-${rec.id}`);
      itemCard.onclick = () => loadRecording(rec);

      // Icon determination
      const isShort = rec.duration.split(':')[0] === '00';
      const fileIcon = isShort ? 'fa-regular fa-comment-dots' : 'fa-regular fa-file-audio';

      // Statistics counts
      const remCount = rec.reminders.length;
      const matchPhrases = countSpokenCatchPhrases(rec);
      const cat = rec.computedCategory;

      itemCard.innerHTML = `
        <div class="card-title-row">
          <h4>${rec.title}</h4>
          <span class="card-icon"><i class="${fileIcon}"></i></span>
        </div>
        <div class="card-meta-row">
          <span class="duration-tag"><i class="fa-regular fa-clock"></i> ${rec.duration}</span>
          <div class="insights-badges">
            <span class="insight-badge category" title="Category: ${cat}" style="background:var(--accent-purple-glow); color:var(--accent-purple); font-size: 0.72rem; padding: 2px 5px; border-radius: 4px;">${categoryMeta[cat].emoji}</span>
            ${remCount > 0 ? `<span class="insight-badge reminders" title="${remCount} Action Reminders"><i class="fa-solid fa-bell"></i> ${remCount}</span>` : ''}
            ${matchPhrases > 0 ? `<span class="insight-badge phrases" title="${matchPhrases} Spoken Catch Phrases"><i class="fa-solid fa-quote-left"></i> ${matchPhrases}</span>` : ''}
          </div>
        </div>
      `;
      dayGroup.appendChild(itemCard);
    });

    timelineList.appendChild(dayGroup);
  });
}

function countSpokenCatchPhrases(rec) {
  // Counts both structural catch_phrases and user-defined ones in transcript text
  let count = rec.catch_phrases ? rec.catch_phrases.length : 0;
  const transcriptText = rec.full_transcript.toLowerCase();
  
  customCatchPhrases.forEach(phrase => {
    if (!phrase || !phrase.trim()) return;
    
    // If the phrase is already physically defined in the JSON's catch_phrases, avoid double counting
    const alreadyCounted = rec.catch_phrases && rec.catch_phrases.some(cp => cp.phrase.toLowerCase() === phrase.toLowerCase());
    if (alreadyCounted) return;

    // Search manually in text with stem variations
    const searchTerms = getPhraseVariations(phrase);
    searchTerms.forEach(term => {
      let index = transcriptText.indexOf(term);
      while (index !== -1) {
        count++;
        index = transcriptText.indexOf(term, index + term.length);
      }
    });
  });

  return count;
}

/* -------------------------------------------------------------
 * ACTIVE RECORDING LOADING & RENDERING
 * ------------------------------------------------------------- */
function loadRecording(rec) {
  if (activeRecording && activeRecording.id === rec.id) return;

  // Sync active states on timeline UI
  if (activeRecording) {
    const oldCard = document.getElementById(`card-${activeRecording.id}`);
    if (oldCard) oldCard.classList.remove('active');
  }
  activeRecording = rec;
  const newCard = document.getElementById(`card-${rec.id}`);
  if (newCard) newCard.classList.add('active');

  // Stop any active audio playback
  mainAudio.pause();
  visualizer.classList.remove('playing');
  btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';

  // Toggle workspaces
  welcomeScreen.classList.add('hidden');
  activeFileWorkspace.classList.remove('hidden');

  // Update Metadata
  activeFileDate.innerText = `${formatDayHeader(rec.date)} (${getDayOfWeek(rec.date)})`;
  activeFileTitle.innerText = rec.title;
  activeFileFilename.innerHTML = `<i class="fa-regular fa-file-audio"></i> ${rec.filename}`;
  
  const activeFileCategory = document.getElementById('active-file-category');
  if (activeFileCategory) {
    const cat = rec.computedCategory || getRecordingCategory(rec);
    activeFileCategory.innerHTML = `${categoryMeta[cat].emoji} ${categoryMeta[cat].label}`;
  }

  // Update Audio source
  if (rec.id.startsWith('direct-')) {
    getAudioBlob(rec.id).then(blob => {
      if (blob) {
        if (mainAudio.src.startsWith('blob:')) {
          URL.revokeObjectURL(mainAudio.src);
        }
        mainAudio.src = URL.createObjectURL(blob);
      } else {
        console.error('Audio blob not found in IndexedDB for ID:', rec.id);
        mainAudio.src = '';
      }
      mainAudio.load();
    }).catch(err => {
      console.error('Error fetching audio blob:', err);
      mainAudio.src = '';
      mainAudio.load();
    });
  } else {
    if (mainAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(mainAudio.src);
    }
    mainAudio.src = `audio/${rec.filename}`;
    mainAudio.load();
  }

  // Reset progress bar
  progressFill.style.width = '0%';
  progressHandle.style.left = '0%';
  playerTimeCurrent.innerText = '00:00';
  playerTimeTotal.innerText = rec.duration;

  // Render Transcript & Insights
  renderTranscript();
  renderFileInsights();
  
  // Recalculate global reminders pill in header
  updateGlobalStatsCount();
}

function showWelcome() {
  activeFileWorkspace.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
}

/* -------------------------------------------------------------
 * PREMIUM AUDIO PLAYER FUNCTIONALITY
 * ------------------------------------------------------------- */
function setupAudioPlayerListeners() {
  // Play/Pause Action
  btnPlayPause.addEventListener('click', togglePlayback);

  // Skip buttons (+/- 10 seconds)
  btnSkipBack.addEventListener('click', () => {
    mainAudio.currentTime = Math.max(0, mainAudio.currentTime - 10);
  });
  btnSkipForward.addEventListener('click', () => {
    mainAudio.currentTime = Math.min(mainAudio.duration || 0, mainAudio.currentTime + 10);
  });

  // Volume control
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    mainAudio.volume = val;
    mainAudio.muted = false;
    updateVolumeIcon(val);
  });

  btnMute.addEventListener('click', () => {
    mainAudio.muted = !mainAudio.muted;
    if (mainAudio.muted) {
      btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else {
      updateVolumeIcon(mainAudio.volume);
    }
  });

  // Native Audio events
  mainAudio.addEventListener('loadedmetadata', () => {
    playerTimeTotal.innerText = formatDuration(mainAudio.duration);
  });

  mainAudio.addEventListener('timeupdate', () => {
    const current = mainAudio.currentTime;
    const duration = mainAudio.duration || 1;
    const percent = (current / duration) * 100;
    
    // Update Slider
    progressFill.style.width = `${percent}%`;
    progressHandle.style.left = `${percent}%`;

    // Update readout
    playerTimeCurrent.innerText = formatDuration(current);

    // Sync active transcript lines and autoscroll
    syncActiveTranscriptLine(current);
  });

  mainAudio.addEventListener('ended', () => {
    visualizer.classList.remove('playing');
    btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    progressFill.style.width = '0%';
    progressHandle.style.left = '0%';
    playerTimeCurrent.innerText = '00:00';
  });

  // Progress Bar click scrubbing
  progressContainer.addEventListener('mousedown', (e) => {
    scrubAudio(e);
    
    function onMouseMove(moveEvent) {
      scrubAudio(moveEvent);
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function togglePlayback() {
  if (mainAudio.paused) {
    mainAudio.play()
      .then(() => {
        visualizer.classList.add('playing');
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
      })
      .catch(err => console.error('Audio playback block:', err));
  } else {
    mainAudio.pause();
    visualizer.classList.remove('playing');
    btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

function seekToTime(timeInSecs) {
  mainAudio.currentTime = timeInSecs;
  if (mainAudio.paused) {
    mainAudio.play().then(() => {
      visualizer.classList.add('playing');
      btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
  }
}

function scrubAudio(e) {
  const rect = progressContainer.getBoundingClientRect();
  const width = rect.width;
  const clickX = e.clientX - rect.left;
  const percent = Math.max(0, Math.min(1, clickX / width));
  
  progressFill.style.width = `${percent * 100}%`;
  progressHandle.style.left = `${percent * 100}%`;
  
  if (mainAudio.duration) {
    mainAudio.currentTime = percent * mainAudio.duration;
  }
}

function updateVolumeIcon(vol) {
  if (vol === 0) {
    btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } else if (vol < 0.4) {
    btnMute.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
  } else {
    btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

/* -------------------------------------------------------------
 * TRANSCRIPT RENDERING WITH INLINE HIGHLIGHTING & NAVIGATION
 * ------------------------------------------------------------- */
let transcriptViewMode = 'segmented'; // 'segmented' or 'continuous'

function setTranscriptViewMode(mode) {
  transcriptViewMode = mode;
  updateTranscriptViewToggle();
  renderTranscript();
}

function updateTranscriptViewToggle() {
  const btnSegmented = document.getElementById('btn-view-segmented');
  const btnContinuous = document.getElementById('btn-view-continuous');
  
  if (btnSegmented && btnContinuous) {
    if (transcriptViewMode === 'segmented') {
      btnSegmented.classList.add('active');
      btnContinuous.classList.remove('active');
      
      btnSegmented.style.background = 'var(--bg-card)';
      btnSegmented.style.color = 'var(--text-main)';
      btnContinuous.style.background = 'transparent';
      btnContinuous.style.color = 'var(--text-muted)';
    } else {
      btnSegmented.classList.remove('active');
      btnContinuous.classList.add('active');
      
      btnSegmented.style.background = 'transparent';
      btnSegmented.style.color = 'var(--text-muted)';
      btnContinuous.style.background = 'var(--bg-card)';
      btnContinuous.style.color = 'var(--text-main)';
    }
  }
}

window.setTranscriptViewMode = setTranscriptViewMode;

/* -------------------------------------------------------------
 * TRANSCRIPT RENDERING WITH INLINE HIGHLIGHTING & NAVIGATION
 * ------------------------------------------------------------- */
function renderTranscript() {
  if (!activeRecording) return;
  
  const filterText = transcriptFilter.value.toLowerCase().trim();
  transcriptContainer.innerHTML = '';

  const segments = activeRecording.segments;

  if (segments.length === 0) {
    transcriptContainer.innerHTML = `<div class="no-results-state">No transcript segments available for this file.</div>`;
    return;
  }

  let matchesCount = 0;

  // CONTINUOUS VIEW MODE
  if (transcriptViewMode === 'continuous') {
    // Create toolbar area
    const toolbar = document.createElement('div');
    toolbar.className = 'continuous-toolbar';
    toolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-light);';
    
    // Calculate stats
    const wordCount = activeRecording.full_transcript.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 180));
    
    const statsInfo = document.createElement('div');
    statsInfo.style.cssText = 'font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 12px;';
    statsInfo.innerHTML = `
      <span><i class="fa-solid fa-file-lines" style="color:var(--accent-cyan); margin-right:4px;"></i> <strong>${wordCount}</strong> words</span>
      <span><i class="fa-solid fa-clock" style="color:var(--accent-purple); margin-right:4px;"></i> <strong>${readTime}</strong> min read</span>
    `;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-secondary-sm';
    copyBtn.style.cssText = 'font-size: 0.72rem; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;';
    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Full Text';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(activeRecording.full_transcript);
      copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color:var(--accent-emerald);"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Full Text';
      }, 2000);
    };
    
    toolbar.appendChild(statsInfo);
    toolbar.appendChild(copyBtn);
    transcriptContainer.appendChild(toolbar);

    // Create paragraphs wrapper
    const paragraph = document.createElement('div');
    paragraph.className = 'continuous-paragraph';
    paragraph.style.cssText = 'line-height: 1.8; font-size: 0.95rem; color: var(--text-main); text-align: left; padding: 4px 8px;';

    segments.forEach((seg, index) => {
      let isMatch = true;
      if (filterText && !seg.text.toLowerCase().includes(filterText)) {
        isMatch = false;
      }

      if (isMatch) {
        matchesCount++;
      }

      const segSpan = document.createElement('span');
      segSpan.className = 'continuous-segment-span';
      segSpan.setAttribute('id', `span-line-${index}`);
      segSpan.setAttribute('data-time', seg.time);
      segSpan.onclick = () => seekToTime(seg.time);

      let highlightedText = highlightKeywords(seg.text, activeRecording);

      // If search filter is active and matched, highlight it as well
      if (filterText && isMatch) {
        const regex = new RegExp(`(${escapeRegExp(filterText)})`, 'gi');
        highlightedText = highlightedText.replace(regex, `<mark class="search-match-highlight">$1</mark>`);
      }

      segSpan.innerHTML = highlightedText + ' ';
      
      // If we are filtering, we only show matching segments, otherwise we show all for a seamless read
      if (!filterText || isMatch) {
        paragraph.appendChild(segSpan);
      }
    });

    transcriptContainer.appendChild(paragraph);

    if (matchesCount === 0) {
      transcriptContainer.innerHTML = '';
      transcriptContainer.appendChild(toolbar);
      const noResults = document.createElement('div');
      noResults.className = 'no-results-state';
      noResults.innerHTML = `
        <i class="fa-solid fa-magnifying-glass"></i> No matching transcript sentences.
      `;
      transcriptContainer.appendChild(noResults);
    }

    // Trigger sync for active line to highlight the correct span
    if (mainAudio) {
      syncActiveTranscriptLine(mainAudio.currentTime);
    }
    return;
  }

  // SEGMENTED TIMELINE VIEW MODE (Original)
  segments.forEach((seg, index) => {
    // Apply search filter if active
    if (filterText && !seg.text.toLowerCase().includes(filterText)) {
      return;
    }

    matchesCount++;

    const lineDiv = document.createElement('div');
    lineDiv.className = 'transcript-line';
    lineDiv.setAttribute('id', `line-${index}`);
    lineDiv.setAttribute('data-time', seg.time);
    lineDiv.onclick = () => seekToTime(seg.time);

    // Apply inline keyword highlighting for reminders, catch phrases, and custom catch phrases
    let highlightedText = highlightKeywords(seg.text, activeRecording);

    lineDiv.innerHTML = `
      <span class="line-timestamp" title="Click to jump to ${formatSecondsToTimestamp(seg.time)}">${formatSecondsToTimestamp(seg.time)}</span>
      <p class="line-text">${highlightedText}</p>
    `;

    transcriptContainer.appendChild(lineDiv);
  });

  if (matchesCount === 0) {
    transcriptContainer.innerHTML = `<div class="no-results-state">
      <i class="fa-solid fa-magnifying-glass"></i> No matching transcript sentences.
    </div>`;
  }
}

function highlightKeywords(text, rec) {
  let processed = text;

  // 1. Gather all words/phrases to highlight
  const highlights = [];

  // A. Add active file's reminders keywords
  rec.reminders.forEach(rem => {
    // Find matching substring in text. We try to find partial matches
    const words = rem.text.split(' ').slice(0, 3).join(' '); // grab first 3 words as signature
    if (processed.toLowerCase().includes(words.toLowerCase())) {
      highlights.push({ substring: words, type: 'reminder' });
    }
  });

  // B. Add active file's structured catch phrases
  if (rec.catch_phrases) {
    rec.catch_phrases.forEach(cp => {
      if (processed.toLowerCase().includes(cp.phrase.toLowerCase())) {
        highlights.push({ substring: cp.phrase, type: 'phrase' });
      }
    });
  }

  // C. Add user-defined custom phrases
  customCatchPhrases.forEach(phrase => {
    const variations = getPhraseVariations(phrase);
    variations.forEach(v => {
      if (processed.toLowerCase().includes(v)) {
        // Avoid double highlights if already added
        const exists = highlights.some(hl => hl.substring.toLowerCase() === v);
        if (!exists) {
          highlights.push({ substring: v, type: 'phrase' });
        }
      }
    });
  });

  // Sort highlights by length descending to prevent overlapping match bugs
  highlights.sort((a, b) => b.substring.length - a.substring.length);

  // 2. Perform replacements safely by avoiding HTML injection bugs
  // We use placeholder tokens to prevent regex matching on newly inserted HTML tags
  const replacements = [];
  highlights.forEach((hl, i) => {
    const token = `__HL_${i}__`;
    const regex = new RegExp(`(${escapeRegExp(hl.substring)})`, 'gi');
    processed = processed.replace(regex, (match) => {
      replacements.push({
        token: token,
        html: `<span class="highlight-${hl.type}">${match}</span>`
      });
      return token;
    });
  });

  // Replace placeholders back to actual HTML
  replacements.forEach(rep => {
    processed = processed.replace(rep.token, rep.html);
  });

  return processed;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Keep active line in viewport view
let currentActiveLineIndex = -1;

function syncActiveTranscriptLine(currentTime) {
  if (!activeRecording) return;
  const segments = activeRecording.segments;

  let activeIndex = -1;
  for (let i = 0; i < segments.length; i++) {
    if (currentTime >= segments[i].time && (i === segments.length - 1 || currentTime < segments[i + 1].time)) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex !== -1 && activeIndex !== currentActiveLineIndex) {
    // Remove active class from old Segmented Line and Continuous Span
    const oldLine = document.getElementById(`line-${currentActiveLineIndex}`);
    if (oldLine) oldLine.classList.remove('active');
    
    const oldSpan = document.getElementById(`span-line-${currentActiveLineIndex}`);
    if (oldSpan) oldSpan.classList.remove('active');

    // Add active class to new Segmented Line
    const newLine = document.getElementById(`line-${activeIndex}`);
    if (newLine) {
      newLine.classList.add('active');
      
      // Auto-scroll to center active line smoothly (only if in segmented view)
      if (transcriptViewMode === 'segmented') {
        newLine.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }

    // Add active class to new Continuous Span
    const newSpan = document.getElementById(`span-line-${activeIndex}`);
    if (newSpan) {
      newSpan.classList.add('active');
      
      // Auto-scroll to center active span smoothly (only if in continuous view)
      if (transcriptViewMode === 'continuous') {
        newSpan.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }

    currentActiveLineIndex = activeIndex;
  }
}

/* -------------------------------------------------------------
 * FILE INSIGHTS PANEL (Right Sidebar - Tab 1)
 * ------------------------------------------------------------- */
function renderFileInsights() {
  if (!activeRecording) return;

  // 1. Render active file reminders list
  fileRemindersList.innerHTML = '';
  const rems = activeRecording.reminders;
  fileRemindersCount.innerText = rems.length;

  if (rems.length === 0) {
    fileRemindersList.innerHTML = `<div class="no-results-state" style="padding:20px 0;">No actionable reminders found.</div>`;
  } else {
    rems.forEach((rem, i) => {
      const remId = `${activeRecording.id}-rem-${i}`;
      const isDone = !!completedReminders[remId];

      const card = document.createElement('div');
      card.className = `reminder-card ${isDone ? 'completed' : ''}`;
      card.setAttribute('id', `rem-card-${remId}`);

      card.innerHTML = `
        <div class="checkbox-wrapper">
          <input type="checkbox" id="chk-${remId}" ${isDone ? 'checked' : ''} onchange="toggleReminderDone('${remId}')">
          <span class="custom-checkbox"></span>
        </div>
        <div class="reminder-content">
          <p class="reminder-text">${rem.text}</p>
          <div class="reminder-meta">
            <span class="reminder-jump" onclick="seekToTime(${rem.time})"><i class="fa-solid fa-circle-play"></i> Jump to ${formatSecondsToTimestamp(rem.time)}</span>
          </div>
        </div>
      `;
      fileRemindersList.appendChild(card);
    });
  }

  // 2. Render active file catch phrases list
  filePhrasesList.innerHTML = '';
  const recPhrases = activeRecording.catch_phrases || [];
  
  // Also scan for custom catch phrases spoken in this file
  const customPhrasesFound = [];
  const transcriptLower = activeRecording.full_transcript.toLowerCase();
  
  customCatchPhrases.forEach(phrase => {
    const isAlreadyPresent = recPhrases.some(cp => cp.phrase.toLowerCase() === phrase.toLowerCase());
    if (isAlreadyPresent) return;

    // Scan segment texts using variations
    const variations = getPhraseVariations(phrase);
    activeRecording.segments.forEach(seg => {
      const match = variations.find(v => seg.text.toLowerCase().includes(v));
      if (match) {
        const alreadyAdded = customPhrasesFound.some(cpf => cpf.phrase.toLowerCase() === phrase.toLowerCase() && cpf.time === seg.time);
        if (!alreadyAdded) {
          customPhrasesFound.push({
            phrase: phrase,
            time: seg.time,
            context: seg.text
          });
        }
      }
    });
  });

  const allFilePhrases = [...recPhrases, ...customPhrasesFound];
  allFilePhrases.sort((a, b) => a.time - b.time);
  filePhrasesCount.innerText = allFilePhrases.length;

  if (allFilePhrases.length === 0) {
    filePhrasesList.innerHTML = `<div class="no-results-state" style="padding:20px 0;">No catch phrases identified.</div>`;
  } else {
    allFilePhrases.forEach(cp => {
      const phraseCard = document.createElement('div');
      phraseCard.className = 'phrase-card';

      phraseCard.innerHTML = `
        <div class="phrase-header-row">
          <span class="phrase-text" style="cursor:pointer;" onclick="selectPhraseAndShowCalendar('${cp.phrase}')" title="View phrase calendar analysis"><i class="fa-solid fa-chart-line" style="margin-right:4px; font-size:0.7rem;"></i> ${cp.phrase}</span>
          <button class="btn-play-snippet" onclick="seekToTime(${cp.time})"><i class="fa-solid fa-play"></i> Play snippet</button>
        </div>
        <p class="phrase-context">"${cp.context}"</p>
      `;
      filePhrasesList.appendChild(phraseCard);
    });
  }
}

function toggleReminderDone(remId) {
  const checkbox = document.getElementById(`chk-${remId}`);
  const card = document.getElementById(`rem-card-${remId}`);
  
  if (checkbox.checked) {
    completedReminders[remId] = true;
    if (card) card.classList.add('completed');
  } else {
    delete completedReminders[remId];
    if (card) card.classList.remove('completed');
  }

  localStorage.setItem('cue_completed_reminders', JSON.stringify(completedReminders));
  
  // Sync on global board and updates counters
  renderGlobalReminders();
  updateGlobalStatsCount();
}

/* -------------------------------------------------------------
 * GLOBAL REMINDERS TAB (Right Sidebar - Tab 2)
 * ------------------------------------------------------------- */
function renderGlobalReminders() {
  globalRemindersList.innerHTML = '';
  
  // Aggregate reminders from all recordings
  const allReminders = [];
  recordings.forEach(rec => {
    rec.reminders.forEach((rem, i) => {
      const remId = `${rec.id}-rem-${i}`;
      allReminders.push({
        id: remId,
        text: rem.text,
        time: rem.time,
        date: rec.date,
        recordingTitle: rec.title,
        recObj: rec
      });
    });
  });

  if (allReminders.length === 0) {
    globalRemindersList.innerHTML = `<div class="no-results-state">No reminders aggregated.</div>`;
    return;
  }

  allReminders.forEach(rem => {
    const isDone = !!completedReminders[rem.id];
    const card = document.createElement('div');
    card.className = `reminder-card ${isDone ? 'completed' : ''}`;
    card.setAttribute('id', `global-rem-card-${rem.id}`);

    card.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="global-chk-${rem.id}" ${isDone ? 'checked' : ''} onchange="toggleGlobalReminderDone('${rem.id}')">
        <span class="custom-checkbox"></span>
      </div>
      <div class="reminder-content">
        <p class="reminder-text">${rem.text}</p>
        <div class="reminder-meta">
          <span class="reminder-jump" onclick="loadAndJumpTo('${rem.recObj.id}', ${rem.time})"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Note</span>
          <span class="reminder-origin" title="${rem.recordingTitle}">${rem.recordingTitle}</span>
        </div>
      </div>
    `;
    globalRemindersList.appendChild(card);
  });
}

function toggleGlobalReminderDone(remId) {
  const checkbox = document.getElementById(`global-chk-${remId}`);
  const isChecked = checkbox.checked;

  // Sync to local state
  if (isChecked) {
    completedReminders[remId] = true;
  } else {
    delete completedReminders[remId];
  }
  localStorage.setItem('cue_completed_reminders', JSON.stringify(completedReminders));

  // Sync with active file reminders list if matching active file
  if (activeRecording && remId.startsWith(activeRecording.id)) {
    const localCheckbox = document.getElementById(`chk-${remId}`);
    const localCard = document.getElementById(`rem-card-${remId}`);
    if (localCheckbox) localCheckbox.checked = isChecked;
    if (localCard) {
      if (isChecked) localCard.classList.add('completed');
      else localCard.classList.remove('completed');
    }
  }

  // Toggle visual completed states on global card
  const globalCard = document.getElementById(`global-rem-card-${remId}`);
  if (globalCard) {
    if (isChecked) globalCard.classList.add('completed');
    else globalCard.classList.remove('completed');
  }

  updateGlobalStatsCount();
}

function loadAndJumpTo(recordingId, time) {
  const rec = recordings.find(r => r.id === recordingId);
  if (rec) {
    loadRecording(rec);
    setTimeout(() => {
      seekToTime(time);
    }, 150);
  }
}

function updateGlobalStatsCount() {
  // Aggregate total vs completed reminders
  let totalCount = 0;
  recordings.forEach(rec => {
    totalCount += rec.reminders.length;
  });

  const doneCount = Object.keys(completedReminders).length;
  const activeCount = Math.max(0, totalCount - doneCount);

  // Update header indicator
  const statCount = document.getElementById('stat-reminders-count');
  if (statCount) {
    statCount.innerHTML = `<i class="fa-solid fa-list-check"></i> <span>${activeCount} Active Reminders</span>`;
  }
}

/* -------------------------------------------------------------
 * CUSTOM CATCH PHRASE MANAGER (Right Sidebar - Tab 3)
 * ------------------------------------------------------------- */
function renderCustomPhrasesManager() {
  customPhrasesContainer.innerHTML = '';
  
  if (customCatchPhrases.length === 0) {
    customPhrasesContainer.innerHTML = `<div class="no-results-state">No custom catch phrases defined. Add one above!</div>`;
    return;
  }

  customCatchPhrases.forEach(phrase => {
    const item = document.createElement('div');
    item.className = 'custom-phrase-item';
    
    // Tapping the card (excluding the delete button) triggers the calendar transition
    item.onclick = (e) => {
      if (e.target.closest('.custom-phrase-delete-btn')) return;
      selectPhraseAndShowCalendar(phrase);
    };

    item.innerHTML = `
      <span class="custom-phrase-label"><i class="fa-solid fa-chart-line" style="margin-right:6px; font-size:0.75rem; color:var(--accent-cyan);"></i> ${phrase}</span>
      <button class="custom-phrase-delete-btn" onclick="deleteCustomPhrase('${phrase}')" title="Delete custom phrase"><i class="fa-solid fa-trash-can"></i></button>
    `;
    customPhrasesContainer.appendChild(item);
  });
}

function addNewCustomPhrase() {
  const val = newPhraseInput.value.toLowerCase().trim();
  if (!val) return;

  if (customCatchPhrases.includes(val)) {
    alert("Phrase already defined.");
    newPhraseInput.value = '';
    return;
  }

  customCatchPhrases.push(val);
  localStorage.setItem('cue_custom_phrases', JSON.stringify(customCatchPhrases));
  newPhraseInput.value = '';

  // Re-render phrase lists, managers and search highlighting
  renderCustomPhrasesManager();
  renderTimeline();
  populateCalendarPhrasesDropdown();
  if (activeRecording) {
    renderTranscript();
    renderFileInsights();
  }
  if (document.getElementById('center-tab-btn-calendar').classList.contains('active')) {
    renderCatchPhraseCalendar();
  }
}

function deleteCustomPhrase(phrase) {
  customCatchPhrases = customCatchPhrases.filter(p => p !== phrase);
  localStorage.setItem('cue_custom_phrases', JSON.stringify(customCatchPhrases));

  // Re-render
  renderCustomPhrasesManager();
  renderTimeline();
  populateCalendarPhrasesDropdown();
  if (activeRecording) {
    renderTranscript();
    renderFileInsights();
  }
  if (document.getElementById('center-tab-btn-calendar').classList.contains('active')) {
    renderCatchPhraseCalendar();
  }
}

/* -------------------------------------------------------------
 * TAB SWITCHER & GLOBAL EVENT LISTENERS
 * ------------------------------------------------------------- */
function switchRightTab(tabId) {
  // Toggle Active Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-btn-${tabId}`).classList.add('active');

  // Toggle Active Panels
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`tab-content-${tabId}`).classList.add('active');
}

function setupGlobalEventListeners() {
  // Timeline search bar typing
  recordingsSearch.addEventListener('input', () => {
    renderTimeline();
  });

  // Transcript filtering
  transcriptFilter.addEventListener('input', () => {
    renderTranscript();
  });
  
  // Custom scroll event sync or keyboard space bar overrides for audio playing
  document.addEventListener('keydown', (e) => {
    // If user is actively typing in a search bar, don't hijack keyboard space!
    if (document.activeElement.tagName === 'INPUT') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayback();
    }
  });
}

/* -------------------------------------------------------------
 * CENTER WORKSPACE TABS & HEATMAP CALENDAR HUB
 * ------------------------------------------------------------- */
let selectedCalendarPhrase = '';

function switchCenterTab(tabId) {
  // Toggle Active Tab Buttons
  document.querySelectorAll('.center-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`center-tab-btn-${tabId}`).classList.add('active');

  // Toggle Active Content Panes
  document.querySelectorAll('.center-tab-content').forEach(pane => pane.classList.remove('active'));
  document.getElementById(`center-tab-content-${tabId}`).classList.add('active');

  // Show/Hide appropriate action headers
  if (tabId === 'transcript') {
    document.getElementById('transcript-actions-bar').classList.remove('hidden');
    document.getElementById('calendar-actions-bar').classList.add('hidden');
  } else if (tabId === 'calendar') {
    document.getElementById('transcript-actions-bar').classList.add('hidden');
    document.getElementById('calendar-actions-bar').classList.remove('hidden');
    
    // Auto populate and render calendar
    populateCalendarPhrasesDropdown();
    renderCatchPhraseCalendar();
  } else if (tabId === 'book') {
    document.getElementById('transcript-actions-bar').classList.add('hidden');
    document.getElementById('calendar-actions-bar').classList.add('hidden');
    renderBookBuilder();
  } else if (tabId === 'prompt') {
    document.getElementById('transcript-actions-bar').classList.add('hidden');
    document.getElementById('calendar-actions-bar').classList.add('hidden');
    updatePromptScopeButtons();
  }
}

function selectPhraseAndShowCalendar(phrase) {
  // 1. Switch center tab to calendar
  switchCenterTab('calendar');
  
  // 2. Set selector value and selected state
  const dropdown = document.getElementById('calendar-phrase-selector');
  if (dropdown) {
    dropdown.value = phrase.toLowerCase();
    selectedCalendarPhrase = phrase.toLowerCase();
    
    // 3. Render calendar grid
    renderCatchPhraseCalendar();
  }
}

function populateCalendarPhrasesDropdown() {
  const dropdown = document.getElementById('calendar-phrase-selector');
  if (!dropdown) return;

  const previousSelection = dropdown.value;
  dropdown.innerHTML = '';

  // Gather all unique catch phrases across all recordings
  const phrasesSet = new Set();
  
  // A. Structural catch phrases from files
  recordings.forEach(rec => {
    if (rec.catch_phrases) {
      rec.catch_phrases.forEach(cp => phrasesSet.add(cp.phrase.toLowerCase()));
    }
  });

  // B. User-defined custom catch phrases
  customCatchPhrases.forEach(p => phrasesSet.add(p.toLowerCase()));

  const allUniquePhrases = Array.from(phrasesSet).sort();

  if (allUniquePhrases.length === 0) {
    dropdown.innerHTML = '<option value="">No catch phrases defined</option>';
    return;
  }

  allUniquePhrases.forEach(phrase => {
    const opt = document.createElement('option');
    opt.value = phrase;
    opt.innerText = phrase;
    dropdown.appendChild(opt);
  });

  // Re-apply previous selection if still valid, otherwise default to first
  if (previousSelection && allUniquePhrases.includes(previousSelection)) {
    dropdown.value = previousSelection;
    selectedCalendarPhrase = previousSelection;
  } else {
    selectedCalendarPhrase = allUniquePhrases[0];
  }
}

function renderCatchPhraseCalendar() {
  const dropdown = document.getElementById('calendar-phrase-selector');
  if (!dropdown) return;
  
  selectedCalendarPhrase = dropdown.value;
  if (!selectedCalendarPhrase || !selectedCalendarPhrase.trim()) {
    document.getElementById('calendar-days-grid-container').innerHTML = '<div class="no-results-state">No phrases to track.</div>';
    return;
  }

  const daysGrid = document.getElementById('calendar-days-grid-container');
  const totalStat = document.getElementById('cal-stat-total-occurrences');
  const activeDaysStat = document.getElementById('cal-stat-active-days');
  const timelineContainer = document.getElementById('cal-occurrences-timeline');
  
  daysGrid.innerHTML = '';
  timelineContainer.innerHTML = '';

  // 1. Gather all occurrences and frequencies of selected phrase by date
  // Also gather matching segments for the analytics timeline below
  const occurrenceLog = []; // { date, time, text, recObj }
  const dateCounts = {};    // e.g. { "2026-05-24": 3 }

  recordings.forEach(rec => {
    let dayCount = 0;
    
    // Scan raw transcript segments to count occurances and locate context using variations
    rec.segments.forEach(seg => {
      const textLower = seg.text.toLowerCase();
      const variations = getPhraseVariations(selectedCalendarPhrase);
      
      let count = 0;
      variations.forEach(term => {
        let idx = textLower.indexOf(term);
        while (idx !== -1) {
          count++;
          idx = textLower.indexOf(term, idx + term.length);
        }
      });

      if (count > 0) {
        dayCount += count;
        occurrenceLog.push({
          date: rec.date,
          time: seg.time,
          text: seg.text,
          recordingTitle: rec.title,
          recObj: rec
        });
      }
    });

    if (dayCount > 0) {
      dateCounts[rec.date] = (dateCounts[rec.date] || 0) + dayCount;
    }
  });

  // Sort timeline chronologically
  occurrenceLog.sort((a, b) => new Date(a.date) - new Date(b.date) || a.time - b.time);

  // 2. Render Calendar Grid cells for May 2026
  // May 1st 2026 is on a Friday. Offset is 5 days (Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
  const offsetDays = 5;
  const totalDays = 31;
  const gridCells = 42; // 6 rows of 7 days

  for (let i = 0; i < gridCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';

    const dayNum = i - offsetDays + 1;

    if (i < offsetDays || dayNum > totalDays) {
      // Inactive offset days (padding)
      cell.classList.add('inactive');
      cell.innerHTML = `<span class="day-num">${dayNum <= 0 ? 30 + dayNum : dayNum - totalDays}</span>`;
    } else {
      // Valid Active Days in May 2026
      cell.innerHTML = `<span class="day-num">${dayNum}</span>`;
      
      const paddedDay = dayNum.toString().padStart(2, '0');
      const cellDateStr = `2026-05-${paddedDay}`;
      
      // A. Check if there is a note recording on this date
      const hasNote = recordings.some(r => r.date === cellDateStr);
      if (hasNote) {
        cell.classList.add('active-note');
        
        // Add note dot indicator
        const dot = document.createElement('div');
        dot.className = 'note-count-dot';
        dot.title = 'Recording logged on this date';
        cell.appendChild(dot);

        // Click handler to open the timeline for that date
        cell.onclick = () => {
          const matchingRec = recordings.find(r => r.date === cellDateStr);
          if (matchingRec) {
            loadRecording(matchingRec);
            
            // Highlight card in left sidebar and scroll to it
            const cardEl = document.getElementById(`card-${matchingRec.id}`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Switch back to Transcript view to listen
            switchCenterTab('transcript');
          }
        };
      }

      // B. Check if selected catch phrase occurs on this date
      const phraseCount = dateCounts[cellDateStr] || 0;
      if (phraseCount > 0) {
        cell.classList.add('has-phrase');
        
        // Heatmap severity rating
        if (phraseCount === 1) cell.classList.add('heatmap-low');
        else if (phraseCount === 2) cell.classList.add('heatmap-medium');
        else cell.classList.add('heatmap-high');

        // Add count badge
        const badge = document.createElement('span');
        badge.className = 'phrase-count-badge';
        badge.innerText = `${phraseCount}x`;
        cell.appendChild(badge);
      }
    }
    daysGrid.appendChild(cell);
  }

  // 3. Render stats summary
  let totalPhrasesSum = 0;
  Object.values(dateCounts).forEach(c => totalPhrasesSum += c);
  totalStat.innerText = `${totalPhrasesSum}x`;

  const activeDaysCount = Object.keys(dateCounts).length;
  activeDaysStat.innerText = `Spoken on ${activeDaysCount} out of 5 recording days`;

  // 4. Render Contextual Timeline logs below
  if (occurrenceLog.length === 0) {
    timelineContainer.innerHTML = `<div class="no-results-state" style="padding: 20px 0;">This phrase was not spoken in any logs.</div>`;
    return;
  }

  occurrenceLog.forEach(occ => {
    const item = document.createElement('div');
    item.className = 'occurrence-timeline-item';
    item.onclick = () => {
      loadRecording(occ.recObj);
      setTimeout(() => {
        seekToTime(occ.time);
      }, 150);
    };

    // Highlight matching variation of search phrase inline
    let boldText = occ.text;
    const variations = getPhraseVariations(selectedCalendarPhrase);
    variations.sort((a, b) => b.length - a.length);
    variations.forEach(term => {
      boldText = boldText.replace(new RegExp(`(${escapeRegExp(term)})`, 'gi'), '<strong>$1</strong>');
    });

    item.innerHTML = `
      <div class="occ-item-header">
        <span class="occ-item-date"><i class="fa-regular fa-calendar"></i> ${formatDayHeader(occ.date)}</span>
        <span class="occ-item-time"><i class="fa-regular fa-clock"></i> Jump to ${formatSecondsToTimestamp(occ.time)}</span>
      </div>
      <p class="occ-item-text">"${boldText}"</p>
    `;
    timelineContainer.appendChild(item);
  });
}

/* -------------------------------------------------------------
 * PHILOSOPHY BOOK BUILDER WORKFLOW
 * ------------------------------------------------------------- */
let selectedBookChapterId = null;

function renderBookBuilder() {
  const chaptersList = document.getElementById('book-chapters-list');
  const manuscriptPreview = document.getElementById('book-manuscript-preview');
  
  if (!chaptersList || !manuscriptPreview) return;

  // Filter recordings for book drafts
  const bookRecordings = recordings.filter(rec => {
    const isBookCategory = rec.category === 'book_draft';
    const hasTrigger = rec.full_transcript.toLowerCase().startsWith('book entry') || 
                      rec.full_transcript.toLowerCase().startsWith('philosophy chapter');
    return isBookCategory || hasTrigger;
  });

  // Ensure chronological ordering
  bookRecordings.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (bookRecordings.length === 0) {
    chaptersList.innerHTML = `<div class="no-results-state" style="padding:20px;">No dictated chapters found. Prefix recordings with "Book entry:" or "Philosophy chapter:" to write your book!</div>`;
    manuscriptPreview.innerHTML = `<div class="no-results-state">Your elegant manuscript preview will render here once you select a draft chapter.</div>`;
    return;
  }

  // Set default selection if none active
  if (!selectedBookChapterId || !bookRecordings.some(r => r.id === selectedBookChapterId)) {
    selectedBookChapterId = bookRecordings[0].id;
  }

  // Render chapters sidebar list
  chaptersList.innerHTML = '';
  bookRecordings.forEach((rec, idx) => {
    const wordCount = rec.full_transcript.split(/\s+/).filter(Boolean).length;
    const card = document.createElement('div');
    card.className = `chapter-draft-card ${selectedBookChapterId === rec.id ? 'active' : ''}`;
    card.onclick = () => selectBookChapter(rec.id);

    card.innerHTML = `
      <span class="chapter-num-badge">Chapter ${idx + 1}</span>
      <h5>${rec.title}</h5>
      <div class="chapter-draft-meta">
        <span><i class="fa-regular fa-calendar"></i> ${formatDayHeader(rec.date)}</span>
        <span><i class="fa-solid fa-feather"></i> ${wordCount} words</span>
      </div>
    `;
    chaptersList.appendChild(card);
  });

  // Render manuscript active preview page
  const activeRec = bookRecordings.find(r => r.id === selectedBookChapterId);
  const activeIdx = bookRecordings.indexOf(activeRec);

  if (activeRec) {
    // Generate styled novel page structure
    manuscriptPreview.innerHTML = `
      <div class="manuscript-chapter-header">
        <span class="manuscript-label">Chapter ${activeIdx + 1}</span>
        <h3>${activeRec.title}</h3>
      </div>
      <div class="manuscript-body">
        ${getFormattedManuscriptParagraphs(activeRec.full_transcript)}
      </div>
    `;
  }
}

function selectBookChapter(chapterId) {
  selectedBookChapterId = chapterId;
  renderBookBuilder();
}

function getFormattedManuscriptParagraphs(transcriptText) {
  // Strip trigger prefix if present at start
  let cleanText = transcriptText.replace(/^(book entry:\s*|philosophy chapter:\s*)/i, '');
  
  // Clean punctuation spacings
  cleanText = cleanText.trim();

  // Split into paragraphs (approx. every 2 sentences for neat, elegant novel-page layout)
  const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanText];
  const paragraphs = [];
  let currentParagraph = [];

  sentences.forEach((sentence, i) => {
    currentParagraph.push(sentence.trim());
    if (currentParagraph.length === 2 || i === sentences.length - 1) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  });

  return paragraphs.map(p => `<p>${p}</p>`).join('\n');
}

function copyManuscriptText() {
  // Filter and sort book drafts
  const bookRecordings = recordings.filter(rec => {
    const isBookCategory = rec.category === 'book_draft';
    const hasTrigger = rec.full_transcript.toLowerCase().startsWith('book entry') || 
                      rec.full_transcript.toLowerCase().startsWith('philosophy chapter');
    return isBookCategory || hasTrigger;
  });
  bookRecordings.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (bookRecordings.length === 0) {
    alert("No draft content to copy.");
    return;
  }

  // Aggregate plain text
  let manuscriptText = `PHILOSOPHY BOOK MANUSCRIPT\n`;
  manuscriptText += `==========================\n\n`;

  bookRecordings.forEach((rec, idx) => {
    let cleanText = rec.full_transcript.replace(/^(book entry:\s*|philosophy chapter:\s*)/i, '').trim();
    
    // Formatting paragraphs
    const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanText];
    const paragraphs = [];
    let currentParagraph = [];
    sentences.forEach((sentence, i) => {
      currentParagraph.push(sentence.trim());
      if (currentParagraph.length === 2 || i === sentences.length - 1) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    });

    manuscriptText += `Chapter ${idx + 1}: ${rec.title}\n`;
    manuscriptText += `-`.repeat(rec.title.length + 11) + `\n\n`;
    manuscriptText += paragraphs.join('\n\n') + `\n\n\n`;
  });

  // Write to Clipboard
  navigator.clipboard.writeText(manuscriptText)
    .then(() => {
      // Haptic temporary button check state
      const copyBtn = document.getElementById('btn-copy-manuscript');
      if (copyBtn) {
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Copied!`;
        copyBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
          copyBtn.style.borderColor = '';
        }, 2000);
      }
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy manuscript text to clipboard.');
    });
}

function exportManuscriptMarkdown() {
  // Filter and sort book drafts
  const bookRecordings = recordings.filter(rec => {
    const isBookCategory = rec.category === 'book_draft';
    const hasTrigger = rec.full_transcript.toLowerCase().startsWith('book entry') || 
                      rec.full_transcript.toLowerCase().startsWith('philosophy chapter');
    return isBookCategory || hasTrigger;
  });
  bookRecordings.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (bookRecordings.length === 0) {
    alert("No draft content to export.");
    return;
  }

  // Aggregate Markdown
  let markdown = `# Philosophy Book Draft\n\n`;
  markdown += `*Generated automatically by Cue.ai Plaud Audio Dashboard*\n\n`;
  markdown += `**Author:** Praveen Asok\n`;
  markdown += `**Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n`;
  markdown += `---\n\n`;

  bookRecordings.forEach((rec, idx) => {
    let cleanText = rec.full_transcript.replace(/^(book entry:\s*|philosophy chapter:\s*)/i, '').trim();
    
    // Split into paragraphs
    const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleanText];
    const paragraphs = [];
    let currentParagraph = [];
    sentences.forEach((sentence, i) => {
      currentParagraph.push(sentence.trim());
      if (currentParagraph.length === 2 || i === sentences.length - 1) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    });

    markdown += `## Chapter ${idx + 1}: ${rec.title}\n\n`;
    markdown += paragraphs.join('\n\n') + `\n\n`;
    markdown += `---\n\n`;
  });

  // Browser download trigger
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'philosophy_book_draft.md');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------
 * AI PROMPT MACHINE INTERFACE & QUERY ROUTER
 * ------------------------------------------------------------- */
let promptScope = 'file'; // 'file' or 'global'
let isPromptGenerating = false;

function setPromptScope(scope) {
  promptScope = scope;
  updatePromptScopeButtons();
}

function updatePromptScopeButtons() {
  const btnFile = document.getElementById('btn-prompt-scope-file');
  const btnGlobal = document.getElementById('btn-prompt-scope-global');
  
  if (btnFile && btnGlobal) {
    if (promptScope === 'file') {
      btnFile.classList.add('active');
      btnGlobal.classList.remove('active');
      
      // Update scope label styling
      btnFile.style.background = 'var(--bg-card)';
      btnFile.style.color = 'var(--text-main)';
      btnGlobal.style.background = 'transparent';
      btnGlobal.style.color = 'var(--text-muted)';
    } else {
      btnFile.classList.remove('active');
      btnGlobal.classList.add('active');
      
      btnFile.style.background = 'transparent';
      btnFile.style.color = 'var(--text-muted)';
      btnGlobal.style.background = 'var(--bg-card)';
      btnGlobal.style.color = 'var(--text-main)';
    }
  }
}

async function handleChatFormSubmit() {
  const inputEl = document.getElementById('chat-input-element');
  if (!inputEl) return;
  
  const text = inputEl.value.trim();
  if (!text) return;
  
  inputEl.value = '';
  await executePromptQuery(text);
}

async function executePromptQuery(userPrompt) {
  if (isPromptGenerating) return;
  isPromptGenerating = true;
  
  const chatLogs = document.getElementById('chat-logs-container');
  const sendBtn = document.getElementById('btn-chat-send');
  const sendIcon = document.getElementById('chat-send-icon');
  
  if (!chatLogs) return;
  
  // 1. Add User Message to Log
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'chat-message user';
  userMsgDiv.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; max-width: 85%; margin-left: auto; flex-direction: row-reverse;';
  userMsgDiv.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-purple); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.82rem; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);">PA</div>
    <div style="background: var(--accent-purple-glow); border: 1px solid rgba(79, 70, 229, 0.2); padding: 12px 16px; border-radius: 16px 4px 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); text-align: left;">
      <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5; margin: 0;">${escapeHtml(userPrompt)}</p>
    </div>
  `;
  chatLogs.appendChild(userMsgDiv);
  scrollChatToBottom();
  
  // 2. Add Assistant Thinking/Loading Message
  const assistantMsgDiv = document.createElement('div');
  assistantMsgDiv.className = 'chat-message assistant temp-thinking';
  assistantMsgDiv.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; max-width: 85%;';
  assistantMsgDiv.innerHTML = `
    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);"><i class="fa-solid fa-wand-magic-sparkles fa-spin"></i></div>
    <div style="background: var(--bg-card); border: 1px solid var(--border-light); padding: 12px 16px; border-radius: 4px 16px 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); text-align: left; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Consulting Gemini 2.5 Flash...</span>
    </div>
  `;
  chatLogs.appendChild(assistantMsgDiv);
  scrollChatToBottom();
  
  // Update Send Button Loading state
  if (sendBtn && sendIcon) {
    sendBtn.disabled = true;
    sendIcon.className = 'fa-solid fa-circle-notch fa-spin';
    sendBtn.querySelector('span').innerText = 'Thinking...';
  }
  
  // 3. Formulate query scope payload
  const recordingId = (promptScope === 'file' && activeRecording) ? activeRecording.id : null;
  
  try {
    let answerText = '';
    
    // Attempt local API post
    try {
      const response = await fetch('http://localhost:3001/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, recordingId: recordingId }),
        mode: 'cors'
      });
      
      if (response.ok) {
        const payload = await response.json();
        answerText = payload.answer;
      } else {
        const errorData = await response.json().catch(() => ({}));
        answerText = `**Local Sync Daemon Error**: ${errorData.error || 'Failed to generate response.'}`;
      }
    } catch (daemonErr) {
      // Local daemon server is not running or CORS failure
      console.warn('Local Daemon query processor offline. Checking for static client fallback...');
      
      // Attempt clientside fallback if user has locally stored their GEMINI_API_KEY in settings
      const localApiKey = localStorage.getItem('cue_local_api_key') || '';
      
      if (localApiKey) {
        // Query Gemini from browser if SDK available
        answerText = await queryGeminiDirectlyFromBrowser(userPrompt, recordingId, localApiKey);
      } else {
        answerText = `### Local Sync Daemon Offline
The AI Prompting Machine requires the background Sync Daemon process to be running on your Mac to safely process prompts.

**How to resolve:**
1. Open your terminal in the \`cue.ai\` project folder.
2. Run the command: \`npm run sync\` to start the daemon.
3. Keep the terminal tab open, return here, and try your prompt again!

*(Alternatively, you can save a local \`GEMINI_API_KEY\` in your dashboard settings to run questions directly inside the browser window).*`;
      }
    }
    
    // Remove thinking message
    const tempThinking = chatLogs.querySelector('.temp-thinking');
    if (tempThinking) tempThinking.remove();
    
    // Render Assistant Response bubble
    const finalAssistantDiv = document.createElement('div');
    finalAssistantDiv.className = 'chat-message assistant';
    finalAssistantDiv.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; max-width: 85%;';
    finalAssistantDiv.innerHTML = `
      <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
      <div style="background: var(--bg-card); border: 1px solid var(--border-light); padding: 14px 18px; border-radius: 4px 16px 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); text-align: left; line-height: 1.5; color: var(--text-main); font-size: 0.85rem;" class="markdown-body-chat">
        ${renderMarkdownInline(answerText)}
      </div>
    `;
    chatLogs.appendChild(finalAssistantDiv);
    scrollChatToBottom();
    
  } catch (globalErr) {
    console.error('Chat prompting error:', globalErr);
    const tempThinking = chatLogs.querySelector('.temp-thinking');
    if (tempThinking) tempThinking.remove();
    
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chat-message assistant';
    errorBubble.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; max-width: 85%;';
    errorBubble.innerHTML = `
      <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: hsl(0, 80%, 60%); font-size: 0.8rem; flex-shrink: 0;"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px 16px; border-radius: 4px 16px 16px 16px; text-align: left; color: hsl(0, 80%, 55%); font-size: 0.82rem;">
        An unexpected error occurred while communicating with the AI query engine: ${globalErr.message}
      </div>
    `;
    chatLogs.appendChild(errorBubble);
    scrollChatToBottom();
  } finally {
    isPromptGenerating = false;
    
    // Restore button state
    if (sendBtn && sendIcon) {
      sendBtn.disabled = false;
      sendIcon.className = 'fa-solid fa-paper-plane';
      sendBtn.querySelector('span').innerText = 'Send';
    }
  }
}

async function runSuggestedPrompt(promptText) {
  const inputEl = document.getElementById('chat-input-element');
  if (inputEl) {
    inputEl.value = '';
    await executePromptQuery(promptText);
  }
}

function scrollChatToBottom() {
  const container = document.getElementById('chat-logs-container');
  if (container) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// Lightweight clientside Markdown formatting parser for elegant chat rendering
function renderMarkdownInline(mdText) {
  if (!mdText) return '';
  let html = mdText;
  
  // Escape HTML tags to prevent cross-site scripting bugs in chat bubbles
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h5 style="font-size:0.95rem; font-weight:700; margin-top:12px; margin-bottom:6px; color:var(--text-main);">$1</h5>');
  html = html.replace(/^## (.*?)$/gm, '<h4 style="font-size:1.05rem; font-weight:700; margin-top:14px; margin-bottom:8px; color:var(--text-main);">$1</h4>');
  html = html.replace(/^# (.*?)$/gm, '<h3 style="font-size:1.15rem; font-weight:800; margin-top:16px; margin-bottom:10px; color:var(--text-main);">$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700; color:var(--text-main);">$1</strong>');
  
  // Bullet points
  html = html.replace(/^\s*-\s+(.*?)$/gm, '<li style="margin-left:14px; margin-bottom:4px; font-size:0.84rem;">$1</li>');
  html = html.replace(/^\s*\*\s+(.*?)$/gm, '<li style="margin-left:14px; margin-bottom:4px; font-size:0.84rem;">$1</li>');
  
  // Paragraph splitters
  html = html.split('\n\n').map(para => {
    if (para.trim().startsWith('<h') || para.trim().startsWith('<li')) {
      return para;
    }
    return `<p style="margin-bottom:10px; font-size:0.84rem; line-height:1.5; color:var(--text-main);">${para.trim()}</p>`;
  }).join('\n');
  
  return html;
}

// Clientside fallback processor in case local sync daemon server is uninstalled
async function queryGeminiDirectlyFromBrowser(prompt, recId, apiKey) {
  try {
    // Dynamically loading context straight from timeline state variable
    let context = '';
    if (recId) {
      const rec = recordings.find(r => r.id === recId);
      if (rec) {
        context = `Recording: "${rec.title}"\nTranscript:\n${rec.full_transcript}`;
      }
    } else {
      context = recordings.map((r, i) => `[Log ${i+1}] Title: "${r.title}"\nDate: ${r.date}\nTranscript: ${r.full_transcript}`).join('\n\n');
    }
    
    const requestBody = {
      contents: [{
        parts: [{
          text: `You are Cue.ai, an AI assistant. Answer this user question based on the following transcript history:\n\n${context}\n\nQuestion: ${prompt}`
        }]
      }]
    };
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (res.ok) {
      const resJson = await res.json();
      return resJson.candidates[0].content.parts[0].text;
    } else {
      const errPayload = await res.json().catch(() => ({}));
      return `**Browser Gemini Error**: ${errPayload.error?.message || 'Failed to contact direct API.'}`;
    }
  } catch (e) {
    return `**Browser API Call Failed**: ${e.message}`;
  }
}

window.setPromptScope = setPromptScope;
window.handleChatFormSubmit = handleChatFormSubmit;
window.runSuggestedPrompt = runSuggestedPrompt;

function togglePromptApiSettings(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('prompt-api-key-settings-panel');
  const inputEl = document.getElementById('prompt-local-key-input');
  
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden') && inputEl) {
      // Pre-populate input with key if exists
      const savedKey = localStorage.getItem('cue_local_api_key') || '';
      inputEl.value = savedKey;
    }
  }
}

function saveLocalPromptApiKey() {
  const inputEl = document.getElementById('prompt-local-key-input');
  if (!inputEl) return;
  
  const key = inputEl.value.trim();
  if (!key) {
    alert('Please enter a valid Gemini API Key.');
    return;
  }
  
  localStorage.setItem('cue_local_api_key', key);
  
  // Update status badge UI
  const statusBadge = document.getElementById('prompt-daemon-status-badge');
  if (statusBadge) {
    statusBadge.innerHTML = `<i class="fa-solid fa-key" style="color:var(--accent-emerald);"></i> <span>Engine: Gemini 2.5 (Direct)</span>`;
    statusBadge.style.background = 'var(--accent-emerald-glow)';
    statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
    statusBadge.style.color = 'var(--accent-emerald)';
  }
  
  const panel = document.getElementById('prompt-api-key-settings-panel');
  if (panel) panel.classList.add('hidden');
  
  showToast('API Key Configured!', 'Your Gemini API Key has been saved locally. You can now chat directly with your transcripts from this URL.', 'success');
}

function clearLocalPromptApiKey() {
  localStorage.removeItem('cue_local_api_key');
  const inputEl = document.getElementById('prompt-local-key-input');
  if (inputEl) inputEl.value = '';
  
  // Revert status badge UI
  const statusBadge = document.getElementById('prompt-daemon-status-badge');
  if (statusBadge) {
    statusBadge.innerHTML = `<i class="fa-solid fa-brain"></i> <span>Engine: Gemini 2.5 Flash</span>`;
    statusBadge.style.background = 'var(--accent-purple-glow)';
    statusBadge.style.borderColor = 'rgba(79, 70, 229, 0.2)';
    statusBadge.style.color = 'var(--accent-purple)';
  }
  
  const panel = document.getElementById('prompt-api-key-settings-panel');
  if (panel) panel.classList.add('hidden');
  
  showToast('API Key Cleared', 'Your clientside Gemini API Key has been removed.', 'info');
}

// Check for existing local key on boot to style the Engine pill
window.addEventListener('DOMContentLoaded', () => {
  const localKey = localStorage.getItem('cue_local_api_key');
  if (localKey) {
    setTimeout(() => {
      const statusBadge = document.getElementById('prompt-daemon-status-badge');
      if (statusBadge) {
        statusBadge.innerHTML = `<i class="fa-solid fa-key" style="color:var(--accent-emerald);"></i> <span>Engine: Gemini 2.5 (Direct)</span>`;
        statusBadge.style.background = 'var(--accent-emerald-glow)';
        statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
        statusBadge.style.color = 'var(--accent-emerald)';
      }
    }, 500);
  }
});

window.togglePromptApiSettings = togglePromptApiSettings;
window.saveLocalPromptApiKey = saveLocalPromptApiKey;
window.clearLocalPromptApiKey = clearLocalPromptApiKey;

/* ==========================================================================
   DIRECT ONLINE SYNC & DRAG AND DROP HANDLERS
   ========================================================================== */
async function fetchGeminiTranscription(base64Data, mimeType, apiKey) {
  const promptText = `You are an expert audio transcriptionist and productivity assistant. 
Analyze this audio recording of a user's verbal notes. Perform the following:
1. Provide a concise, descriptive title for this recording (summarize the core topics discussed, do not just copy the filename).
2. Transcribe the audio in full, maintaining natural speech flow but removing excessive filler words ('um', 'ah').
3. Segment the transcription chronologically by time, creating blocks of text with starting timestamps (in seconds).
4. Extract all actionable reminders, to-do list items, or tasks the speaker intends to execute. Provide their text and the exact timestamp in seconds.
5. Identify all characteristic catch phrases (recurrent key phrases, distinct mottos, or highly emphasized expressions). Provide their text, exact timestamp in seconds, and the surrounding context.

You MUST respond strictly with a JSON object following this exact schema:
{
  "title": "Concise descriptive title of recording",
  "full_transcript": "The complete transcription of the audio",
  "segments": [
    { "time": 0, "text": "Segment text..." }
  ],
  "reminders": [
    { "time": 15, "text": "Actionable task text" }
  ],
  "catch_phrases": [
    { "time": 45, "phrase": "The catch phrase text", "context": "Surrounding sentence context of phrase" }
  ]
}

Guidelines for segments and timestamps:
- The 'time' field MUST be an integer representing seconds from the start of the audio.
- Create a new segment roughly every 20-30 seconds or when the topic changes.
- Ensure all reminders and catch_phrases have accurate times matching the audio.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Gemini API responded with status ${response.status}`);
  }

  const resJson = await response.json();
  if (!resJson.candidates || !resJson.candidates[0] || !resJson.candidates[0].content || !resJson.candidates[0].content.parts || !resJson.candidates[0].content.parts[0]) {
    throw new Error("Invalid response format received from Gemini API.");
  }
  
  return resJson.candidates[0].content.parts[0].text;
}

async function handleDirectAudioUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  
  // Validate file type
  const isAudio = file.type.startsWith('audio/') || 
                  file.name.endsWith('.m4a') || 
                  file.name.endsWith('.mp3') || 
                  file.name.endsWith('.wav') || 
                  file.name.endsWith('.aac');
  if (!isAudio) {
    showToast('Invalid File Type', 'Please upload a valid audio file (MP3, M4A, WAV, AAC).', 'error');
    return;
  }
  
  
  // Validate API key
  const apiKey = localStorage.getItem('cue_local_api_key');
  if (!apiKey) {
    showToast(
      'Gemini API Key Required',
      'Direct online syncing requires a Gemini API Key. Please configure your key in the <strong>Prompt Machine</strong> settings tab.',
      'error'
    );
    closeSyncSettingsModal();
    switchCenterTab('prompt');
    setTimeout(() => {
      const panel = document.getElementById('prompt-api-key-settings-panel');
      if (panel) panel.classList.remove('hidden');
    }, 450);
    return;
  }
  
  // Set UI state
  const dropzone = document.getElementById('direct-upload-dropzone');
  const filenameLabel = document.getElementById('direct-upload-filename');
  const icon = document.getElementById('direct-upload-icon');
  
  if (dropzone) {
    dropzone.classList.add('processing');
    dropzone.style.pointerEvents = 'none';
  }
  if (filenameLabel) {
    filenameLabel.innerHTML = `Syncing: <strong>${file.name}</strong>`;
  }
  if (icon) {
    icon.className = 'fa-solid fa-circle-notch fa-spin';
    icon.style.color = 'var(--accent-purple)';
  }
  
  updateProgress("Reading audio file...", 10);
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      updateProgress("Uploading audio stream...", 35);
      const base64Data = e.target.result.split(',')[1];
      const mimeType = file.type || 'audio/mp3';
      
      updateProgress("Transcribing with Gemini...", 65);
      const response = await fetchGeminiTranscription(base64Data, mimeType, apiKey);
      
      updateProgress("Extracting action list...", 85);
      const resultJson = JSON.parse(response);
      
      updateProgress("Saving local backup...", 95);
      
      const fileId = 'direct-' + Date.now();
      const filename = file.name;
      const dateStr = new Date().toISOString().split('T')[0];
      
      const textStart = (resultJson.full_transcript || "").toLowerCase().trim();
      const isBook = textStart.startsWith('book entry') || textStart.startsWith('philosophy chapter');
      
      let maxSeconds = 0;
      if (resultJson.segments && resultJson.segments.length > 0) {
        maxSeconds = resultJson.segments[resultJson.segments.length - 1].time || 0;
      }
      const durationString = formatDuration(maxSeconds);
      
      const formattedRec = {
        id: fileId,
        filename: filename,
        title: resultJson.title || filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
        category: isBook ? "book_draft" : undefined,
        date: dateStr,
        duration: durationString,
        full_transcript: resultJson.full_transcript || '',
        segments: resultJson.segments || [],
        reminders: resultJson.reminders || [],
        catch_phrases: resultJson.catch_phrases || []
      };
      
      // Store raw audio file blob in IndexedDB
      let dbSuccess = false;
      try {
        dbSuccess = await saveAudioBlob(fileId, file);
      } catch (dbErr) {
        console.warn("IndexedDB storage failed or blocked:", dbErr);
      }
      
      if (!dbSuccess) {
        console.warn("Continuing transcription sync without raw audio persistence.");
      }
      
      // Persist metadata to custom recordings in localStorage
      let customRecordings = [];
      try {
        const stored = localStorage.getItem('cue_custom_recordings');
        if (stored) {
          customRecordings = JSON.parse(stored) || [];
        }
      } catch (err) {}
      
      customRecordings.push(formattedRec);
      localStorage.setItem('cue_custom_recordings', JSON.stringify(customRecordings));
      
      updateProgress("Sync complete!", 100);
      setTimeout(() => {
        resetUploadUI();
        showToast('Online Sync Succeeded', `"${formattedRec.title}" has been synced & transcribed perfectly!`, 'success');
        
        // Reload transcripts list & update layout
        reloadTranscriptsAndTimeline();
      }, 800);
      
    } catch (err) {
      console.error("Direct upload syncing failed:", err);
      resetUploadUI();
      showToast('Online Sync Failed', err.message || 'Internet issue or bad Gemini API key.', 'error');
    }
  };
  
  reader.onerror = () => {
    resetUploadUI();
    showToast('File Error', 'Could not parse audio file binary stream.', 'error');
  };
  
  reader.readAsDataURL(file);
}

function updateProgress(status, percent) {
  const container = document.getElementById('direct-upload-progress-container');
  const statusLabel = document.getElementById('direct-upload-progress-status');
  const percentLabel = document.getElementById('direct-upload-progress-percent');
  const progressBar = document.getElementById('direct-upload-progress-bar');
  
  if (container) container.classList.remove('hidden');
  if (statusLabel) statusLabel.innerText = status;
  if (percentLabel) percentLabel.innerText = percent + '%';
  if (progressBar) progressBar.style.width = percent + '%';
}

function resetUploadUI() {
  const dropzone = document.getElementById('direct-upload-dropzone');
  const container = document.getElementById('direct-upload-progress-container');
  const filenameLabel = document.getElementById('direct-upload-filename');
  const icon = document.getElementById('direct-upload-icon');
  const fileInput = document.getElementById('direct-audio-upload-input');
  
  if (dropzone) {
    dropzone.classList.remove('processing');
    dropzone.style.pointerEvents = 'auto';
  }
  if (container) container.classList.add('hidden');
  if (filenameLabel) filenameLabel.innerText = "Click to Select or Drop Audio File";
  if (icon) {
    icon.className = 'fa-solid fa-file-audio';
    icon.style.color = 'var(--accent-cyan)';
  }
  if (fileInput) fileInput.value = '';
}

// Setup drag-and-drop listeners inside the Sync modal on boot
window.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('direct-upload-dropzone');
  
  if (dropzone) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Add/remove hover style cues
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', handleDrop, false);
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropzone.classList.add('dragover');
  }

  function unhighlight() {
    dropzone.classList.remove('dragover');
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
      const audioInput = document.getElementById('direct-audio-upload-input');
      if (audioInput) {
        audioInput.files = files;
        // Trigger manual change event
        const event = { target: { files: files } };
        handleDirectAudioUpload(event);
      }
    }
  }
});

window.handleDirectAudioUpload = handleDirectAudioUpload;


