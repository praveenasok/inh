// Role-Based Access Control (RBAC) System
const INH_ADMINS = ['info@indiannaturalhair.com', 'info@praveenasok.com'];

const ALL_SEGMENTS = [
  'Production Status',
  'Stock Availability',
  'Order Entry',
  'Dispatched Orders',
  'Assignment',
  'Done Orders',
  'Ready To Dispatch Orders',
  'App: Home',
  'App: Inventory',
  'App: JOB-Billing',
  'App: Price Lookup',
  'App: Shipping',
  'App: Shipping Paperwork',
  'App: Delegated Orders',
  'App: Ratio Mixer',
  'App: Manufacturing Order',
  'App: QR Code Tracker',
  'App: SOP'
];

/**
 * Fetches and caches the user's access rights from Firestore.
 * @param {string} email - The user's logged-in email
 * @returns {Promise<string[]>} - Array of allowed segments
 */
async function loadUserAccessRights(email) {
  if (!email) {
    localStorage.setItem('USER_SEGMENTS', JSON.stringify([]));
    return [];
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  
  if (INH_ADMINS.includes(normalizedEmail)) {
    localStorage.setItem('USER_SEGMENTS', JSON.stringify(ALL_SEGMENTS));
    return ALL_SEGMENTS;
  }
  
  try {
    // Wait up to 3 seconds for Firebase
    for (let i = 0; i < 30; i++) {
      if (typeof firebase !== 'undefined' && firebase.firestore) break;
      await new Promise(r => setTimeout(r, 100));
    }

    if (typeof firebase === 'undefined' || !firebase.firestore) {
      console.warn('Firebase not loaded yet for access rights');
      return JSON.parse(localStorage.getItem('USER_SEGMENTS') || '[]');
    }

    const db = firebase.firestore();
    const docRef = db.collection('app_settings').doc('access_control');
    const docSnap = await docRef.get();
    
    let rights = [];
    if (docSnap.exists) {
      const data = docSnap.data();
      const userRightsMap = data.user_rights || {};
      const defaultRights = data.default_rights || [];
      
      if (userRightsMap[normalizedEmail]) {
        rights = userRightsMap[normalizedEmail];
      } else {
        rights = defaultRights;
      }
    } else {
      rights = [];
    }
    
    localStorage.setItem('USER_SEGMENTS', JSON.stringify(rights));
    return rights;
  } catch (err) {
    console.error('Error fetching access rights:', err);
    try {
      return JSON.parse(localStorage.getItem('USER_SEGMENTS') || '[]');
    } catch(e) {
      return [];
    }
  }
}

function hasAccessTo(segment) {
  const email = (localStorage.getItem('SESSION_EMAIL') || '').trim().toLowerCase();
  if (INH_ADMINS.includes(email)) return true;
  
  const publicSegments = ['Production Status', 'Done Orders', 'Ready To Dispatch Orders'];
  if (email && publicSegments.includes(segment)) return true;
  
  try {
    const segments = JSON.parse(localStorage.getItem('USER_SEGMENTS') || '[]');
    return segments.includes(segment);
  } catch (err) {
    return false;
  }
}

/**
 * Checks if the current user is an admin.
 * @returns {boolean}
 */
function isUserAdmin() {
  const email = (localStorage.getItem('SESSION_EMAIL') || '').trim().toLowerCase();
  return INH_ADMINS.includes(email);
}
