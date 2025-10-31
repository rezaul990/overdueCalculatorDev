// Firebase Configuration
// Production-ready configuration for Hostinger hosting

const firebaseConfig = {
  apiKey: "AIzaSyDo-EoKpXaJg0Ik1ASvvIkxfsfNIzgsZps",
  authDomain: "overdue-c6f74.firebaseapp.com",
  projectId: "overdue-c6f74",
  storageBucket: "overdue-c6f74.firebasestorage.app",
  messagingSenderId: "182209709064",
  appId: "1:182209709064:web:df001c5822108e8fdb7dbd"
};

// IMPORTANT: Add your subdomain to Firebase authorized domains
// 1. Go to Firebase Console: https://console.firebase.google.com/
// 2. Select project "overdue-c6f74"
// 3. Go to Authentication > Settings > Authorized domains
// 4. Add your subdomain (e.g., app.yourdomain.com)
// 5. Save changes

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// App Data
let summaryData = [];
let accountsData = [];
let personSummaryData = [];
let branchYearSummaryData = [];
let branchYearPivot2425 = [];
let branchYearPivotAmounts2425 = [];
let currentUser = null;
// Global credit state to avoid shadowing inside UI scope
window.userPlan = "free";
window.userCreditsCount = 0;
window.userSmsCreditsCount = 0;

setTimeout(() => {
  // DOM Elements (initialized inside DOMContentLoaded)
  let masterInput;
  let dailyInput;
  let compareBtn;
  let downloadBtn;
  // downloadAccountsBtn removed as it doesn't exist in HTML
  let screenshotBtn;
  let clearBtn;
  let smsBtn;
  let resultDiv;
  let loadingDiv;
  let notificationBox;
  // Saved Master controls
  let rememberMasterChk;
  let useSavedMasterChk;
  let clearSavedMasterBtn;
  let savedMasterInfo;

  // Auth Elements (initialized inside DOMContentLoaded)
  let loginContainer;
  let googleSignInBtn;
  let userProfile;
  let userAvatar;
  let userName;
  let logoutBtn;
  let userCreditsEl;
  let upgradeBtn;
  let userSmsCreditsEl;

  // SMS Modal elements
  let smsModal;
  let smsCloseBtn;
  let smsBranchSelect;
  let smsNumbersInput;
  let smsPreviewArea;
  let sendSmsBtn;
  let checkSmsStatusBtn;
  let smsResponseBox;
  let smsSaveBtn;
  let sendAllSmsBtn;

  // Credits state
  userPlan = "free";
  userCreditsCount = 0;
  userSmsCreditsCount = 0;

  // ---- Helper: Notifications
  function showNotification(msg,type){
    notificationBox.innerText=msg;
    notificationBox.className="notification "+type;
    notificationBox.style.display="block";
  }

  // ---- IndexedDB helpers for persisting Master file per user
  const IDB_DB_NAME = "overdue_app_db";
  const IDB_STORE = "saved_master";
  const IDB_STORE_MULTIPLE = "multiple_masters";
  let idb;
  let savedMasters = []; // Array to store multiple master files
  
  function getUserScopedKey(){
    const uid = (firebase.auth().currentUser && firebase.auth().currentUser.uid) || "guest";
    return `master_${uid}`;
  }
  
  function getUserMastersKey(){
    const uid = (firebase.auth().currentUser && firebase.auth().currentUser.uid) || "guest";
    return `masters_${uid}`;
  }
  
  // Initialize saved master status on page load
  async function initSavedMasterStatus(){
    try {
      const key = getUserScopedKey();
      console.log("Checking for saved master with key:", key);
      const saved = await idbGet(key);
      console.log("Retrieved saved master:", saved);
      updateSavedMasterBadge(saved ? `Saved: ${saved.name}` : "");
      if (useSavedMasterChk && saved) {
        useSavedMasterChk.checked = true;
      }
      
      // Also load multiple master files
      await loadAllSavedMasters();
      updateMasterFilesUI();
    } catch(e) {
      console.error("Failed to load saved master status:", e);
    }
  }

  // Update master files UI
  function updateMasterFilesUI() {
    try {
      const masterFilesContainer = document.getElementById("masterFilesContainer");
      if (!masterFilesContainer) return;
      
      if (savedMasters.length === 0) {
        masterFilesContainer.innerHTML = '<p style="color: var(--text-light); font-size: 14px; margin: 10px 0;">No saved master files yet.</p>';
        return;
      }
      
      let html = `
        <div style="margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="color: var(--primary); margin: 0; font-size: 16px;">📁 Saved Master Files:</h4>
            <button onclick="syncAllMastersToCloud()" style="background: #06b6d4; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;" title="Sync all to cloud">☁️ Sync All</button>
          </div>
      `;
      
      savedMasters.forEach(master => {
        const date = new Date(master.savedAt).toLocaleDateString();
        const sizeKB = Math.round(master.size / 1024);
        
        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e9ecef;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: var(--text);">${master.name}</div>
              <div style="font-size: 12px; color: var(--text-light);">${date} • ${sizeKB}KB</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button onclick="downloadSavedMaster(${JSON.stringify(master).replace(/"/g, '&quot;')})" style="background: var(--success); color: white; border: none; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Download">📥</button>
              <button onclick="selectSavedMaster('${master.id}')" style="background: var(--primary); color: white; border: none; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Use for comparison">📋</button>
              <button onclick="backupMasterToCloud(${JSON.stringify(master).replace(/"/g, '&quot;')})" style="background: #06b6d4; color: white; border: none; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Backup to cloud">☁️</button>
              <button onclick="deleteSavedMaster('${master.id}')" style="background: var(--danger); color: white; border: none; padding: 4px 6px; border-radius: 4px; font-size: 11px; cursor: pointer;" title="Delete">🗑️</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      masterFilesContainer.innerHTML = html;
    } catch (e) {
      console.error("Update master files UI failed:", e);
    }
  }

  // Select saved master for comparison
  async function selectSavedMaster(masterId) {
    try {
      const master = savedMasters.find(m => m.id === masterId);
      if (!master) {
        showNotification("⚠ Master file not found", "error");
        return;
      }
      
      // Create a file-like object from the saved blob
      const file = new File([master.blob], master.originalName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      // Set the master input to use this file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      masterInput.files = dataTransfer.files;
      
      // Update UI
      document.getElementById("masterFileName").innerText = master.name;
      if (useSavedMasterChk) useSavedMasterChk.checked = true;
      
      showNotification(`✅ Selected master: ${master.name}`, "success");
    } catch (e) {
      console.error("Select master failed:", e);
      showNotification("⚠ Failed to select master", "error");
    }
  }
  function openIdb(){
    return new Promise((resolve,reject)=>{
      if (idb) { resolve(idb); return; }
      const req = indexedDB.open(IDB_DB_NAME, 2); // Increment version for new store
      req.onupgradeneeded = (e)=>{
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        if (!db.objectStoreNames.contains(IDB_STORE_MULTIPLE)) db.createObjectStore(IDB_STORE_MULTIPLE);
      };
      req.onsuccess = ()=>{ idb = req.result; resolve(idb); };
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbSet(key, value){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
      const req = tx.objectStore(IDB_STORE).put(value, key);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbGet(key){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE, "readonly");
      tx.onerror = ()=>reject(tx.error);
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbDelete(key){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
      tx.objectStore(IDB_STORE).delete(key);
    });
  }

  // Multiple master files management
  async function idbSetMultiple(key, value){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE_MULTIPLE, "readwrite");
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
      const req = tx.objectStore(IDB_STORE_MULTIPLE).put(value, key);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>reject(req.error);
    });
  }

  async function idbGetMultiple(key){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE_MULTIPLE, "readonly");
      tx.onerror = ()=>reject(tx.error);
      const req = tx.objectStore(IDB_STORE_MULTIPLE).get(key);
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }

  async function idbDeleteMultiple(key){
    const db = await openIdb();
    return new Promise((resolve,reject)=>{
      const tx = db.transaction(IDB_STORE_MULTIPLE, "readwrite");
      tx.oncomplete = ()=>resolve();
      tx.onerror = ()=>reject(tx.error);
      tx.objectStore(IDB_STORE_MULTIPLE).delete(key);
    });
  }
  function updateSavedMasterBadge(info){
    try {
      if (!savedMasterInfo) return;
      savedMasterInfo.textContent = info || "";
    } catch(_){}
  }

  // Auto-save master file (always save, no checkbox needed)
  async function autoSaveMaster(file) {
    try {
      const key = getUserScopedKey();
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const saveData = { 
        blob, 
        name: file.name, 
        savedAt: Date.now(),
        size: file.size,
        autoSaved: true
      };
      await idbSet(key, saveData);
      updateSavedMasterBadge(`Auto-saved: ${file.name}`);
      return true;
    } catch (e) {
      console.error("Auto-save failed:", e);
      return false;
    }
  }

  // Save master file with custom name
  async function saveMasterWithName(file, customName) {
    try {
      const mastersKey = getUserMastersKey();
      const existingMasters = await idbGetMultiple(mastersKey) || [];
      
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      const masterData = {
        id: Date.now().toString(),
        name: customName || file.name,
        originalName: file.name,
        blob: blob,
        savedAt: Date.now(),
        size: file.size
      };
      
      existingMasters.push(masterData);
      await idbSetMultiple(mastersKey, existingMasters);
      savedMasters = existingMasters;
      return masterData;
    } catch (e) {
      console.error("Save with name failed:", e);
      return null;
    }
  }

  // Load all saved master files
  async function loadAllSavedMasters() {
    try {
      const mastersKey = getUserMastersKey();
      const masters = await idbGetMultiple(mastersKey) || [];
      savedMasters = masters;
      return masters;
    } catch (e) {
      console.error("Load masters failed:", e);
      return [];
    }
  }

  // Download saved master file
  function downloadSavedMaster(masterData) {
    try {
      const url = URL.createObjectURL(masterData.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = masterData.name || masterData.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(`✅ Downloaded: ${masterData.name}`, "success");
    } catch (e) {
      console.error("Download failed:", e);
      showNotification("⚠ Download failed", "error");
    }
  }

  // Delete saved master file
  async function deleteSavedMaster(masterId) {
    try {
      const mastersKey = getUserMastersKey();
      const masters = await idbGetMultiple(mastersKey) || [];
      const filteredMasters = masters.filter(m => m.id !== masterId);
      await idbSetMultiple(mastersKey, filteredMasters);
      savedMasters = filteredMasters;
      updateMasterFilesUI(); // Refresh UI after deletion
      showNotification("✅ Master file deleted", "success");
      return true;
    } catch (e) {
      console.error("Delete failed:", e);
      showNotification("⚠ Delete failed", "error");
      return false;
    }
  }

  // Cloud storage backup functionality
  async function backupMasterToCloud(masterData) {
    try {
      if (!currentUser) {
        showNotification("⚠ Please sign in to backup to cloud", "error");
        return false;
      }
      
      showNotification("☁️ Uploading to cloud...", "success");
      
      // Create a reference to the file in Firebase Storage
      const storageRef = firebase.storage().ref();
      const fileName = `masters/${currentUser.uid}/${masterData.id}_${masterData.name}`;
      const fileRef = storageRef.child(fileName);
      
      // Upload the blob to Firebase Storage
      const uploadTask = fileRef.put(masterData.blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            // Progress tracking
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress + '%');
          },
          (error) => {
            console.error('Upload failed:', error);
            showNotification("⚠ Cloud backup failed", "error");
            reject(error);
          },
          async () => {
            // Upload completed
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            
            // Save metadata to Firestore
            await db.collection('users').doc(currentUser.uid).collection('masterFiles').doc(masterData.id).set({
              name: masterData.name,
              originalName: masterData.originalName,
              downloadURL: downloadURL,
              uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
              size: masterData.size,
              localSavedAt: masterData.savedAt
            });
            
            showNotification("✅ Master backed up to cloud!", "success");
            resolve(true);
          }
        );
      });
    } catch (e) {
      console.error("Cloud backup failed:", e);
      showNotification("⚠ Cloud backup failed", "error");
      return false;
    }
  }

  // Restore master from cloud
  async function restoreMasterFromCloud(masterId) {
    try {
      if (!currentUser) {
        showNotification("⚠ Please sign in to restore from cloud", "error");
        return false;
      }
      
      showNotification("☁️ Downloading from cloud...", "success");
      
      // Get metadata from Firestore
      const docRef = db.collection('users').doc(currentUser.uid).collection('masterFiles').doc(masterId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        showNotification("⚠ Master file not found in cloud", "error");
        return false;
      }
      
      const metadata = doc.data();
      
      // Download the file from Firebase Storage
      const response = await fetch(metadata.downloadURL);
      const blob = await response.blob();
      
      // Create master data object
      const masterData = {
        id: masterId,
        name: metadata.name,
        originalName: metadata.originalName,
        blob: blob,
        savedAt: metadata.localSavedAt || Date.now(),
        size: metadata.size,
        cloudBacked: true
      };
      
      // Save to local storage
      const mastersKey = getUserMastersKey();
      const masters = await idbGetMultiple(mastersKey) || [];
      const existingIndex = masters.findIndex(m => m.id === masterId);
      
      if (existingIndex >= 0) {
        masters[existingIndex] = masterData;
      } else {
        masters.push(masterData);
      }
      
      await idbSetMultiple(mastersKey, masters);
      savedMasters = masters;
      updateMasterFilesUI();
      
      showNotification(`✅ Restored from cloud: ${metadata.name}`, "success");
      return true;
    } catch (e) {
      console.error("Cloud restore failed:", e);
      showNotification("⚠ Cloud restore failed", "error");
      return false;
    }
  }

  // Sync all local masters to cloud
  async function syncAllMastersToCloud() {
    try {
      if (!currentUser) {
        showNotification("⚠ Please sign in to sync to cloud", "error");
        return;
      }
      
      showNotification("☁️ Syncing all masters to cloud...", "success");
      
      let successCount = 0;
      let failCount = 0;
      
      for (const master of savedMasters) {
        try {
          await backupMasterToCloud(master);
          successCount++;
        } catch (e) {
          failCount++;
          console.error(`Failed to backup ${master.name}:`, e);
        }
      }
      
      showNotification(`✅ Synced ${successCount} masters to cloud${failCount > 0 ? ` (${failCount} failed)` : ''}`, "success");
    } catch (e) {
      console.error("Sync failed:", e);
      showNotification("⚠ Sync failed", "error");
    }
  }

  // Make functions globally accessible for HTML onclick handlers
  window.downloadSavedMaster = downloadSavedMaster;
  window.deleteSavedMaster = deleteSavedMaster;
  window.selectSavedMaster = selectSavedMaster;
  window.backupMasterToCloud = backupMasterToCloud;
  window.restoreMasterFromCloud = restoreMasterFromCloud;
  window.syncAllMastersToCloud = syncAllMastersToCloud;
  function hideNotification(){
  notificationBox.style.display="none";
}

// ---- Helper: force number
function forceToNumber(val) {
  if (!val) return 0;
  return Number(val.toString().replace(/,/g,"").trim()) || 0;
}

// ---- Helper function to capitalize text
function capitalizeText(text) {
  if (typeof text !== 'string') return text;
  return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// ---- Labels: previous month like "September-25"; label helpers
function getPrevMonthLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  const prev = new Date(year, month - 1, 1);
  const monthName = prev.toLocaleString('en-US', { month: 'long' });
  const shortYear = String(prev.getFullYear()).slice(-2);
  return `${monthName}-${shortYear}`;
}
function getOverdueLabels() {
  const prevMonth = getPrevMonthLabel();
  return {
    masterLabel: `Overdue ${prevMonth}`,
    dailyLabel: 'Overdue Running',
    changeLabel: 'Increase/Decrease'
  };
}

// ---- Detect header row + Normalize
function readExcel(file, fileType = "default") {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      let range = XLSX.utils.decode_range(sheet["!ref"]);
      let headerRowIndex = null;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        let cellAddr = XLSX.utils.encode_cell({ r: R, c: 4 });
        let cell = sheet[cellAddr];
        if (cell && cell.v && cell.v.toString().trim() !== "") {
          headerRowIndex = R;
          break;
        }
      }

      if (headerRowIndex === null) {
        showNotification("⚠ Header row not found in Column E!", "error");
        resolve([]);
        return;
      }

      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval:"", raw:true, range: headerRowIndex });

      // Process all files with Person ID detection
      jsonData.forEach(row => {
        row.__id = null;
        row.__overdue = 0;
        row.__branch = null;
        row.__account = null;
        row.__customer = null;
        row.__personId = null;
        row.__saleYear = null; // extracted from SALE_DATE (DD-MM-YYYY)

        for (let key in row) {
          let normKey = key.trim().toLowerCase().replace(/_/g," ");
          if (normKey === "sale mst id") row.__id = forceToNumber(row[key]);
          if (normKey.includes("overdue") || normKey.includes("over due")) row.__overdue = forceToNumber(row[key]);
          if (normKey === "plaza") row.__branch = row[key] ? row[key].toString().trim().toUpperCase() : null;
          if (["account no","account number","account"].includes(normKey)) row.__account = row[key] ? row[key].toString().trim() : "";
          if (normKey.includes("customer")) row.__customer = row[key] ? row[key].toString().trim() : "";
          // Detect Person ID in any file
          if (normKey.includes("person") && normKey.includes("id")) row.__personId = row[key] ? row[key].toString().trim() : null;
          // Detect SALE_DATE and extract year
          if (normKey.includes("sale") && normKey.includes("date")) {
            const year = extractYearFromSaleDate(row[key]);
            row.__saleYear = year;
          }
        }
      });

      resolve(jsonData);
    };
    reader.readAsArrayBuffer(file);
  });
}

// ---- Parse SALE_DATE and extract year (supports DD-MM-YYYY string or Excel serial)
function extractYearFromSaleDate(value) {
  if (value == null || value === "") return null;
  // Excel serial number
  if (typeof value === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      return parsed && parsed.y ? parsed.y : null;
    } catch (_) { return null; }
  }
  // String like DD-MM-YYYY or D-M-YYYY
  const s = value.toString().trim();
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) return Number(m[3]);
  // Try Date parse as fallback
  const d = new Date(s);
  const y = d.getFullYear();
  return isNaN(y) ? null : y;
}

// ---- Compare Files
async function processFiles() {
  // Check if user is logged in
  if (!currentUser) {
    showNotification("⚠ Please sign in to use this feature!", "error");
    return;
  }
  // Check credits for free plan
  try {
    const userRef = db.collection("users").doc(firebase.auth().currentUser.uid);
    const snap = await userRef.get();
    const data = snap.exists ? (snap.data()||{}) : {};
    const plan = data.plan || "free";
    const credits = Number(data.credits || 0);
    userPlan = plan; userCreditsCount = credits; updateCreditsUI();
    if (plan === "free" && credits <= 0) {
      showNotification("⚠ You have 0 credits left. Please upgrade to Pro to continue.", "error");
      return;
    }
  } catch (e) {
    console.error("credit check failed", e);
  }
  
  // Determine Master source: from input or saved
  const wantSaved = !!(useSavedMasterChk && useSavedMasterChk.checked);
  const masterFileFromInput = masterInput.files[0] || null;
  if (!dailyInput.files[0]) { showNotification("⚠ Please select/upload Running Overdue file!", "error"); return; }
  if (!wantSaved && !masterFileFromInput) { showNotification("⚠ Please select/upload Master file or enable 'Use saved Master'", "error"); return; }

  loadingDiv.style.display="block"; resultDiv.innerHTML=""; hideNotification();

  // Load Master either from input or IndexedDB
  let masterData;
  if (wantSaved && !masterFileFromInput) {
    const key = getUserScopedKey();
    const saved = await idbGet(key);
    if (!saved) { showNotification("⚠ No saved Master found on this device.", "error"); return; }
    const masterBlob = saved && saved.blob ? saved.blob : null;
    if (!masterBlob) { showNotification("⚠ Saved Master is corrupted.", "error"); return; }
    const fileLike = new File([masterBlob], saved.name || "saved_master.xlsx", { type: masterBlob.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    masterData = await readExcel(fileLike);
  } else {
    masterData = await readExcel(masterFileFromInput);
  }
  const dailyData=await readExcel(dailyInput.files[0]);

  let dailyMap={};
  dailyData.forEach(r=>{
    if(r.__id) dailyMap[r.__id] = { overdue: r.__overdue, account: r.__account, customer: r.__customer, personId: r.__personId };
  });

  let summary={}; accountsData=[];

  masterData.forEach(r=>{
    if(!r.__id || !r.__branch || r.__branch==="PLAZA") return;

    let m = r.__overdue || 0;
    let dailyEntry = dailyMap[r.__id];
    let d = dailyEntry ? dailyEntry.overdue : 0;
    let diff = d - m;

    if(!summary[r.__branch]) summary[r.__branch]={ "Branch Name":capitalizeText(r.__branch), masterTotal:0,dailyTotal:0,change:0 };
    summary[r.__branch].masterTotal += m;
    summary[r.__branch].dailyTotal  += d;
    summary[r.__branch].change      += diff;

    // Determine Person ID for this account
    let assignPersonId = "Unassigned";
    if (dailyEntry && dailyEntry.personId && !dailyEntry.personId.toString().toLowerCase().includes("assign person id")) {
      assignPersonId = dailyEntry.personId.toString().trim();
    }

    const { masterLabel, dailyLabel, changeLabel } = getOverdueLabels();
    accountsData.push({
      "Sale Mst ID": r.__id,
      "Branch Name": capitalizeText(r.__branch),
      "Account Number": r.__account || (dailyEntry ? dailyEntry.account : ""),
      "Customer Name": capitalizeText(r.__customer || (dailyEntry ? dailyEntry.customer : "")),
      "Assign Person ID": capitalizeText(assignPersonId),
      [masterLabel]: m,
      [dailyLabel]: d,
      [changeLabel]: diff
    });
  });

  summaryData=Object.values(summary).sort((a,b)=>a["Branch Name"].localeCompare(b["Branch Name"]));
  summaryData.push(summaryData.reduce((acc,r)=>{
    acc.masterTotal+=r.masterTotal;
    acc.dailyTotal +=r.dailyTotal;
    acc.change     +=r.change;
    return acc;
  }, { "Branch Name":"TOTAL", masterTotal:0,dailyTotal:0,change:0 }));

  // Process Person ID data for all Master file accounts
  personSummaryData = [];
  let personSummary = {};
  
  // Create a map of Daily data for quick lookup
  let dailyPersonMap = {};
  dailyData.forEach(dailyRow => {
    if (dailyRow.__id) {
      dailyPersonMap[dailyRow.__id] = {
        overdue: dailyRow.__overdue || 0,
        personId: dailyRow.__personId
      };
    }
  });
  
  // Process all Master file accounts
  masterData.forEach(masterRow => {
    if (!masterRow.__id || !masterRow.__branch || masterRow.__branch === "PLAZA") return;
    
    let personId = "Unassigned";
    let dailyOverdue = 0;
    
    // Check if this account exists in Daily file
    if (dailyPersonMap[masterRow.__id]) {
      const dailyEntry = dailyPersonMap[masterRow.__id];
      dailyOverdue = dailyEntry.overdue;
      
      // Get Person ID from Daily file, default to "Unassigned" if missing
      if (dailyEntry.personId && !dailyEntry.personId.toString().toLowerCase().includes("assign person id")) {
        personId = dailyEntry.personId.toString().trim();
      }
    }
    
    const { masterLabel, dailyLabel } = getOverdueLabels();
    if (!personSummary[personId]) {
      personSummary[personId] = {
        "Person ID": capitalizeText(personId),
        "Account Count": 0,
        [masterLabel]: 0,
        [dailyLabel]: 0,
        "Increase/Decrease": 0
      };
    }
    
    personSummary[personId]["Account Count"]++;
    personSummary[personId][masterLabel] += masterRow.__overdue || 0;
    personSummary[personId][dailyLabel] += dailyOverdue;
  });
  
  // Calculate change for each Person ID
  Object.values(personSummary).forEach(person => {
    const { masterLabel, dailyLabel } = getOverdueLabels();
    person["Increase/Decrease"] = person[dailyLabel] - person[masterLabel];
  });
  
  personSummaryData = Object.values(personSummary).sort((a,b) => {
    // Put "Unassigned" at the end
    if (a["Person ID"] === "Unassigned") return 1;
    if (b["Person ID"] === "Unassigned") return -1;
    return a["Person ID"].localeCompare(b["Person ID"]);
  });
  
  // Add total row if we have Person ID data
  if (personSummaryData.length > 0) {
    const { masterLabel, dailyLabel } = getOverdueLabels();
    personSummaryData.push(personSummaryData.reduce((acc, r) => {
      acc["Account Count"] += r["Account Count"];
      acc[masterLabel] += r[masterLabel];
      acc[dailyLabel] += r[dailyLabel];
      acc["Increase/Decrease"] += r["Increase/Decrease"];
      return acc;
    }, { "Person ID": "TOTAL", "Account Count": 0, [masterLabel]: 0, [dailyLabel]: 0, "Increase/Decrease": 0 }));
  }

  // Process Branch-Year summary based on SALE_DATE year from Master file
  branchYearSummaryData = [];
  let branchYearSummary = {};
  masterData.forEach(masterRow => {
    if (!masterRow.__id || !masterRow.__branch || masterRow.__branch === "PLAZA") return;
    const year = masterRow.__saleYear; // may be null
    if (!year) return; // skip rows without a valid sale year

    // Daily lookup for current overdue
    const dailyEntry = dailyMap[masterRow.__id];
    const dailyOverdue = dailyEntry ? (dailyEntry.overdue || 0) : 0;

    const key = masterRow.__branch + "__" + year;
    const { masterLabel, dailyLabel } = getOverdueLabels();
    if (!branchYearSummary[key]) {
      branchYearSummary[key] = {
        "Branch Name": capitalizeText(masterRow.__branch),
        "Year": year,
        [masterLabel]: 0,
        [dailyLabel]: 0,
        "Increase/Decrease": 0
      };
    }
    branchYearSummary[key][masterLabel] += masterRow.__overdue || 0;
    branchYearSummary[key][dailyLabel] += dailyOverdue;
  });
  // Compute change and sort
  branchYearSummaryData = Object.values(branchYearSummary).map(r => {
    const { masterLabel, dailyLabel } = getOverdueLabels();
    r["Increase/Decrease"] = (r[dailyLabel] || 0) - (r[masterLabel] || 0);
    return r;
  }).sort((a,b) => a["Branch Name"].localeCompare(b["Branch Name"]) || a["Year"] - b["Year"]);
  // Add TOTAL row if we have data
  if (branchYearSummaryData.length > 0) {
    const { masterLabel, dailyLabel } = getOverdueLabels();
    branchYearSummaryData.push(branchYearSummaryData.reduce((acc, r) => {
      acc[masterLabel] += r[masterLabel];
      acc[dailyLabel] += r[dailyLabel];
      acc["Increase/Decrease"] += r["Increase/Decrease"];
      return acc;
    }, { "Branch Name": "TOTAL", "Year": "-", [masterLabel]: 0, [dailyLabel]: 0, "Increase/Decrease": 0 }));
  }

  // Build Branch x Year (2024/2025) pivot by SALE_DATE from Master (counts)
  branchYearPivot2425 = [];
  const pivotMap = {};
  masterData.forEach(masterRow => {
    if (!masterRow.__branch || masterRow.__branch === "PLAZA") return;
    const y = masterRow.__saleYear;
    if (y !== 2024 && y !== 2025) return;
    const b = capitalizeText(masterRow.__branch);
    if (!pivotMap[b]) pivotMap[b] = { "Branch Name": b, 2024: 0, 2025: 0, Total: 0 };
    pivotMap[b][y] = (pivotMap[b][y] || 0) + 1;
    pivotMap[b].Total += 1;
  });
  branchYearPivot2425 = Object.values(pivotMap).sort((a,b)=> a["Branch Name"].localeCompare(b["Branch Name"]))
  if (branchYearPivot2425.length > 0) {
    const totalRow = branchYearPivot2425.reduce((acc, r) => {
      acc[2024] += r[2024];
      acc[2025] += r[2025];
      acc.Total += r.Total;
      return acc;
    }, { "Branch Name": "TOTAL", 2024: 0, 2025: 0, Total: 0 });
    branchYearPivot2425.push(totalRow);
  }

  // Build Branch x Year (2024/2025) pivot by SALE_DATE from Master (amounts)
  branchYearPivotAmounts2425 = [];
  const pivotAmtMap = {};
  masterData.forEach(masterRow => {
    if (!masterRow.__branch || masterRow.__branch === "PLAZA") return;
    const y = masterRow.__saleYear;
    if (y !== 2024 && y !== 2025) return;
    const b = capitalizeText(masterRow.__branch);
    const dailyEntry = dailyMap[masterRow.__id];
    const mAmt = masterRow.__overdue || 0;
    const dAmt = dailyEntry ? (dailyEntry.overdue || 0) : 0;
    if (!pivotAmtMap[b]) pivotAmtMap[b] = {
      "Branch Name": b,
      q24: 0, m24: 0, d24: 0, c24: 0,
      q25: 0, m25: 0, d25: 0, c25: 0,
      qT: 0, mT: 0, dT: 0, cT: 0
    };
    if (y === 2024) {
      pivotAmtMap[b].q24 += 1; pivotAmtMap[b].m24 += mAmt; pivotAmtMap[b].d24 += dAmt; pivotAmtMap[b].c24 += (dAmt - mAmt);
    } else if (y === 2025) {
      pivotAmtMap[b].q25 += 1; pivotAmtMap[b].m25 += mAmt; pivotAmtMap[b].d25 += dAmt; pivotAmtMap[b].c25 += (dAmt - mAmt);
    }
    pivotAmtMap[b].qT += 1; pivotAmtMap[b].mT += mAmt; pivotAmtMap[b].dT += dAmt; pivotAmtMap[b].cT += (dAmt - mAmt);
  });
  branchYearPivotAmounts2425 = Object.values(pivotAmtMap).sort((a,b)=> a["Branch Name"].localeCompare(b["Branch Name"]))
  if (branchYearPivotAmounts2425.length > 0) {
    const totalRowAmt = branchYearPivotAmounts2425.reduce((acc, r) => {
      acc.q24 += r.q24; acc.m24 += r.m24; acc.d24 += r.d24; acc.c24 += r.c24;
      acc.q25 += r.q25; acc.m25 += r.m25; acc.d25 += r.d25; acc.c25 += r.c25;
      acc.qT  += r.qT;  acc.mT  += r.mT;  acc.dT  += r.dT;  acc.cT  += r.cT;
      return acc;
    }, { "Branch Name": "TOTAL", q24:0,m24:0,d24:0,c24:0,q25:0,m25:0,d25:0,c25:0,qT:0,mT:0,dT:0,cT:0 });
    branchYearPivotAmounts2425.push(totalRowAmt);
  }

  renderTable(summaryData); 
  loadingDiv.style.display="none";
  showNotification("✅ Comparison complete!", "success");
  // Decrement credit after successful compare for free users
  if (userPlan === "free") {
    decrementOneCredit();
  }
}

// ---- Render summary table
function renderTable(data){
  const { masterLabel, dailyLabel, changeLabel } = getOverdueLabels();
  let html = `<h2 style="color: var(--primary); margin-top: 30px; margin-bottom: 15px; font-size: 20px;">
    <i class="material-icons" style="vertical-align: middle; margin-right: 8px;">business</i>
    Branch-wise Overdue Summary
  </h2>
  <table id="summaryTable">
    <thead><tr>
      <th>Branch Name ⬍</th>
      <th>${masterLabel}</th>
      <th>${dailyLabel}</th>
      <th>${changeLabel}</th>
    </tr></thead><tbody>`;
  
  data.forEach(r=>{
    let cls="neutral";
    if(r["Branch Name"]!=="TOTAL") cls=r.change>0?"increase":r.change<0?"decrease":"neutral";
    html+=`<tr style="${r["Branch Name"]==="TOTAL"?"font-weight:bold;background:#f2f2f2":""}">
    <td>${r["Branch Name"]}</td>
    <td>${r.masterTotal.toLocaleString("en-IN")}</td>
    <td>${r.dailyTotal.toLocaleString("en-IN")}</td>
    <td class="${cls}">${r.change.toLocaleString("en-IN")}</td></tr>`;
  });
  html+="</tbody></table>"; 
  
  // Add Person ID summary if available (collapsible)
  if (personSummaryData.length > 0) {
    html += `<h2 id="personSummaryToggle" style="color: var(--primary); margin-top: 40px; margin-bottom: 10px; font-size: 20px; cursor: pointer; display:flex; align-items:center; gap:8px;">
      <i class="material-icons" style="vertical-align: middle;">person</i>
      <span style="flex:1;">Assign Person ID Summary (Overdue File Wise)</span>
      <span id="personSummaryChevron" class="material-icons" style="font-size:20px; opacity:0.8;">expand_more</span>
    </h2>`;
    html += `<div id="personSummarySection" style="display:none;">
    <table id="personSummaryTable">
      <thead><tr>
        <th>Person ID ⬍</th>
        <th>Account Count</th>
        <th>${masterLabel}</th>
        <th>${dailyLabel}</th>
        <th>${changeLabel}</th>
      </tr></thead><tbody>`;
    
    personSummaryData.forEach(r => {
      let cls = "neutral";
      if (r["Person ID"] !== "TOTAL") {
        cls = r[changeLabel] > 0 ? "increase" : r[changeLabel] < 0 ? "decrease" : "neutral";
      }
      
      html += `<tr style="${r["Person ID"]==="TOTAL"?"font-weight:bold;background:#f2f2f2":""}">
        <td>${r["Person ID"]}</td>
        <td>${r["Account Count"].toLocaleString("en-IN")}</td>
        <td>${r[masterLabel].toLocaleString("en-IN")}</td>
        <td>${r[dailyLabel].toLocaleString("en-IN")}</td>
        <td class="${cls}">${r[changeLabel].toLocaleString("en-IN")}</td>
      </tr>`;
    });
    
    html += `</tbody></table>
    </div>`;
  }
  
  // Add Branch-Year summary if available (collapsible)
  if (branchYearSummaryData.length > 0) {
    html += `<h2 id="branchYearToggle" style="color: var(--primary); margin-top: 40px; margin-bottom: 10px; font-size: 20px; cursor: pointer; display:flex; align-items:center; gap:8px;">
      <i class="material-icons" style="vertical-align: middle;">calendar_today</i>
      <span style="flex:1;">Branch-Year Overdue Summary (Sale Date from Master)</span>
      <span id="branchYearChevron" class="material-icons" style="font-size:20px; opacity:0.8;">expand_more</span>
    </h2>`;
    html += `<div id="branchYearSection" style="display:none;">
      <div id="branchYearFilters" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0 10px 0;">
        <label style="font-size:13px; color: var(--text-light);">Branch</label>
        <select id="byBranchFilter" style="padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px;"></select>
        <label style="font-size:13px; color: var(--text-light);">Year</label>
        <select id="byYearFilter" multiple style="padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px; min-width: 120px; min-height: 72px;"></select>
        <button id="byScreenshotAllBtn" style="background:#06b6d4; color:#fff; padding:8px 10px; border:none; border-radius:6px; cursor:pointer;">Screenshot (All)</button>
        <button id="byScreenshotFilteredBtn" style="background:#06b6d4; color:#fff; padding:8px 10px; border:none; border-radius:6px; cursor:pointer;">Screenshot (Filtered)</button>
      </div>
      <table id="branchYearSummaryTable">
        <thead><tr>
          <th>Branch Name ⬍</th>
          <th>Year ⬍</th>
          <th>${masterLabel}</th>
          <th>${dailyLabel}</th>
          <th>${changeLabel}</th>
        </tr></thead><tbody>`;

    branchYearSummaryData.forEach(r => {
      const isTotal = r["Branch Name"] === "TOTAL";
      let cls = "neutral";
      if (!isTotal) {
        cls = r[changeLabel] > 0 ? "increase" : r[changeLabel] < 0 ? "decrease" : "neutral";
      }
      html += `<tr style="${isTotal?"font-weight:bold;background:#f2f2f2":""}">
        <td>${r["Branch Name"]}</td>
        <td>${r["Year"]}</td>
        <td>${r[masterLabel].toLocaleString("en-IN")}</td>
        <td>${r[dailyLabel].toLocaleString("en-IN")}</td>
        <td class="${cls}">${r[changeLabel].toLocaleString("en-IN")}</td>
      </tr>`;
    });
    
    html += `</tbody></table>
    </div>`;
  }

  // Add Branch x Year (2024/2025) pivot if available (collapsible)
  if (branchYearPivot2425.length > 0) {
    html += `<h2 id="branchYearPivotToggle" style="color: var(--primary); margin-top: 40px; margin-bottom: 10px; font-size: 20px; cursor: pointer; display:flex; align-items:center; gap:8px;">
      <i class="material-icons" style="vertical-align: middle;">table_chart</i>
      <span style="flex:1;">Branch-wise Accounts by Sale Year (2024 vs 2025)</span>
      <span id="branchYearPivotChevron" class="material-icons" style="font-size:20px; opacity:0.8;">expand_more</span>
    </h2>`;
    html += `<div id="branchYearPivotSection" style="display:none;">
      <table id="branchYearPivotTable">
        <thead><tr>
          <th>Branch Name ⬍</th>
          <th>2024</th>
          <th>2025</th>
          <th>Total</th>
        </tr></thead><tbody>`;
    branchYearPivot2425.forEach(r => {
      const isTotal = r["Branch Name"] === "TOTAL";
      html += `<tr style="${isTotal?"font-weight:bold;background:#f2f2f2":""}">
        <td>${r["Branch Name"]}</td>
        <td>${Number(r[2024]||0).toLocaleString("en-IN")}</td>
        <td>${Number(r[2025]||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.Total||0).toLocaleString("en-IN")}</td>
      </tr>`;
    });
    html += `</tbody></table>
    </div>`;
  }

  // Add Branch x Year (2024/2025) Amounts pivot if available (collapsible)
  if (branchYearPivotAmounts2425.length > 0) {
    html += `<h2 id="branchYearPivotAmtToggle" style="color: var(--primary); margin-top: 20px; margin-bottom: 10px; font-size: 20px; cursor: pointer; display:flex; align-items:center; gap:8px;">
      <i class="material-icons" style="vertical-align: middle;">attach_money</i>
      <span style="flex:1;">Branch-wise Overdue by Sale Year (2024 vs 2025) – Amounts</span>
      <span id="branchYearPivotAmtChevron" class="material-icons" style="font-size:20px; opacity:0.8;">expand_more</span>
    </h2>`;
    html += `<div id="branchYearPivotAmtSection" style="display:none;">
      <table id="branchYearPivotAmtTable">
        <thead><tr>
          <th rowspan="2">Branch Name ⬍</th>
          <th colspan="4">2024</th>
          <th colspan="4">2025</th>
          <th colspan="4">Total</th>
        </tr>
        <tr>
          <th>Qty</th><th>Master</th><th>Running</th><th>Change</th>
          <th>Qty</th><th>Master</th><th>Running</th><th>Change</th>
          <th>Qty</th><th>Master</th><th>Running</th><th>Change</th>
        </tr></thead><tbody>`;
    branchYearPivotAmounts2425.forEach(r => {
      const isTotal = r["Branch Name"] === "TOTAL";
      const rowStyle = isTotal?"font-weight:bold;background:#f2f2f2":"";
      html += `<tr style="${rowStyle}">
        <td>${r["Branch Name"]}</td>
        <td>${Number(r.q24||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.m24||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.d24||0).toLocaleString("en-IN")}</td>
        <td class="${(r.c24||0)>0?"increase":(r.c24||0)<0?"decrease":"neutral"}">${Number(r.c24||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.q25||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.m25||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.d25||0).toLocaleString("en-IN")}</td>
        <td class="${(r.c25||0)>0?"increase":(r.c25||0)<0?"decrease":"neutral"}">${Number(r.c25||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.qT||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.mT||0).toLocaleString("en-IN")}</td>
        <td>${Number(r.dT||0).toLocaleString("en-IN")}</td>
        <td class="${(r.cT||0)>0?"increase":(r.cT||0)<0?"decrease":"neutral"}">${Number(r.cT||0).toLocaleString("en-IN")}</td>
      </tr>`;
    });
    html += `</tbody></table>
    </div>`;
  }
  
  resultDiv.innerHTML=html;

  // After rendering, prepare SMS branch options
  try { populateSmsBranches(); } catch(_) {}

  // Sort by clicking headers
  document.querySelectorAll("#summaryTable th").forEach((th,i)=>{
    th.addEventListener("click", ()=>sortTable(i));
  });
  
  // Sort by clicking headers for person summary table
  document.querySelectorAll("#personSummaryTable th").forEach((th,i)=>{
    th.addEventListener("click", ()=>sortPersonTable(i));
  });
  
  // Sort by clicking headers for branch-year table
  document.querySelectorAll("#branchYearSummaryTable th").forEach((th,i)=>{
    th.addEventListener("click", ()=>sortBranchYearTable(i));
  });
  // Populate Branch-Year filters and bind events
  try { populateBranchYearFilters(); } catch(_) {}
  const byBranchFilter = document.getElementById("byBranchFilter");
  const byYearFilter = document.getElementById("byYearFilter");
  if (byBranchFilter) byBranchFilter.addEventListener("change", applyBranchYearFilter);
  if (byYearFilter) byYearFilter.addEventListener("change", applyBranchYearFilter);
  const byShotAll = document.getElementById("byScreenshotAllBtn");
  const byShotFiltered = document.getElementById("byScreenshotFilteredBtn");
  if (byShotAll) byShotAll.addEventListener("click", ()=>screenshotBranchYear({ mode: "all" }));
  if (byShotFiltered) byShotFiltered.addEventListener("click", ()=>screenshotBranchYear({ mode: "filtered" }));
  // Sort for pivot table
  document.querySelectorAll("#branchYearPivotTable th").forEach((th,i)=>{
    th.addEventListener("click", ()=>sortBranchYearPivot(i));
  });
  // Sort for amounts pivot table
  document.querySelectorAll("#branchYearPivotAmtTable th").forEach((th,i)=>{
    th.addEventListener("click", ()=>sortBranchYearPivotAmt(i));
  });
  
  // Toggle handlers for collapsible sections
  const personToggle = document.getElementById("personSummaryToggle");
  const personSection = document.getElementById("personSummarySection");
  const personChevron = document.getElementById("personSummaryChevron");
  if (personToggle && personSection && personChevron) {
    personToggle.addEventListener("click", () => toggleSection(personSection, personChevron));
  }
  const byToggle = document.getElementById("branchYearToggle");
  const bySection = document.getElementById("branchYearSection");
  const byChevron = document.getElementById("branchYearChevron");
  if (byToggle && bySection && byChevron) {
    byToggle.addEventListener("click", () => toggleSection(bySection, byChevron));
  }
  const bypToggle = document.getElementById("branchYearPivotToggle");
  const bypSection = document.getElementById("branchYearPivotSection");
  const bypChevron = document.getElementById("branchYearPivotChevron");
  if (bypToggle && bypSection && bypChevron) {
    bypToggle.addEventListener("click", () => toggleSection(bypSection, bypChevron));
  }
  const bypAmtToggle = document.getElementById("branchYearPivotAmtToggle");
  const bypAmtSection = document.getElementById("branchYearPivotAmtSection");
  const bypAmtChevron = document.getElementById("branchYearPivotAmtChevron");
  if (bypAmtToggle && bypAmtSection && bypAmtChevron) {
    bypAmtToggle.addEventListener("click", () => toggleSection(bypAmtSection, bypAmtChevron));
  }
}

function sortTable(colIndex){
  const table = document.getElementById("summaryTable");
  let rows = Array.from(table.tBodies[0].rows);
  rows.pop(); // remove TOTAL
  let asc = table.dataset.sortCol==colIndex && table.dataset.sortDir==="asc" ? false : true;
  rows.sort((a,b)=>{
    let valA=a.cells[colIndex].innerText.replace(/,/g,'');
    let valB=b.cells[colIndex].innerText.replace(/,/g,'');
    let numA=Number(valA), numB=Number(valB);
    if(!isNaN(numA) && !isNaN(numB)) return asc ? numA-numB : numB-numA;
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  rows.forEach(r=>table.tBodies[0].appendChild(r));
  table.dataset.sortCol=colIndex;
  table.dataset.sortDir=asc?"asc":"desc";
}

function sortPersonTable(colIndex){
  const table = document.getElementById("personSummaryTable");
  let rows = Array.from(table.tBodies[0].rows);
  rows.pop(); // remove TOTAL
  let asc = table.dataset.sortCol==colIndex && table.dataset.sortDir==="asc" ? false : true;
  rows.sort((a,b)=>{
    let valA=a.cells[colIndex].innerText.replace(/,/g,'');
    let valB=b.cells[colIndex].innerText.replace(/,/g,'');
    let numA=Number(valA), numB=Number(valB);
    if(!isNaN(numA) && !isNaN(numB)) return asc ? numA-numB : numB-numA;
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  rows.forEach(r=>table.tBodies[0].appendChild(r));
  table.dataset.sortCol=colIndex;
  table.dataset.sortDir=asc?"asc":"desc";
}

function sortBranchYearTable(colIndex){
  const table = document.getElementById("branchYearSummaryTable");
  if (!table) return;
  let rows = Array.from(table.tBodies[0].rows);
  rows.pop(); // remove TOTAL
  let asc = table.dataset.sortCol==colIndex && table.dataset.sortDir==="asc" ? false : true;
  rows.sort((a,b)=>{
    let valA=a.cells[colIndex].innerText.replace(/,/g,'');
    let valB=b.cells[colIndex].innerText.replace(/,/g,'');
    let numA=Number(valA), numB=Number(valB);
    if(!isNaN(numA) && !isNaN(numB)) return asc ? numA-numB : numB-numA;
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  rows.forEach(r=>table.tBodies[0].appendChild(r));
  table.dataset.sortCol=colIndex;
  table.dataset.sortDir=asc?"asc":"desc";
}

function sortBranchYearPivot(colIndex){
  const table = document.getElementById("branchYearPivotTable");
  if (!table) return;
  let rows = Array.from(table.tBodies[0].rows);
  rows.pop(); // remove TOTAL
  let asc = table.dataset.sortCol==colIndex && table.dataset.sortDir==="asc" ? false : true;
  rows.sort((a,b)=>{
    let valA=a.cells[colIndex].innerText.replace(/,/g,'');
    let valB=b.cells[colIndex].innerText.replace(/,/g,'');
    let numA=Number(valA), numB=Number(valB);
    if(!isNaN(numA) && !isNaN(numB)) return asc ? numA-numB : numB-numA;
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  rows.forEach(r=>table.tBodies[0].appendChild(r));
  table.dataset.sortCol=colIndex;
  table.dataset.sortDir=asc?"asc":"desc";
}

function sortBranchYearPivotAmt(colIndex){
  const table = document.getElementById("branchYearPivotAmtTable");
  if (!table) return;
  let rows = Array.from(table.tBodies[0].rows);
  rows.pop(); // remove TOTAL
  let asc = table.dataset.sortCol==colIndex && table.dataset.sortDir==="asc" ? false : true;
  rows.sort((a,b)=>{
    let valA=a.cells[colIndex].innerText.replace(/,/g,'');
    let valB=b.cells[colIndex].innerText.replace(/,/g,'');
    let numA=Number(valA), numB=Number(valB);
    if(!isNaN(numA) && !isNaN(numB)) return asc ? numA-numB : numB-numA;
    return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });
  rows.forEach(r=>table.tBodies[0].appendChild(r));
  table.dataset.sortCol=colIndex;
  table.dataset.sortDir=asc?"asc":"desc";
}

// ---- Branch-Year filters helpers
function populateBranchYearFilters(){
  const branchSel = document.getElementById("byBranchFilter");
  const yearSel = document.getElementById("byYearFilter");
  if (!branchSel || !yearSel) return;
  const branches = Array.from(new Set(branchYearSummaryData
    .filter(r => r["Branch Name"] && r["Branch Name"] !== "TOTAL")
    .map(r => r["Branch Name"])) ).sort((a,b)=>a.localeCompare(b));
  const years = Array.from(new Set(branchYearSummaryData
    .filter(r => r["Year"] && r["Year"] !== "-")
    .map(r => r["Year"])) ).sort((a,b)=>Number(a)-Number(b));
  branchSel.innerHTML = `<option value="">All</option>` + branches.map(b=>`<option value="${b}">${b}</option>`).join("");
  yearSel.innerHTML = `<option value="">All</option>` + years.map(y=>`<option value="${y}">${y}</option>`).join("");
}

function applyBranchYearFilter(){
  const table = document.getElementById("branchYearSummaryTable");
  if (!table) return;
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const { masterLabel, dailyLabel, changeLabel } = getOverdueLabels();
  const branchVal = (document.getElementById("byBranchFilter")?.value || "").trim();
  const yearSelect = document.getElementById("byYearFilter");
  const selectedYears = Array.from(yearSelect?.selectedOptions || []).map(o=>o.value).filter(v=>v);
  const baseRows = branchYearSummaryData.filter(r => r["Branch Name"] !== "TOTAL");
  let rows = baseRows.filter(r => (
    (!branchVal || r["Branch Name"] === branchVal) &&
    (!selectedYears.length || selectedYears.includes(String(r["Year"])) )
  ));
  if (rows.length > 0) {
    const totalRow = rows.reduce((acc, r) => {
      acc[masterLabel] += r[masterLabel];
      acc[dailyLabel] += r[dailyLabel];
      acc[changeLabel] += r[changeLabel];
      return acc;
    }, { "Branch Name": "TOTAL", "Year": "-", [masterLabel]: 0, [dailyLabel]: 0, [changeLabel]: 0 });
    rows = rows.concat([ totalRow ]);
  } else {
    rows = [ { "Branch Name": "TOTAL", "Year": "-", [masterLabel]: 0, [dailyLabel]: 0, [changeLabel]: 0 } ];
  }
  // rebuild tbody
  tbody.innerHTML = "";
  rows.forEach(r => {
    const isTotal = r["Branch Name"] === "TOTAL";
    const cls = isTotal ? "" : (r[changeLabel] > 0 ? "increase" : r[changeLabel] < 0 ? "decrease" : "neutral");
    const tr = document.createElement("tr");
    if (isTotal) tr.style.cssText = "font-weight:bold;background:#f2f2f2";
    tr.innerHTML = `
      <td>${r["Branch Name"]}</td>
      <td>${r["Year"]}</td>
      <td>${Number(r[masterLabel]||0).toLocaleString("en-IN")}</td>
      <td>${Number(r[dailyLabel]||0).toLocaleString("en-IN")}</td>
      <td class="${cls}">${Number(r[changeLabel]||0).toLocaleString("en-IN")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---- Screenshot for Branch-Year table (all or filtered)
function screenshotBranchYear(opts){
  const mode = (opts && opts.mode) || "filtered";
  const sectionTitle = "Branch-Year Overdue Summary (Sale Date from Master)";
  const table = document.getElementById("branchYearSummaryTable");
  if (!table) { showNotification("⚠ No Branch-Year table to capture!", "error"); return; }
  const { masterLabel, dailyLabel, changeLabel } = getOverdueLabels();

  // Build HTML to capture
  let htmlToCapture = "";
  if (mode === "all") {
    // Recreate full table from branchYearSummaryData
    let rows = branchYearSummaryData;
    htmlToCapture = `
      <table id=\"branchYearSummaryTable\" class=\"screenshot-table\">
        <thead><tr>
          <th>Branch Name</th>
          <th>Year</th>
          <th>${masterLabel}</th>
          <th>${dailyLabel}</th>
          <th>${changeLabel}</th>
        </tr></thead><tbody>
        ${rows.map(r=>{
          const isTotal = r[\"Branch Name\"] === \"TOTAL\";
          const cls = isTotal ? \"\" : ((r[changeLabel]||0)>0?\"increase\":(r[changeLabel]||0)<0?\"decrease\":\"neutral\");
          const styleRow = isTotal?\"font-weight:bold;background:#f2f2f2\":\"\";
          return `<tr style=\"${styleRow}\">\n            <td>${r[\"Branch Name\"]}</td>\n            <td>${r[\"Year\"]}</td>\n            <td>${Number(r[masterLabel]||0).toLocaleString(\"en-IN\")}</td>\n            <td>${Number(r[dailyLabel]||0).toLocaleString(\"en-IN\")}</td>\n            <td class=\"${cls}\">${Number(r[changeLabel]||0).toLocaleString(\"en-IN\")}</td>\n          </tr>`;
        }).join(\"\")}
        </tbody></table>
    `;
  } else {
    // Use the currently rendered filtered table
    htmlToCapture = table.outerHTML.replace('id="branchYearSummaryTable"', 'id="branchYearSummaryTable" class="screenshot-table"');
  }

  const tempDiv = document.createElement("div");
  tempDiv.style.background = "#ffffff";
  tempDiv.style.padding = "20px";
  tempDiv.style.width = "1200px";
  tempDiv.style.maxWidth = "1200px";
  tempDiv.innerHTML = `
    <h2 style=\"color: var(--primary); margin-top: 0; margin-bottom: 15px; font-size: 20px;\">
      <i class=\"material-icons\" style=\"vertical-align: middle; margin-right: 8px;\">calendar_today</i>
      ${sectionTitle}${mode==="filtered"?" (Filtered)":" (All)"}
    </h2>
    <style>
      .screenshot-table { width: 100% !important; border-collapse: separate; border-spacing: 0; font-size: 14px; font-family: 'Inter', 'Noto Sans Bengali', Arial, sans-serif; }
      .screenshot-table th { background: var(--primary); color: white; padding: 12px 16px; font-weight: 700; text-align: center; white-space: nowrap; font-size: 15px; }
      .screenshot-table td { padding: 10px 16px; text-align: center; border-bottom: 1px solid #e5e7eb; white-space: nowrap; font-weight: 600; color: #1f2937; text-transform: capitalize; }
      .screenshot-table tr:last-child td { border-bottom: none; font-weight: 700; background: #f9fafb; }
      .screenshot-table tr:nth-child(even) { background: #f8fafc; }
      .screenshot-table .increase { color: var(--danger); font-weight: 700; }
      .screenshot-table .decrease { color: var(--success); font-weight: 700; }
      .screenshot-table .neutral { color: #6b7280; font-weight: 600; }
    </style>
    ${htmlToCapture}
  `;
  document.body.appendChild(tempDiv);
  html2canvas(tempDiv, { backgroundColor: "#ffffff", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `BranchYear_Summary_${mode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    document.body.removeChild(tempDiv);
  });
}

// ---- Helper function to capitalize object values
function capitalizeObject(obj) {
  const result = {};
  for (let key in obj) {
    if (typeof obj[key] === 'string' && obj[key] !== 'TOTAL') {
      result[key] = capitalizeText(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

// ---- Download both Summary + Accounts
function downloadCombined(){
  // Check if user is logged in
  if (!currentUser) {
    showNotification("⚠ Please sign in to use this feature!", "error");
    return;
  }
  
  if(!summaryData.length || !accountsData.length){ 
    showNotification("⚠ Run comparison first!","error"); 
    return; 
  }
  
  // Capitalize data for Excel export
  const capitalizedSummaryData = summaryData.map(capitalizeObject);
  const capitalizedAccountsData = accountsData.map(capitalizeObject);
  const capitalizedPersonSummaryData = personSummaryData.map(capitalizeObject);
  const capitalizedBranchYearSummaryData = branchYearSummaryData.map(capitalizeObject);
  const branchYearPivotExport = branchYearPivot2425.map(r => ({
    "Branch Name": r["Branch Name"],
    "2024": r[2024],
    "2025": r[2025],
    "Total": r.Total
  }));
  const branchYearPivotAmountsExport = branchYearPivotAmounts2425.map(r => ({
    "Branch Name": r["Branch Name"],
    "2024 Qty": r.q24, "2024 Master": r.m24, "2024 Running": r.d24, "2024 Change": r.c24,
    "2025 Qty": r.q25, "2025 Master": r.m25, "2025 Running": r.d25, "2025 Change": r.c25,
    "Total Qty": r.qT,  "Total Master": r.mT,  "Total Running": r.dT,  "Total Change": r.cT
  }));
  
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(capitalizedSummaryData),"Summary");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(capitalizedAccountsData),"AllAccounts");
  
  // Add Person ID summary if available
  if (personSummaryData.length > 0) {
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(capitalizedPersonSummaryData),"PersonSummary");
  }
  // Add Branch-Year summary if available
  if (branchYearSummaryData.length > 0) {
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(capitalizedBranchYearSummaryData),"BranchYearSummary");
  }
  // Add Branch-Year 2024/2025 pivot if available
  if (branchYearPivotExport.length > 0) {
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(branchYearPivotExport),"BranchYear_2024_2025_Counts");
  }
  // Add Branch-Year 2024/2025 Amounts pivot if available
  if (branchYearPivotAmountsExport.length > 0) {
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(branchYearPivotAmountsExport),"BranchYear_2024_2025_Amounts");
  }
  
  XLSX.writeFile(wb,"Overdue_Report.xlsx");
}

// ---- Collapsible helper
function toggleSection(sectionEl, chevronEl) {
  if (!sectionEl || !chevronEl) return;
  const isHidden = sectionEl.style.display === "none" || sectionEl.style.display === "";
  sectionEl.style.display = isHidden ? "block" : "none";
  chevronEl.textContent = isHidden ? "expand_less" : "expand_more";
}

function isSmsEnabled(){
  const plan = (userPlan || '').toString().trim().toLowerCase();
  return !!currentUser && (plan === 'sms' || plan === 'pro') && Number(userSmsCreditsCount) > 0;
}

function updateSmsUIVisibility(){
  try {
    const smsButton = document.getElementById("smsBtn");
    if (!smsButton) return;
    // Always visible and enabled; click handlers enforce plan/credits/compare checks
    smsButton.style.display = 'flex';
    smsButton.disabled = false;
    smsButton.style.opacity = '1';
    smsButton.title = 'Send SMS';
  } catch (_) {}
}

// ---- SMS helpers and handlers
// New SMS provider (bulksmsbd)
const SMS_API_KEY = "Sp5czEFRFaBLkiAuS9rs";
const SMS_ENDPOINT = "https://bulksmsbd.net/api/smsapi"; // use HTTPS to avoid mixed content
let lastSmsRequestId = null; // bulksmsbd does not return request_id; keep for compatibility
let branchNumbersCache = {}; // { Branch Name: [numbers] }
let userSenderIdCache = null; // cached approved sender ID per user

async function loadUserSenderId(){
  try {
    const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!uid) return;
    if (userSenderIdCache == null) {
      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();
      const data = snap.exists ? (snap.data()||{}) : {};
      userSenderIdCache = (data.senderId || "").toString();
    }
    const el = document.getElementById("smsSenderId");
    if (el && !el.value) el.value = userSenderIdCache || "";
  } catch(_) {}
}

async function refreshUserCreditsNow(){
  try {
    if (firebase.auth().currentUser) {
      await ensureUserCredits(firebase.auth().currentUser);
      if (typeof updateCreditsUI === 'function') updateCreditsUI();
    }
  } catch(_) {}
}

function openSmsModal(){
  if (!currentUser) { showNotification("⚠ Please sign in to use this feature!", "error"); return; }
  if (!summaryData.length) { showNotification("⚠ Run comparison first!", "error"); return; }
  if (smsModal) smsModal.style.display = "flex";
  // preload approved sender ID if available
  try { loadUserSenderId(); } catch(_) {}
  updateSmsPreview();
}
function closeSmsModal(){ if (smsModal) smsModal.style.display = "none"; }

function populateSmsBranches(){
  if (!smsBranchSelect) return;
  // Clear and refill; exclude TOTAL row
  smsBranchSelect.innerHTML = "";
  const branches = summaryData.filter(r => r["Branch Name"] && r["Branch Name"] !== "TOTAL");
  branches.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b["Branch Name"]; opt.textContent = b["Branch Name"];
    smsBranchSelect.appendChild(opt);
  });
  // Listen for every change (not once) so user can switch branches repeatedly
  smsBranchSelect.addEventListener("change", onSmsBranchChanged);
  // After options render, load numbers for the first branch
  if (branches.length) loadBranchNumbers(branches[0]["Branch Name"]);
}

function onSmsBranchChanged(){
  const branch = smsBranchSelect.value;
  loadBranchNumbers(branch);
}

async function loadBranchNumbers(branch){
  try {
    // use cache if present
    if (branchNumbersCache[branch]) {
      if (smsNumbersInput) smsNumbersInput.value = branchNumbersCache[branch].join(", ");
      updateSmsPreview();
      return;
    }
    // fetch from Firestore: users/{uid}/branches/{branch}
    const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!uid) return;
    const docRef = db.collection("users").doc(uid).collection("branches").doc(branch);
    const snap = await docRef.get();
    const data = snap.exists ? (snap.data()||{}) : {};
    const numbers = Array.isArray(data.numbers) ? data.numbers : [];
    branchNumbersCache[branch] = numbers;
    if (smsNumbersInput) smsNumbersInput.value = numbers.join(", ");
  } catch (e) { console.error("loadBranchNumbers", e); }
  updateSmsPreview();
}

async function saveBranchNumbers(){
  try {
    const branch = smsBranchSelect && smsBranchSelect.value ? smsBranchSelect.value : null;
    if (!branch) { showNotification("⚠ Select a branch", "error"); return; }
    const { valid } = normalizeNumbers(smsNumbersInput ? smsNumbersInput.value : "");
    const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
    if (!uid) return;
    await db.collection("users").doc(uid).collection("branches").doc(branch).set({ numbers: valid }, { merge: true });
    // save approved sender ID at user root for reuse
    const senderId = (document.getElementById("smsSenderId")?.value || "").trim();
    if (senderId) {
      await db.collection("users").doc(uid).set({ senderId }, { merge: true });
      userSenderIdCache = senderId;
    }
    branchNumbersCache[branch] = valid;
    showNotification("✅ Numbers saved for branch.", "success");
  } catch (e) {
    console.error("saveBranchNumbers", e);
    showNotification("⚠ Failed to save numbers", "error");
  }
}

function normalizeNumbers(input){
  const result = { valid: [], invalid: [] };
  if (!input) return result;
  input.split(",").map(s=>s.trim()).filter(Boolean).forEach(n=>{
    let v = n;
    if (/^01\d{9}$/.test(v)) v = "88" + v;
    if (/^8801\d{9}$/.test(v)) result.valid.push(v);
    else result.invalid.push(n);
  });
  return result;
}

function buildSmsMessage(branchName){
  const { changeLabel } = getOverdueLabels();
  const row = summaryData.find(r => r["Branch Name"] === branchName);
  const changeVal = row ? row.change : 0;
  const formatted = (changeVal || 0).toLocaleString("en-IN");
  return `Hi,\nYour are the Manager of ${branchName} Branch. You need to Decrease Overdue of ${formatted}.`;
}

function computeSmsMeta(message, recipientsCount){
  const len = message.length;
  const perSeg = len <= 70 ? 70 : 67; // Unicode assumption
  const segments = Math.ceil(len / perSeg) || 1;
  return { length: len, segments, recipients: recipientsCount || 0 };
}

function updateSmsPreview(){
  try {
    if (!smsBranchSelect || !smsPreviewArea) return;
    const branch = smsBranchSelect.value || (summaryData.find(r=>r["Branch Name"]!=="TOTAL")||{})["Branch Name"] || "";
    if (branch) smsPreviewArea.value = buildSmsMessage(branch);
  } catch(_){}
  // recipients + meta
  const { valid } = normalizeNumbers(smsNumbersInput ? smsNumbersInput.value : "");
  const msg = smsPreviewArea ? smsPreviewArea.value : "";
  const meta = computeSmsMeta(msg, valid.length);
  const metaEl = document.getElementById("smsMeta");
  if (metaEl) metaEl.textContent = `Length: ${meta.length} | Segments: ${meta.segments} | Recipients: ${meta.recipients}`;
}

async function sendSmsForBranch(){
  try {
    await refreshUserCreditsNow();
    if (!currentUser) { showNotification("⚠ Please sign in to use this feature!", "error"); return; }
    if (!summaryData.length) { showNotification("⚠ Run comparison first!", "error"); return; }
    // Allow send based on SMS credits only (plan managed by credits)
    if (userSmsCreditsCount <= 0) { showNotification("⚠ You have 0 SMS credits", "error"); return; }
    const branch = smsBranchSelect && smsBranchSelect.value ? smsBranchSelect.value : null;
    if (!branch) { showNotification("⚠ Select a branch", "error"); return; }
    const { valid, invalid } = normalizeNumbers(smsNumbersInput ? smsNumbersInput.value : "");
    if (!valid.length) { showNotification("⚠ Enter at least one valid number", "error"); return; }
    if (invalid.length && smsResponseBox) { smsResponseBox.textContent = `Ignoring invalid numbers: ${invalid.join(", ")}`; }
    const msg = buildSmsMessage(branch);
    const senderId = (document.getElementById("smsSenderId")?.value || "").trim();
    if (!senderId) { showNotification("⚠ Sender ID required", "error"); return; }

    // bulksmsbd requires POST with api_key, senderid, number, message
    smsResponseBox.textContent = "Sending...";
    const res = await fetch(SMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: SMS_API_KEY,
        type: 'text',
        senderid: senderId,
        number: valid.join(","),
        message: msg
      })
    });
    const text = await res.text();
    // API may return plain text codes like 202; display as-is
    smsResponseBox.textContent = text;
    if (/\b202\b/.test(text)) { await decrementOneSmsCredit(); }
    // Provider returns plain text; no request_id available
    lastSmsRequestId = null;
    if (checkSmsStatusBtn) checkSmsStatusBtn.style.display = "none"; // not supported
  } catch (e) {
    console.error(e);
    if (smsResponseBox) smsResponseBox.textContent = `Error: ${e.message || e}`;
  }
}

async function checkLastSmsStatus(){
  try {
    // Not supported by bulksmsbd; show balance instead as a helpful alternative
    smsResponseBox.textContent = "This provider does not support request status lookup via API. Checking balance...";
    const bal = await fetch(`http://bulksmsbd.net/api/getBalanceApi?api_key=${encodeURIComponent(SMS_API_KEY)}`);
    const balText = await bal.text();
    smsResponseBox.textContent = balText;
  } catch (e) {
    console.error(e);
    if (smsResponseBox) smsResponseBox.textContent = `Error: ${e.message || e}`;
  }
}

async function sendSmsForAllBranches(){
  try {
    await refreshUserCreditsNow();
    if (!currentUser) { showNotification("⚠ Please sign in to use this feature!", "error"); return; }
    if (!summaryData.length) { showNotification("⚠ Run comparison first!", "error"); return; }
    const senderId = (document.getElementById("smsSenderId")?.value || "").trim();
    if (!senderId) { showNotification("⚠ Sender ID required", "error"); return; }
    // Allow send based on SMS credits only (plan managed by credits)
    const branches = summaryData.filter(r => r["Branch Name"] && r["Branch Name"] !== "TOTAL");
    if (!branches.length) { showNotification("⚠ No branches found", "error"); return; }
    smsResponseBox.textContent = "Sending to all branches...";
    let results = [];
    for (const b of branches) {
      if (userSmsCreditsCount <= 0) { results.push({ branch: b["Branch Name"], error: "No SMS credits left" }); break; }
      const branch = b["Branch Name"];
      // load numbers (cache or db)
      await loadBranchNumbers(branch);
      const { valid } = normalizeNumbers((branchNumbersCache[branch]||[]).join(","));
      if (!valid.length) { results.push({ branch, error: "No valid numbers" }); continue; }
      const msg = buildSmsMessage(branch);
      try {
        const res = await fetch(SMS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            api_key: SMS_API_KEY,
            type: 'text',
            senderid: senderId,
            number: valid.join(","),
            message: msg
          })
        });
        const text = await res.text();
        results.push({ branch, response: text });
        if (/\b202\b/.test(text)) { await decrementOneSmsCredit(); }
      } catch (e) {
        results.push({ branch, error: e.message || String(e) });
      }
    }
    smsResponseBox.textContent = JSON.stringify(results, null, 2);
  } catch (e) {
    console.error(e);
    if (smsResponseBox) smsResponseBox.textContent = `Error: ${e.message || e}`;
  }
}

// ---- Screenshot
function takeScreenshot() {
  // Check if user is logged in
  if (!currentUser) {
    showNotification("⚠ Please sign in to use this feature!", "error");
    return;
  }
  
  if (!resultDiv.innerHTML.trim()) {
    showNotification("⚠ No results to capture!", "error");
    return;
  }
  
  // Only capture the Branch-wise table
  const branchTable = document.getElementById("summaryTable");
  if (!branchTable) {
    showNotification("⚠ No Branch-wise table to capture!", "error");
    return;
  }
  
  // Create a temporary container with only the Branch-wise table
  const tempDiv = document.createElement("div");
  tempDiv.style.background = "#ffffff";
  tempDiv.style.padding = "20px";
  tempDiv.style.width = "1200px";
  tempDiv.style.maxWidth = "1200px";
  tempDiv.innerHTML = `
    <h2 style="color: var(--primary); margin-top: 0; margin-bottom: 15px; font-size: 20px;">
      <i class="material-icons" style="vertical-align: middle; margin-right: 8px;">business</i>
      Branch-wise Overdue Summary
    </h2>
    <div style="width: 100%; overflow-x: auto;">
      <style>
        .screenshot-table {
          width: 100% !important;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 14px;
          font-family: 'Inter', 'Noto Sans Bengali', Arial, sans-serif;
        }
        .screenshot-table th {
          background: var(--primary);
          color: white;
          padding: 12px 16px;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
          font-size: 15px;
        }
        .screenshot-table td {
          padding: 10px 16px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
          font-weight: 600;
          color: #1f2937;
          text-transform: capitalize;
        }
        .screenshot-table tr:last-child td {
          border-bottom: none;
          font-weight: 700;
          background: #f9fafb;
        }
        .screenshot-table tr:nth-child(even) { 
          background: #f8fafc; 
        }
        .screenshot-table .increase { 
          color: var(--danger); 
          font-weight: 700; 
        }
        .screenshot-table .decrease { 
          color: var(--success); 
          font-weight: 700; 
        }
        .screenshot-table .neutral { 
          color: #6b7280; 
          font-weight: 600;
        }
      </style>
      ${branchTable.outerHTML.replace('id="summaryTable"', 'id="summaryTable" class="screenshot-table"')}
    </div>
  `;
  
  // Temporarily add to body for screenshot
  document.body.appendChild(tempDiv);
  
  html2canvas(tempDiv, { backgroundColor: "#ffffff", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "Branch_Overdue_Summary.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    // Remove temporary element
    document.body.removeChild(tempDiv);
  });
}

// ---- Clear
function clearFiles(){
  // Check if user is logged in
  if (!currentUser) {
    showNotification("⚠ Please sign in to use this feature!", "error");
    return;
  }
  
  masterInput.value=""; dailyInput.value="";
  document.getElementById("masterFileName").innerText="No file chosen...";
  document.getElementById("dailyFileName").innerText="No file chosen...";
  resultDiv.innerHTML=""; summaryData=[]; accountsData=[]; personSummaryData=[];
  hideNotification();
}

// ---- Authentication Functions
function initAuth() {
  // Check if user is already signed in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in
      currentUser = user;
      showUserProfile(user);
      hideLoginContainer();
    } else {
      // No user is signed in
      showLoginContainer();
      hideUserProfile();
    }
  });
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      // This gives you a Google Access Token
      const credential = result.credential;
      // The signed-in user info
      currentUser = result.user;
      showUserProfile(currentUser);
      hideLoginContainer();
      showNotification("✅ Successfully signed in!", "success");
    })
    .catch((error) => {
      console.error("Google Sign-In Error:", error);
      showNotification("⚠ Sign-in failed: " + error.message, "error");
    });
}

function signOut() {
  firebase.auth().signOut()
    .then(() => {
      currentUser = null;
      hideUserProfile();
      showLoginContainer();
      showNotification("You have been signed out", "success");
    })
    .catch((error) => {
      console.error("Sign-Out Error:", error);
      showNotification("⚠ Sign-out failed: " + error.message, "error");
    });
}

function showUserProfile(user) {
  userProfile.style.display = "flex";
  userAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName);
  userName.textContent = user.displayName || user.email;
  // fetch or init credits
  ensureUserCredits(user);
  if (typeof updateSmsUIVisibility === "function") updateSmsUIVisibility();
}

function hideUserProfile() {
  userProfile.style.display = "none";
  if (typeof updateSmsUIVisibility === "function") updateSmsUIVisibility();
}

function showLoginContainer() {
  loginContainer.style.display = "flex";
}

function hideLoginContainer() {
  loginContainer.style.display = "none";
}

// ---- Event bindings
// Get DOM elements
masterInput = document.getElementById("masterFile");
dailyInput = document.getElementById("dailyFile");
compareBtn = document.getElementById("compareBtn");
downloadBtn = document.getElementById("downloadBtn");
// downloadAccountsBtn removed as it doesn't exist in HTML
screenshotBtn = document.getElementById("screenshotBtn");
clearBtn = document.getElementById("clearBtn");
resultDiv = document.getElementById("result");
loadingDiv = document.getElementById("loading");
notificationBox = document.getElementById("notificationBox");
  smsBtn = document.getElementById("smsBtn");
  // Saved Master controls
  rememberMasterChk = document.getElementById("rememberMasterChk");
  useSavedMasterChk = document.getElementById("useSavedMasterChk");
  clearSavedMasterBtn = document.getElementById("clearSavedMasterBtn");
  savedMasterInfo = document.getElementById("savedMasterInfo");

loginContainer = document.getElementById("loginContainer");
googleSignInBtn = document.getElementById("googleSignInBtn");
userProfile = document.getElementById("userProfile");
userAvatar = document.getElementById("userAvatar");
userName = document.getElementById("userName");
logoutBtn = document.getElementById("logoutBtn");
userCreditsEl = document.getElementById("userCredits");
  userSmsCreditsEl = document.getElementById("userSmsCredits");
upgradeBtn = document.getElementById("upgradeBtn");

  // SMS modal refs
  smsModal = document.getElementById("smsModal");
  smsCloseBtn = document.getElementById("smsCloseBtn");
  smsBranchSelect = document.getElementById("smsBranchSelect");
  smsNumbersInput = document.getElementById("smsNumbers");
  smsPreviewArea = document.getElementById("smsPreview");
  sendSmsBtn = document.getElementById("sendSmsBtn");
  checkSmsStatusBtn = document.getElementById("checkSmsStatusBtn");
  smsResponseBox = document.getElementById("smsResponse");
  smsSaveBtn = document.getElementById("smsSaveBtn");
  sendAllSmsBtn = document.getElementById("sendAllSmsBtn");

// Event bindings with try-catch blocks to prevent errors
  console.log("compareBtn:", compareBtn);
  try {
    if (compareBtn) compareBtn.addEventListener("click", processFiles);
    else console.error("compareBtn is null");
  } catch (e) { console.error("Error with compareBtn:", e); }
  
  console.log("downloadBtn:", downloadBtn);
  try {
    if (downloadBtn) downloadBtn.addEventListener("click", downloadCombined);
    else console.error("downloadBtn is null");
  } catch (e) { console.error("Error with downloadBtn:", e); }
  
  // downloadAccountsBtn removed as it doesn't exist in HTML
  // Enhanced Master file handling: Auto-save + Manual save + Multiple files
  try {
    if (masterInput) masterInput.addEventListener("change", async ()=>{
      try {
        const f = masterInput.files && masterInput.files[0];
        if (!f) return;
        
        // Always auto-save the master file
        const autoSaved = await autoSaveMaster(f);
        if (autoSaved) {
          showNotification("✅ Master file auto-saved!", "success");
        }
        
        // Also save to multiple masters collection with custom name
        const customName = prompt(`Enter a name for this master file (or press OK to use "${f.name}"):`, f.name);
        if (customName) {
          const masterData = await saveMasterWithName(f, customName);
          if (masterData) {
            showNotification(`✅ Master saved as: ${customName}`, "success");
            // Refresh the master files list
            await loadAllSavedMasters();
            updateMasterFilesUI();
          }
        }
        
        // Legacy checkbox behavior (still works)
        if (rememberMasterChk && rememberMasterChk.checked) {
          const key = getUserScopedKey();
          console.log("Saving master file with key:", key);
          const arrayBuffer = await f.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: f.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const saveData = { blob, name: f.name, savedAt: Date.now() };
          console.log("Saving data:", saveData);
          await idbSet(key, saveData);
          updateSavedMasterBadge(`Saved: ${f.name}`);
          showNotification("✅ Master saved on this device.", "success");
        }
      } catch (e) { console.error(e); showNotification("⚠ Failed to save Master locally", "error"); }
    });
  } catch (e) { console.error("Error wiring masterInput save:", e); }

  // Clear saved Master
  try {
    if (clearSavedMasterBtn) clearSavedMasterBtn.addEventListener("click", async ()=>{
      try {
        const key = getUserScopedKey();
        await idbDelete(key);
        updateSavedMasterBadge("");
        if (useSavedMasterChk) useSavedMasterChk.checked = false;
        showNotification("✅ Saved Master cleared.", "success");
      } catch(e){ console.error(e); showNotification("⚠ Failed to clear saved Master", "error"); }
    });
  } catch (e) { console.error("Error with clearSavedMasterBtn:", e); }

  // Initialize saved master status on page load (with delay to ensure DOM is ready)
  try {
    setTimeout(() => {
      initSavedMasterStatus();
    }, 500);
  } catch(e) { console.error("Error initializing saved master status:", e); }

  // On auth ready, reflect saved status
  try {
    firebase.auth().onAuthStateChanged(async (u)=>{
      try {
        // Re-check saved status when auth state changes
        await initSavedMasterStatus();
      } catch(_){}
    });
  } catch(_){}
  
  console.log("screenshotBtn:", screenshotBtn);
  try {
    if (screenshotBtn) screenshotBtn.addEventListener("click", takeScreenshot);
    else console.error("screenshotBtn is null");
  } catch (e) { console.error("Error with screenshotBtn:", e); }
  
  console.log("clearBtn:", clearBtn);
  try {
    if (clearBtn) clearBtn.addEventListener("click", clearFiles);
    else console.error("clearBtn is null");
  } catch (e) { console.error("Error with clearBtn:", e); }

  // SMS open/close
  try {
    if (smsBtn) smsBtn.addEventListener("click", openSmsModal);
  } catch (e) { console.error("Error with smsBtn:", e); }
  try {
    if (smsCloseBtn) smsCloseBtn.addEventListener("click", closeSmsModal);
  } catch (e) { console.error("Error with smsCloseBtn:", e); }
  try {
    if (sendSmsBtn) sendSmsBtn.addEventListener("click", sendSmsForBranch);
  } catch (e) { console.error("Error with sendSmsBtn:", e); }
  try {
    if (checkSmsStatusBtn) checkSmsStatusBtn.addEventListener("click", checkLastSmsStatus);
  } catch (e) { console.error("Error with checkSmsStatusBtn:", e); }
  try {
    if (smsSaveBtn) smsSaveBtn.addEventListener("click", saveBranchNumbers);
  } catch (e) { console.error("Error with smsSaveBtn:", e); }
  try {
    if (sendAllSmsBtn) sendAllSmsBtn.addEventListener("click", sendSmsForAllBranches);
  } catch (e) { console.error("Error with sendAllSmsBtn:", e); }

  // Ensure SMS button visibility refreshes after DOM is ready
  try { if (typeof updateSmsUIVisibility === "function") updateSmsUIVisibility(); } catch (_) {}

  // Auth event bindings
  console.log("googleSignInBtn:", googleSignInBtn);
  try {
    if (googleSignInBtn) googleSignInBtn.addEventListener("click", signInWithGoogle);
    else console.error("googleSignInBtn is null");
  } catch (e) { console.error("Error with googleSignInBtn:", e); }
  
  console.log("logoutBtn:", logoutBtn);
  try {
    if (logoutBtn) logoutBtn.addEventListener("click", signOut);
    else console.error("logoutBtn is null");
  } catch (e) { console.error("Error with logoutBtn:", e); }

// Initialize authentication
initAuth();

// Setup Dropzones
function setupDropzone(dropEl, inputEl, fileNameEl) {
  dropEl.addEventListener("click", () => inputEl.click());
  dropEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropEl.classList.add("dragover");
  });
  dropEl.addEventListener("dragleave", () => dropEl.classList.remove("dragover"));
  dropEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dropEl.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      inputEl.files = e.dataTransfer.files;
      fileNameEl.innerText = e.dataTransfer.files[0].name;
    }
  });
  inputEl.addEventListener("change", () => {
    fileNameEl.innerText = inputEl.files[0]?.name || "No file chosen...";
  });
}
setupDropzone(
  document.getElementById("dropMaster"),
  document.getElementById("masterFile"),
  document.getElementById("masterFileName")
);
setupDropzone(
  document.getElementById("dropDaily"),
  document.getElementById("dailyFile"),
  document.getElementById("dailyFileName")
);
}, 100);

// ---- Credits helpers
async function ensureUserCredits(user) {
  try {
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        email: user.email || null,
        displayName: user.displayName || null,
        plan: "free",
        credits: 30,
        smsCredits: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      userPlan = "free";
      userCreditsCount = 30;
      userSmsCreditsCount = 0;
    } else {
      const data = snap.data();
      userPlan = data.plan || "free";
      userCreditsCount = Number(data.credits || 0);
      userSmsCreditsCount = Number(data.smsCredits || 0);
    }
    if (typeof updateCreditsUI === "function") updateCreditsUI();
  } catch (e) {
    console.error("ensureUserCredits error", e);
  }
}

function updateCreditsUI() {
  try {
    const el = document.getElementById("userCredits");
    const btn = document.getElementById("compareBtn");
    if (el) el.textContent = `${userCreditsCount} left`;
    if (btn) btn.disabled = (userPlan === "free" && userCreditsCount <= 0);
    const smsEl = document.getElementById("userSmsCredits");
    if (smsEl) smsEl.textContent = `SMS: ${userSmsCreditsCount}`;
    if (typeof updateSmsUIVisibility === "function") updateSmsUIVisibility();
  } catch (_) {}
}

async function decrementOneCredit() {
  if (!firebase.auth().currentUser) return;
  try {
    const userRef = db.collection("users").doc(firebase.auth().currentUser.uid);
    await userRef.update({
      credits: firebase.firestore.FieldValue.increment(-1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const doc = await userRef.get();
    const data = doc.data() || {};
    userPlan = data.plan || userPlan;
    userCreditsCount = Number(data.credits || 0);
    updateCreditsUI();
  } catch (e) {
    console.error("decrementOneCredit error", e);
  }
}

async function decrementOneSmsCredit() {
  if (!firebase.auth().currentUser) return;
  try {
    const userRef = db.collection("users").doc(firebase.auth().currentUser.uid);
    await userRef.update({
      smsCredits: firebase.firestore.FieldValue.increment(-1),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const doc = await userRef.get();
    const data = doc.data() || {};
    userPlan = data.plan || userPlan;
    userSmsCreditsCount = Number(data.smsCredits || 0);
    updateCreditsUI();
  } catch (e) {
    console.error("decrementOneSmsCredit error", e);
  }
}