// Firebase Configuration
// Remove console.log for production

const firebaseConfig = {
  apiKey: "AIzaSyDo-EoKpXaJg0Ik1ASvvIkxfsfNIzgsZps",
  authDomain: "overdue-c6f74.firebaseapp.com",
  projectId: "overdue-c6f74",
  storageBucket: "overdue-c6f74.firebasestorage.app",
  messagingSenderId: "182209709064",
  appId: "1:182209709064:web:df001c5822108e8fdb7dbd"
};

// Note: If hosting on a custom domain, you may need to add your domain to Firebase authorized domains
// in the Firebase Console under Authentication > Sign-in method > Authorized domains

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// App Data
let summaryData = [];
let accountsData = [];
let personSummaryData = [];
let branchYearSummaryData = [];
let currentUser = null;

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

  // Auth Elements (initialized inside DOMContentLoaded)
  let loginContainer;
  let googleSignInBtn;
  let userProfile;
  let userAvatar;
  let userName;
  let logoutBtn;
  let userCreditsEl;
  let upgradeBtn;

  // SMS Modal elements
  let smsModal;
  let smsCloseBtn;
  let smsBranchSelect;
  let smsNumbersInput;
  let smsPreviewArea;
  let sendSmsBtn;
  let checkSmsStatusBtn;
  let smsResponseBox;

  // Credits state
  let userPlan = "free";
  let userCreditsCount = 0;

  // ---- Helper: Notifications
  function showNotification(msg,type){
    notificationBox.innerText=msg;
    notificationBox.className="notification "+type;
    notificationBox.style.display="block";
  }
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
  
  if (!masterInput.files[0] || !dailyInput.files[0]) {
    showNotification("⚠ Please select/upload both files!", "error");
    return;
  }

  loadingDiv.style.display="block"; resultDiv.innerHTML=""; hideNotification();

  const masterData=await readExcel(masterInput.files[0]);
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
  
  XLSX.writeFile(wb,"Overdue_Report.xlsx");
}

// ---- Collapsible helper
function toggleSection(sectionEl, chevronEl) {
  if (!sectionEl || !chevronEl) return;
  const isHidden = sectionEl.style.display === "none" || sectionEl.style.display === "";
  sectionEl.style.display = isHidden ? "block" : "none";
  chevronEl.textContent = isHidden ? "expand_less" : "expand_more";
}

// ---- SMS helpers and handlers
const SMS_API_KEY = "OgpEF6hQITyav6q363xHtwtDKgvEHBQKsGs6sph8";
let lastSmsRequestId = null;

function openSmsModal(){
  if (!currentUser) { showNotification("⚠ Please sign in to use this feature!", "error"); return; }
  if (!summaryData.length) { showNotification("⚠ Run comparison first!", "error"); return; }
  if (smsModal) smsModal.style.display = "flex";
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
  smsBranchSelect.addEventListener("change", updateSmsPreview, { once: true });
}

function normalizeNumbers(input){
  if (!input) return [];
  return input.split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => {
      // Convert 01XXXXXXXXX to 8801XXXXXXXXX
      if (/^01\d{9}$/.test(n)) return "88" + n;
      return n;
    });
}

function buildSmsMessage(branchName){
  const { changeLabel } = getOverdueLabels();
  const row = summaryData.find(r => r["Branch Name"] === branchName);
  const changeVal = row ? row.change : 0;
  const formatted = (changeVal || 0).toLocaleString("en-IN");
  return `Hi,\nYour are the Manager of ${branchName} Branch. You need to Deacrease Overdue of (${formatted}).`;
}

function updateSmsPreview(){
  try {
    if (!smsBranchSelect || !smsPreviewArea) return;
    const branch = smsBranchSelect.value || (summaryData.find(r=>r["Branch Name"]!=="TOTAL")||{})["Branch Name"] || "";
    if (branch) smsPreviewArea.value = buildSmsMessage(branch);
  } catch(_){}
}

async function sendSmsForBranch(){
  try {
    if (!currentUser) { showNotification("⚠ Please sign in to use this feature!", "error"); return; }
    if (!summaryData.length) { showNotification("⚠ Run comparison first!", "error"); return; }
    const branch = smsBranchSelect && smsBranchSelect.value ? smsBranchSelect.value : null;
    if (!branch) { showNotification("⚠ Select a branch", "error"); return; }
    const numbers = normalizeNumbers(smsNumbersInput ? smsNumbersInput.value : "");
    if (!numbers.length) { showNotification("⚠ Enter at least one valid number", "error"); return; }
    const msg = buildSmsMessage(branch);

    // Prepare GET request
    const params = new URLSearchParams();
    params.set("api_key", SMS_API_KEY);
    params.set("msg", msg);
    params.set("to", numbers.join(","));
    const url = `https://api.sms.net.bd/sendsms?${params.toString()}`;

    smsResponseBox.textContent = "Sending...";
    const res = await fetch(url);
    const data = await res.json().catch(()=>({ error: 409, msg: "Invalid JSON" }));
    lastSmsRequestId = (data && data.data && data.data.request_id) ? data.data.request_id : null;
    smsResponseBox.textContent = JSON.stringify(data, null, 2);
    if (checkSmsStatusBtn) checkSmsStatusBtn.style.display = lastSmsRequestId ? "inline-block" : "none";
  } catch (e) {
    console.error(e);
    if (smsResponseBox) smsResponseBox.textContent = `Error: ${e.message || e}`;
  }
}

async function checkLastSmsStatus(){
  try {
    if (!lastSmsRequestId) { smsResponseBox.textContent = "No recent request id."; return; }
    const url = `https://api.sms.net.bd/report/request/${lastSmsRequestId}/?api_key=${encodeURIComponent(SMS_API_KEY)}`;
    smsResponseBox.textContent = "Checking status...";
    const res = await fetch(url);
    const data = await res.json().catch(()=>({ error: 409, msg: "Invalid JSON" }));
    smsResponseBox.textContent = JSON.stringify(data, null, 2);
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
}

function hideUserProfile() {
  userProfile.style.display = "none";
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

loginContainer = document.getElementById("loginContainer");
googleSignInBtn = document.getElementById("googleSignInBtn");
userProfile = document.getElementById("userProfile");
userAvatar = document.getElementById("userAvatar");
userName = document.getElementById("userName");
logoutBtn = document.getElementById("logoutBtn");
userCreditsEl = document.getElementById("userCredits");
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      userPlan = "free";
      userCreditsCount = 30;
    } else {
      const data = snap.data();
      userPlan = data.plan || "free";
      userCreditsCount = Number(data.credits || 0);
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