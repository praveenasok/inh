// State management and logic for Hair Stock Ledger Application

let state = {
  entries: [],
  suppliers: [],
  currentSupplierId: null,
  presets: {
    hairType: [],
    length: [],
    color: [],
    location: []
  },
  hairTypes: new Set(),
  lengths: new Set(),
  expandedLocations: new Set()
};

// Seed Data for Ledger
const seedData = [];

// Seed Data for Suppliers
const seedSuppliers = [
  {
    id: "1",
    name: "Global Hair Corp",
    contact: "sales@globalhair.com | +1 (555) 0122",
    products: [
      { id: "p1", hairType: "Remy Raw", length: "8", color: "Natural Black", buyingRate: 1.10, details: "Raw single donor weft" },
      { id: "p2", hairType: "Remy Raw", length: "10", color: "Natural Black", buyingRate: 1.25, details: "Raw single donor weft" },
      { id: "p3", hairType: "Machine Weft", length: "12", color: "Jet Black", buyingRate: 1.40, details: "Double drawn machine weft" }
    ]
  },
  {
    id: "2",
    name: "Supreme Strands Co.",
    contact: "info@supremestrands.com | +1 (555) 0188",
    products: [
      { id: "p4", hairType: "Remy Virgin", length: "6", color: "Dark Brown", buyingRate: 0.80, details: "Single drawn virgin hair" },
      { id: "p5", hairType: "Brazilian Wave", length: "16", color: "Natural Black", buyingRate: 1.95, details: "Wavy texture virgin bundle" }
    ]
  }
];

// Seed Data for Presets
const seedPresets = {
  hairType: ["Remy Raw", "Remy Virgin", "Single Drawn", "Double Drawn", "Bulk Hair", "Machine Weft", "Brazilian Wave", "Indian Curly"],
  length: ["6", "6-10", "7", "7-8", "8", "9", "9-10", "10", "12", "14", "16", "18"],
  color: ["Natural Black", "Natural Brown", "Dark Brown", "Medium Brown", "Jet Black", "Blonde #613", "Light Ash Blonde"],
  location: ["INH-STOCKROOM"]
};

// Initialize the Application
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  loadSuppliers();
  loadPresets();
  initFormDefaults();
  initTabs();
  setupEventListeners();
  renderApp();
});

// Load Stock Data from LocalStorage
function loadData() {
  if (!localStorage.getItem("stock_cleared_inh_stockroom")) {
    localStorage.removeItem("hair_stock_ledger");
    localStorage.removeItem("hair_stock_presets");
    localStorage.setItem("stock_cleared_inh_stockroom", "true");
  }

  const localData = localStorage.getItem("hair_stock_ledger");
  if (localData) {
    try {
      state.entries = JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse local stock storage. Using seed data.", e);
      state.entries = [...seedData];
      saveData();
    }
  } else {
    state.entries = [...seedData];
    saveData();
  }
  updateUniqueSets();
}

// Save Stock Data to LocalStorage
function saveData() {
  localStorage.setItem("hair_stock_ledger", JSON.stringify(state.entries));
  updateUniqueSets();
}

// Load Suppliers from LocalStorage
function loadSuppliers() {
  const localSuppliers = localStorage.getItem("inv_suppliers");
  if (localSuppliers) {
    try {
      state.suppliers = JSON.parse(localSuppliers);
    } catch (e) {
      console.error("Failed to parse supplier storage.", e);
      state.suppliers = [];
    }
  } else {
    state.suppliers = [];
  }
}

// Save Suppliers to LocalStorage
function saveSuppliers() {
  localStorage.setItem("inv_suppliers", JSON.stringify(state.suppliers));
}

// Load Attribute Presets from LocalStorage
function loadPresets() {
  const localPresets = localStorage.getItem("hair_stock_presets");
  if (localPresets) {
    try {
      state.presets = JSON.parse(localPresets);
    } catch (e) {
      console.error("Failed to parse presets. Using seed presets.", e);
      state.presets = { ...seedPresets };
      savePresets();
    }
  } else {
    state.presets = { ...seedPresets };
    savePresets();
  }
}

// Save Attribute Presets to LocalStorage
function savePresets() {
  localStorage.setItem("hair_stock_presets", JSON.stringify(state.presets));
}

// Update Unique Hair Types & Lengths Cache
function updateUniqueSets() {
  state.hairTypes = new Set(state.entries.map(e => e.hairType.trim()).filter(Boolean));
  state.lengths = new Set(state.entries.map(e => e.length.trim()).filter(Boolean));
}

// Set form default values (e.g. current date)
function initFormDefaults() {
  const dateInput = document.getElementById("entry-date");
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// Setup Tab Navigation
function initTabs() {
  const tabLedger = document.getElementById("tab-ledger");
  const tabPurchase = document.getElementById("tab-purchase");
  const tabPresets = document.getElementById("tab-presets");
  const tabSuppliers = document.getElementById("tab-suppliers");
  const tabMo = document.getElementById("tab-mo");
  
  const viewLedger = document.getElementById("view-ledger");
  const viewPurchase = document.getElementById("view-purchase");
  const viewPresets = document.getElementById("view-presets");
  const viewSuppliers = document.getElementById("view-suppliers");
  const viewMo = document.getElementById("view-mo");

  tabLedger.addEventListener("click", () => {
    tabLedger.classList.add("active");
    tabPurchase.classList.remove("active");
    tabPresets.classList.remove("active");
    tabSuppliers?.classList.remove("active");
    tabMo?.classList.remove("active");
    
    viewLedger.classList.add("active");
    viewPurchase.classList.remove("active");
    viewPresets.classList.remove("active");
    viewSuppliers?.classList.remove("active");
    viewMo?.classList.remove("active");
    renderApp();
  });

  tabPurchase.addEventListener("click", () => {
    tabPurchase.classList.add("active");
    tabLedger.classList.remove("active");
    tabPresets.classList.remove("active");
    tabSuppliers?.classList.remove("active");
    tabMo?.classList.remove("active");
    
    viewPurchase.classList.add("active");
    viewLedger.classList.remove("active");
    viewPresets.classList.remove("active");
    viewSuppliers?.classList.remove("active");
    viewMo?.classList.remove("active");
    renderSuppliers();
    renderSupplierDetails();
  });

  tabPresets.addEventListener("click", () => {
    tabPresets.classList.add("active");
    tabLedger.classList.remove("active");
    tabPurchase.classList.remove("active");
    tabSuppliers?.classList.remove("active");
    tabMo?.classList.remove("active");
    
    viewPresets.classList.add("active");
    viewLedger.classList.remove("active");
    viewPurchase.classList.remove("active");
    viewSuppliers?.classList.remove("active");
    viewMo?.classList.remove("active");
    renderPresetLists();
  });

  tabSuppliers?.addEventListener("click", () => {
    tabSuppliers.classList.add("active");
    tabLedger.classList.remove("active");
    tabPurchase.classList.remove("active");
    tabPresets.classList.remove("active");
    tabMo?.classList.remove("active");
    
    viewSuppliers.classList.add("active");
    viewLedger.classList.remove("active");
    viewPurchase.classList.remove("active");
    viewPresets.classList.remove("active");
    viewMo?.classList.remove("active");
    // State rendering logic is hooked in suppliers.js separately
  });

  if (tabMo && viewMo) {
    tabMo.addEventListener("click", () => {
      tabMo.classList.add("active");
      tabLedger.classList.remove("active");
      tabPurchase.classList.remove("active");
      tabPresets.classList.remove("active");
      tabSuppliers?.classList.remove("active");
      
      viewMo.classList.add("active");
      viewLedger.classList.remove("active");
      viewPurchase.classList.remove("active");
      viewPresets.classList.remove("active");
      viewSuppliers?.classList.remove("active");
    });
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Add Entry Handlers
  document.getElementById("add-entry-btn").addEventListener("click", handleAddEntry);
  
  // Rate & Amount inputs change to preview total
  const rateInput = document.getElementById("entry-rate");
  const amountInput = document.getElementById("entry-amount");
  
  rateInput.addEventListener("input", updateEntryTotalPreview);
  amountInput.addEventListener("input", updateEntryTotalPreview);

  // Keypress in inputs (Enter key submits)
  const inputs = document.querySelectorAll("#inline-entry-row input");
  inputs.forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleAddEntry();
      }
    });
  });

  // Search Input
  document.getElementById("table-search-input").addEventListener("input", renderTable);
  
  // Row Limit Selector
  document.getElementById("table-row-limit").addEventListener("change", renderTable);

  // Analysis Hair Type Filter Dropdown
  document.getElementById("analysis-hair-type-filter").addEventListener("change", renderLengthAnalysis);

  // CSV Export & Import
  document.getElementById("export-csv-btn").addEventListener("click", exportCSV);
  
  const csvTrigger = document.getElementById("import-csv-trigger");
  const csvFileInput = document.getElementById("csv-file-input");
  
  csvTrigger.addEventListener("click", () => csvFileInput.click());
  csvFileInput.addEventListener("change", importCSV);

  // Dialog Close buttons (Transfers)
  document.getElementById("close-transfer-btn").addEventListener("click", () => {
    document.getElementById("transfer-dialog").close();
  });
  document.getElementById("cancel-transfer-btn").addEventListener("click", () => {
    document.getElementById("transfer-dialog").close();
  });

  // Dialog Close buttons (Purchase)
  const closePurchaseBtn = document.getElementById("close-purchase-btn");
  if (closePurchaseBtn) {
    closePurchaseBtn.addEventListener("click", () => {
      document.getElementById("purchase-dialog").close();
    });
  }
  
  const cancelPurchaseBtn = document.getElementById("cancel-purchase-btn");
  if (cancelPurchaseBtn) {
    cancelPurchaseBtn.addEventListener("click", () => {
      document.getElementById("purchase-dialog").close();
    });
  }

  const purchaseForm = document.getElementById("purchase-form");
  if (purchaseForm) {
    purchaseForm.addEventListener("submit", (e) => {
      // In the absence of an openPurchaseDialog implementation in the new grid flow,
      // just close it.
      document.getElementById("purchase-dialog").close();
    });
  }

  // Dialog Transfer All button
  // Dialog Transfer without MO checkbox
  const transferWithoutMoCb = document.getElementById("transfer-without-mo");
  if (transferWithoutMoCb) {
    transferWithoutMoCb.addEventListener("change", (e) => {
      const moInput = document.getElementById("transfer-mo");
      if (e.target.checked) {
        moInput.disabled = true;
        moInput.value = "N/A";
      } else {
        moInput.disabled = false;
        moInput.value = "";
      }
    });
  }

  // Dialog Submit (Commit Transfer)
  document.getElementById("transfer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const sourceLoc = document.getElementById("transfer-source-location").value;
    const type = document.getElementById("transfer-hair-type").value;
    const moRef = document.getElementById("transfer-mo").value.trim();
    const commentVal = document.getElementById("transfer-comments").value.trim();
    const destLoc = document.getElementById("transfer-dest-location").value.trim();

    if (!destLoc) {
      showToast("Please enter a destination location.", "error");
      return;
    }
    if (destLoc.toLowerCase() === sourceLoc.toLowerCase()) {
      showToast("Destination location cannot be the same as the source location.", "error");
      return;
    }

    const gridBody = document.getElementById("transfer-grid-body");
    const rows = gridBody.querySelectorAll("tr[data-length]");
    let transferCount = 0;
    let totalQty = 0;
    let hasError = false;

    // Validate first
    rows.forEach(row => {
      const available = parseFloat(row.dataset.available) || 0;
      const qtyInput = row.querySelector(".transfer-grid-qty");
      const wastageInput = row.querySelector(".wastage-grid-qty");
      const miscLossInput = row.querySelector(".misc-loss-grid-qty");
      
      const qtyToTransfer = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;
      const qtyWastage = wastageInput ? (parseFloat(wastageInput.value) || 0) : 0;
      const qtyMiscLoss = miscLossInput ? (parseFloat(miscLossInput.value) || 0) : 0;
      const totalRequested = qtyToTransfer + qtyWastage + qtyMiscLoss;
      
      if (totalRequested > 0) {
        // Adding 0.0001 to available to prevent floating point math errors (e.g. 0.04 + 0.01 > 0.05)
        if (totalRequested > available + 0.0001) {
          hasError = true;
          showToast(`Cannot process more than available stock for length ${row.dataset.length}".`, "error");
        }
      }
    });

    if (hasError) return;

    // Execute transfers
    rows.forEach(row => {
      const len = row.dataset.length;
      const qtyInput = row.querySelector(".transfer-grid-qty");
      const wastageInput = row.querySelector(".wastage-grid-qty");
      const miscLossInput = row.querySelector(".misc-loss-grid-qty");
      
      const qtyToTransfer = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;
      const qtyWastage = wastageInput ? (parseFloat(wastageInput.value) || 0) : 0;
      const qtyMiscLoss = miscLossInput ? (parseFloat(miscLossInput.value) || 0) : 0;
      
      if (qtyToTransfer > 0 || qtyWastage > 0 || qtyMiscLoss > 0) {
        // Execute the main transfer if any
        if (qtyToTransfer > 0) {
          executeStockTransfer(sourceLoc, type, len, qtyToTransfer, moRef, commentVal, destLoc);
          totalQty += qtyToTransfer;
        }
        
        // Execute the wastage transfer if any
        if (qtyWastage > 0) {
          const wastageComment = commentVal ? `[WASTAGE] ${commentVal}` : `[WASTAGE] Weight loss during transfer`;
          const destWastageLoc = "Wastage";
          executeStockTransfer(sourceLoc, type, len, qtyWastage, moRef, wastageComment, destWastageLoc);
        }
        
        // Execute the misc loss transfer if any
        if (qtyMiscLoss > 0) {
          const miscLossComment = commentVal ? `[MISC LOSS] ${commentVal}` : `[MISC LOSS] Miscellaneous weight loss during transfer`;
          const destMiscLossLoc = "Misc Loss";
          executeStockTransfer(sourceLoc, type, len, qtyMiscLoss, moRef, miscLossComment, destMiscLossLoc);
        }
        
        transferCount++;
      }
    });

    if (transferCount === 0) {
      showToast("Please enter a quantity for at least one length.", "error");
    } else {
      saveData();
      document.getElementById("transfer-dialog").close();
      renderApp();
      showToast(`Successfully processed ${formatNumber(totalQty)} kg transfer!`, "success");
    }
  });

  // Supplier forms submit listeners
  const newPurchaseForm = document.getElementById("new-purchase-entry-form");
  if (newPurchaseForm) newPurchaseForm.addEventListener("submit", handleNewPurchaseEntry);
  
  const purchasePriceListSelect = document.getElementById("purchase-price-list");
  if (purchasePriceListSelect) {
    purchasePriceListSelect.addEventListener("change", renderPurchaseGrid);
  }

  // Attribute Presets Add Forms setup
  const attrTypes = ["hairType", "length", "color", "location"];
  attrTypes.forEach(attr => {
    const form = document.getElementById(`add-preset-${attr}-form`);
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById(`new-preset-${attr}`);
        const val = input.value.trim();
        if (val) {
          addPresetValue(attr, val);
          input.value = "";
        }
      });
    }
  });
}

// Update the preview of Total Value in the inline entry row
function updateEntryTotalPreview() {
  const rate = parseFloat(document.getElementById("entry-rate").value) || 0;
  const amount = parseFloat(document.getElementById("entry-amount").value) || 0;
  const total = rate * amount;
  
  document.getElementById("entry-total-preview").textContent = formatCurrency(total);
}

// Handle Adding a New Entry
function handleAddEntry() {
  const dateVal = document.getElementById("entry-date").value;
  const hairTypeVal = document.getElementById("entry-hair-type").value.trim();
  const lengthVal = document.getElementById("entry-length").value.trim();
  const colorVal = document.getElementById("entry-color").value.trim();
  const rateVal = parseFloat(document.getElementById("entry-rate").value);
  const amountVal = parseFloat(document.getElementById("entry-amount").value);
  const moVal = document.getElementById("entry-mo").value.trim();
  const locationVal = document.getElementById("entry-location").value.trim();
  const commentsVal = document.getElementById("entry-comments").value.trim();

  // Validation
  if (!dateVal) {
    showToast("Please select a date.", "error");
    document.getElementById("entry-date").focus();
    return;
  }
  if (!hairTypeVal) {
    showToast("Please enter a Hair Type.", "error");
    document.getElementById("entry-hair-type").focus();
    return;
  }
  if (!lengthVal) {
    showToast("Please enter a Length.", "error");
    document.getElementById("entry-length").focus();
    return;
  }
  if (!colorVal) {
    showToast("Please enter a Color.", "error");
    document.getElementById("entry-color").focus();
    return;
  }
  if (isNaN(rateVal) || rateVal < 0) {
    showToast("Please enter a valid rate (>= 0).", "error");
    document.getElementById("entry-rate").focus();
    return;
  }
  if (isNaN(amountVal) || amountVal < 0) {
    showToast("Please enter a valid stock amount/qty (>= 0).", "error");
    document.getElementById("entry-amount").focus();
    return;
  }

  // Create Entry Object
  const newEntry = {
    id: Date.now().toString(),
    date: dateVal,
    hairType: hairTypeVal,
    length: lengthVal,
    color: colorVal,
    rate: rateVal,
    amount: amountVal,
    mo: moVal || "-",
    location: locationVal || "-",
    comments: commentsVal || "-"
  };

  // Add to State
  state.entries.push(newEntry);
  saveData();

  // Clear inputs
  document.getElementById("entry-hair-type").value = "";
  document.getElementById("entry-length").value = "";
  document.getElementById("entry-color").value = "";
  document.getElementById("entry-rate").value = "";
  document.getElementById("entry-amount").value = "";
  document.getElementById("entry-mo").value = "";
  document.getElementById("entry-location").value = "";
  document.getElementById("entry-comments").value = "";
  document.getElementById("entry-total-preview").textContent = "$0.00";

  // Re-focus Hair Type
  document.getElementById("entry-hair-type").focus();

  // Update Visuals
  renderApp();
  showToast("Stock entry added successfully!", "success");
}

// Edit Cell Handler
function makeCellEditable(tdElement, entryId, columnKey) {
  if (tdElement.querySelector('input')) return;

  const originalContent = tdElement.textContent;
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;

  const originalValue = entry[columnKey];
  
  // Create Input
  const input = document.createElement("input");
  input.className = "cell-edit-input";
  
  // Set type and value
  if (columnKey === 'date') {
    input.type = "date";
    input.value = originalValue;
  } else if (columnKey === 'rate' || columnKey === 'amount') {
    input.type = "number";
    input.step = columnKey === 'rate' ? "0.01" : "any";
    input.value = originalValue;
    input.style.textAlign = "right";
  } else {
    input.type = "text";
    input.value = originalValue;
    
    // Bind autocomplete datalists if editing presets columns
    if (columnKey === 'hairType') input.setAttribute("list", "hair-types-datalist");
    else if (columnKey === 'length') input.setAttribute("list", "lengths-datalist");
    else if (columnKey === 'color') input.setAttribute("list", "colors-datalist");
    else if (columnKey === 'location') input.setAttribute("list", "locations-datalist");
  }

  tdElement.innerHTML = "";
  tdElement.appendChild(input);
  input.focus();
  if (input.type === "text") {
    input.select();
  }

  let finished = false;

  const finishEdit = () => {
    if (finished) return;
    finished = true;

    let newValue = input.value.trim();
    
    // Validation
    if (columnKey === 'date' && !newValue) {
      showToast("Date cannot be empty.", "error");
      newValue = originalValue;
    } else if (columnKey === 'hairType' && !newValue) {
      showToast("Hair Type cannot be empty.", "error");
      newValue = originalValue;
    } else if (columnKey === 'length' && !newValue) {
      showToast("Length cannot be empty.", "error");
      newValue = originalValue;
    } else if (columnKey === 'color' && !newValue) {
      showToast("Color cannot be empty.", "error");
      newValue = originalValue;
    } else if (columnKey === 'rate') {
      const parsed = parseFloat(newValue);
      if (isNaN(parsed) || parsed < 0) {
        showToast("Invalid rate.", "error");
        newValue = originalValue;
      } else {
        newValue = parsed;
      }
    } else if (columnKey === 'amount') {
      const parsed = parseFloat(newValue);
      if (isNaN(parsed) || parsed < 0) {
        showToast("Invalid amount.", "error");
        newValue = originalValue;
      } else {
        newValue = parsed;
      }
    }

    if (newValue !== originalValue) {
      entry[columnKey] = newValue;
      saveData();
      showToast("Cell updated.", "success");
      renderApp();
    } else {
      renderApp();
    }
  };

  const cancelEdit = () => {
    if (finished) return;
    finished = true;
    renderApp();
  };

  input.addEventListener("blur", finishEdit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      finishEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  });
}

// Delete Entry Handler
function handleDeleteEntry(id) {
  const index = state.entries.findIndex(e => e.id === id);
  if (index !== -1) {
    const deletedEntry = state.entries[index];
    state.entries.splice(index, 1);
    saveData();
    renderApp();
    showToast(`Deleted ${deletedEntry.hairType} (${deletedEntry.length}") entry.`, "success");
  }
}

// Global UI Rendering
function renderApp() {
  const currentScroll = window.scrollY;
  
  updateMetrics();
  updateDatalist();
  updateAnalysisFilterDropdown();
  renderLengthAnalysis();
  renderLocationAnalysis();
  renderTable();
  
  // Restore scroll position after DOM rebuilds
  setTimeout(() => {
    window.scrollTo(0, currentScroll);
  }, 0);
}

// Update Dashboard Numbers
function updateMetrics() {
  const uniqueSizes = new Set(state.entries.map(e => e.length.trim().toLowerCase())).size;
  const uniqueTypes = state.hairTypes.size;
  
  const totalWeight = state.entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalValuation = state.entries.reduce((sum, e) => sum + ((parseFloat(e.rate) || 0) * (parseFloat(e.amount) || 0)), 0);

  document.getElementById("metric-unique-sizes").textContent = formatNumber(uniqueSizes);
  document.getElementById("metric-unique-types").textContent = formatNumber(uniqueTypes);
  document.getElementById("metric-total-weight").textContent = formatNumber(totalWeight);
  document.getElementById("metric-total-valuation").textContent = formatCurrency(totalValuation);
}

// Update Autocomplete datalists merging presets + ledger records
function updateDatalist() {
  const attributes = {
    hairType: "hair-types-datalist",
    length: "lengths-datalist",
    color: "colors-datalist",
    location: "locations-datalist"
  };

  Object.keys(attributes).forEach(key => {
    const datalist = document.getElementById(attributes[key]);
    if (!datalist) return;

    datalist.innerHTML = "";

    // 1. Gather all unique values currently inside stock entries
    const entriesValues = state.entries.map(e => e[key] ? e[key].trim() : "").filter(Boolean);
    
    // 2. Gather values inside defined presets
    const presetValues = state.presets[key] || [];

    // 3. Union & De-duplicate
    const mergedUnique = Array.from(new Set([...presetValues, ...entriesValues])).sort((a, b) => {
      if (key === "length") {
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      }
      return a.localeCompare(b);
    });

    mergedUnique.forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      datalist.appendChild(opt);
    });
  });
}

// Update the Hair Type selection dropdown in Stock by Length Analysis
function updateAnalysisFilterDropdown() {
  const select = document.getElementById("analysis-hair-type-filter");
  const currentValue = select.value;
  
  select.innerHTML = '<option value="all">Show All Hair Types</option>';
  const sortedTypes = Array.from(state.hairTypes).sort((a, b) => a.localeCompare(b));
  
  sortedTypes.forEach(type => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
  
  if (currentValue === "all" || state.hairTypes.has(currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "all";
  }
}

// Render "Stock by Length Analysis" Cards
function renderLengthAnalysis() {
  const container = document.getElementById("length-cards-container");
  const selectedType = document.getElementById("analysis-hair-type-filter").value;
  
  const filtered = selectedType === "all" 
    ? state.entries 
    : state.entries.filter(e => e.hairType === selectedType);
    
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-analysis-data">No data matching the filter.</div>';
    return;
  }

  const lengthStock = {};
  filtered.forEach(entry => {
    const len = entry.length.trim();
    if (!lengthStock[len]) {
      lengthStock[len] = 0;
    }
    lengthStock[len] += parseFloat(entry.amount) || 0;
  });

  const sortedLengths = Object.keys(lengthStock).sort((a, b) => {
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  container.innerHTML = "";
  
  sortedLengths.forEach(len => {
    const stock = lengthStock[len];
    const card = document.createElement("div");
    card.className = `length-card ${stock === 0 ? 'zero-stock' : ''}`;
    
    card.addEventListener("click", () => {
      const searchInput = document.getElementById("table-search-input");
      searchInput.value = len;
      renderTable();
      document.querySelector(".table-section").scrollIntoView({ behavior: 'smooth' });
    });
    
    card.innerHTML = `
      <div class="length-card-header">
        <span class="card-label">LENGTH</span>
        <span class="card-value">${len}</span>
      </div>
      <div class="length-card-footer">
        <span class="card-label">STOCK:</span>
        <span class="stock-num">${formatNumber(stock)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Render Location Cards Analysis
function renderLocationAnalysis() {
  const container = document.getElementById("locations-grid");
  if (!container) return;

  const locationGroups = {};
  state.entries.forEach(entry => {
    const loc = entry.location ? entry.location.trim() : "-";
    const amount = parseFloat(entry.amount) || 0;
    if (amount === 0) return;

    if (!locationGroups[loc]) {
      locationGroups[loc] = {
        totalWeight: 0,
        totalValue: 0,
        items: {},
        activeMOs: {}
      };
    }

    locationGroups[loc].totalWeight += amount;
    locationGroups[loc].totalValue += (amount * (parseFloat(entry.rate) || 0));

    let key = `${entry.hairType} - ${entry.length}"`;
    const isWastageOrLoss = loc.toLowerCase().includes("wastage") || loc.toLowerCase().includes("misc loss");
    if (isWastageOrLoss && entry.mo && entry.mo !== "-") {
      key += ` (MO: ${entry.mo})`;
    }
    
    if (!locationGroups[loc].items[key]) {
      locationGroups[loc].items[key] = 0;
    }
    locationGroups[loc].items[key] += amount;

    // Track active MOs
    if (entry.mo && entry.mo !== "-" && entry.mo.trim() !== "") {
      const moTrimmed = entry.mo.trim();
      if (!locationGroups[loc].activeMOs[moTrimmed]) {
        locationGroups[loc].activeMOs[moTrimmed] = 0;
      }
      locationGroups[loc].activeMOs[moTrimmed] += amount;
    }
  });

  const locations = Object.keys(locationGroups)
    .filter(loc => locationGroups[loc].totalWeight > 0.001)
    .sort((a, b) => a.localeCompare(b));

  if (locations.length === 0) {
    container.innerHTML = '<div class="no-location-data">No stocks in any location. Add new stock entries or buy products.</div>';
    return;
  }

  container.innerHTML = "";

  locations.forEach(loc => {
    const data = locationGroups[loc];
    const card = document.createElement("div");
    
    const isExpanded = state.expandedLocations.has(loc);
    card.className = `location-card ${isExpanded ? 'expanded' : ''}`;
    card.dataset.location = loc;

    const header = document.createElement("div");
    header.className = "location-card-header";
    header.innerHTML = `
      <div class="location-name-title">
        <span class="material-icons-round" style="color: var(--accent-color); font-size: 18px;">place</span>
        <span>${escapeHtml(loc)}</span>
      </div>
      <div class="location-header-right">
        <div class="location-stats-summary">
          <div class="location-stat-item">
            <span class="stat-lbl">WEIGHT</span>
            <strong class="stat-val">${formatNumber(data.totalWeight)}</strong>
          </div>
          <div class="location-stat-item">
            <span class="stat-lbl">VALUE</span>
            <strong class="stat-val value-highlight">${formatCurrency(Math.max(0, data.totalValue))}</strong>
          </div>
        </div>
        <span class="material-icons-round chevron-icon">expand_more</span>
      </div>
    `;
    card.appendChild(header);

    const detailsContainer = document.createElement("div");
    detailsContainer.className = "location-card-details";

    // Active MOs Section
    const activeMOsList = Object.keys(data.activeMOs).filter(mo => data.activeMOs[mo] > 0.001).sort();
    if (activeMOsList.length > 0) {
      const moContainer = document.createElement("div");
      moContainer.style.padding = "12px 16px 8px 16px";
      moContainer.innerHTML = `
        <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Active MOs in Process</div>
        <div class="loc-active-mos-flex" style="display: flex; gap: 6px; flex-wrap: wrap;"></div>
      `;
      const flexContainer = moContainer.querySelector('.loc-active-mos-flex');
      
      activeMOsList.forEach(mo => {
        const pill = document.createElement("span");
        pill.className = "active-mo-pill";
        pill.style.padding = "4px 8px";
        pill.style.fontSize = "11px";
        pill.innerHTML = `<span class="material-icons-round" style="font-size: 12px;">label</span> ${escapeHtml(mo)}`;
        
        pill.addEventListener("click", (e) => {
          e.stopPropagation();
          const searchInput = document.getElementById("table-search-input");
          searchInput.value = mo;
          renderTable();
          document.querySelector(".table-section").scrollIntoView({ behavior: 'smooth' });
        });
        
        flexContainer.appendChild(pill);
      });
      
      detailsContainer.appendChild(moContainer);
      
      const divider = document.createElement("div");
      divider.style.height = "1px";
      divider.style.backgroundColor = "#e2e8f0";
      divider.style.margin = "0 16px";
      detailsContainer.appendChild(divider);
    }

    const list = document.createElement("ul");
    list.className = "location-items-list";
    
    const sortedItems = Object.keys(data.items)
      .filter(itemKey => data.items[itemKey] > 0.001)
      .sort((a, b) => a.localeCompare(b));

    if (sortedItems.length === 0) {
      list.innerHTML = `<li class="location-item"><span class="location-item-name" style="color:var(--text-muted);">No items in this location.</span></li>`;
    }

    sortedItems.forEach(itemKey => {
      const weight = data.items[itemKey];
      const li = document.createElement("li");
      li.className = "location-item";
      
      let displayName = escapeHtml(itemKey);
      let moValue = "";
      
      const moMatch = itemKey.match(/\(MO: (.*?)\)/);
      if (moMatch) {
         moValue = moMatch[1];
         displayName = displayName.replace(`(MO: ${moValue})`, `<span class="mo-badge" data-mo="${escapeHtml(moValue)}" style="cursor:pointer; background-color:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe; padding:2px 6px; border-radius:4px; font-size: 10px; margin-left: 4px; vertical-align: middle;" title="View events for MO: ${escapeHtml(moValue)}">MO: ${escapeHtml(moValue)}</span>`);
      }

      li.innerHTML = `
        <span class="location-item-name" title="${escapeHtml(itemKey)}">${displayName}</span>
        <span class="location-item-weight">${formatNumber(weight)}</span>
      `;
      
      if (moValue) {
        const badge = li.querySelector('.mo-badge');
        if (badge) {
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            const searchInput = document.getElementById("table-search-input");
            searchInput.value = moValue;
            renderTable();
            document.querySelector(".table-section").scrollIntoView({ behavior: 'smooth' });
          });
        }
      }

      list.appendChild(li);
    });
    detailsContainer.appendChild(list);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justify = "flex-end";
    footer.innerHTML = `
      <button type="button" class="btn btn-secondary btn-small transfer-btn">
        <span class="material-icons-round" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">swap_horiz</span>
        Transfer Stock
      </button>
    `;
    
    footer.querySelector(".transfer-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      initiateTransfer(loc);
    });

    detailsContainer.appendChild(footer);
    card.appendChild(detailsContainer);

    card.addEventListener("click", (e) => {
      if (e.target.closest('.transfer-btn')) return;

      const isNowExpanded = card.classList.toggle("expanded");
      if (isNowExpanded) {
        state.expandedLocations.add(loc);
      } else {
        state.expandedLocations.delete(loc);
      }
    });

    container.appendChild(card);
  });
}

// Open Transfer Modal
function initiateTransfer(sourceLoc) {
  const dialog = document.getElementById("transfer-dialog");
  if (!dialog) return;

  document.getElementById("transfer-source-location").value = sourceLoc;
  document.getElementById("transfer-source-display").textContent = sourceLoc;

  // Clear inputs
  const moInput = document.getElementById("transfer-mo");
  moInput.value = "";
  moInput.disabled = false;
  const withoutMoCheckbox = document.getElementById("transfer-without-mo");
  if (withoutMoCheckbox) withoutMoCheckbox.checked = false;
  
  document.getElementById("transfer-comments").value = "";
  document.getElementById("transfer-dest-location").value = "";

  // Get active MOs
  let activeMOs = {};
  state.entries.forEach(e => {
     if (e.location === sourceLoc && e.mo && e.mo !== "-" && e.mo.trim() !== "") {
         const amount = parseFloat(e.amount) || 0;
         const mo = e.mo.trim();
         if (!activeMOs[mo]) activeMOs[mo] = 0;
         activeMOs[mo] += amount;
     }
  });
  const validMOs = Object.keys(activeMOs).filter(mo => activeMOs[mo] > 0.001);
  
  const moDatalist = document.getElementById("transfer-active-mo-list");
  if (moDatalist) {
    moDatalist.innerHTML = "";
    validMOs.forEach(mo => {
       const opt = document.createElement("option");
       opt.value = mo;
       moDatalist.appendChild(opt);
    });
  }

  // Toggle input vs select based on location
  const moSelect = document.getElementById("transfer-mo-select");
  if (sourceLoc.toLowerCase() === "inh-in") {
      moInput.style.display = "";
      if (moSelect) moSelect.style.display = "none";
      moInput.value = "";
  } else {
      moInput.style.display = "none";
      if (moSelect) {
          moSelect.style.display = "";
          moSelect.innerHTML = '<option value="">Select an MO...</option>';
          validMOs.forEach(mo => {
              const opt = document.createElement("option");
              opt.value = mo;
              opt.textContent = mo;
              moSelect.appendChild(opt);
          });
          
          if (validMOs.length === 1) {
              moSelect.value = validMOs[0];
              moInput.value = validMOs[0];
          } else {
              moSelect.value = "";
              moInput.value = "";
          }
          
          moSelect.onchange = (e) => {
              moInput.value = e.target.value;
              updateFormForMO();
          };
      }
  }

  const typeSelect = document.getElementById("transfer-hair-type");

  function updateFormForMO() {
      const selectedMO = moInput.value.trim().toLowerCase();
      const gridBody = document.getElementById("transfer-grid-body");
      
      // If MO is empty and not INH-in, prompt to select MO
      if (selectedMO === "" && sourceLoc.toLowerCase() !== "inh-in") {
          typeSelect.innerHTML = '<option value="">Select an MO first...</option>';
          typeSelect.disabled = true;
          gridBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Please select an MO reference to view available stock.</td></tr>`;
          return;
      }
      
      typeSelect.disabled = false;
      
      // Calculate net balances for this location
      let balances = {}; // key: "type|length", value: netAmount
      
      state.entries.forEach(e => {
         if (e.location === sourceLoc) {
             const amt = parseFloat(e.amount) || 0;
             if (amt === 0) return;
             
             if (selectedMO !== "") {
                 if (!e.mo || e.mo.trim().toLowerCase() !== selectedMO) return;
             }
             
             const key = `${e.hairType}|${e.length}`;
             if (!balances[key]) balances[key] = 0;
             balances[key] += amt;
         }
      });
      
      // Filter out empty balances
      const validKeys = Object.keys(balances).filter(k => balances[k] > 0.001);
      
      const typesAtLoc = Array.from(new Set(validKeys.map(k => k.split('|')[0]))).sort((a, b) => a.localeCompare(b));
      
      typeSelect.innerHTML = "";
      typesAtLoc.forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        typeSelect.appendChild(opt);
      });
      
      typeSelect.onchange = () => {
         const selectedType = typeSelect.value;
         const gridBody = document.getElementById("transfer-grid-body");
         gridBody.innerHTML = "";

         if (!selectedType) return;

         const keysForType = validKeys.filter(k => k.startsWith(selectedType + '|'));
         const lengthsAtLoc = keysForType.map(k => k.split('|')[1]).sort((a, b) => {
           const aNum = parseFloat(a);
           const bNum = parseFloat(b);
           if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
           return a.localeCompare(b);
         });

         lengthsAtLoc.forEach(len => {
           const key = `${selectedType}|${len}`;
           const totalAvailable = balances[key];
           
           const tr = document.createElement("tr");
           tr.dataset.length = len;
           tr.dataset.available = totalAvailable;
           
           tr.innerHTML = `
             <td style="text-align: left; padding-left: 1.5rem; font-weight: 500;">${escapeHtml(len)}"</td>
             <td style="text-align: right; padding-right: 1.5rem; font-weight: 600; color: #10b981;">${formatNumber(totalAvailable)}</td>
             <td style="text-align: center;">
               <input type="number" class="table-input transfer-grid-qty" data-length="${escapeHtml(len)}" step="0.001" min="0" max="${totalAvailable}" placeholder="0.00" style="text-align: center; width: 80%; margin: 0 auto;">
             </td>
             <td style="text-align: center;">
               <input type="number" class="table-input wastage-grid-qty" data-length="${escapeHtml(len)}" step="0.001" min="0" max="${totalAvailable}" placeholder="0.00" style="text-align: center; width: 80%; margin: 0 auto;">
             </td>
             <td style="text-align: center;">
               <input type="number" class="table-input misc-loss-grid-qty" data-length="${escapeHtml(len)}" step="0.001" min="0" max="${totalAvailable}" placeholder="0.00" style="text-align: center; width: 80%; margin: 0 auto;">
             </td>
           `;
           gridBody.appendChild(tr);
         });
      };
      
      typeSelect.dispatchEvent(new Event("change"));
  }
  
  moInput.oninput = updateFormForMO;
  updateFormForMO(); // run once to initialize
  
  dialog.showModal();
}

// Execute Transfer Arithmetic
function executeStockTransfer(sourceLoc, type, len, amountToMove, moRef, commentVal, destLoc) {
  // 1. Group all entries in sourceLoc by their full profile to find net balances
  const profiles = {};
  
  state.entries.forEach(e => {
    let matchesMO = true;
    if (moRef) {
      matchesMO = (e.mo && e.mo.trim().toLowerCase() === moRef.trim().toLowerCase());
    }
    
    if (e.location === sourceLoc && e.hairType === type && e.length === len && matchesMO) {
      const color = e.color || "";
      const rate = e.rate || 0;
      const mo = e.mo || "-";
      const key = `${color}|${rate}|${mo}`;
      
      if (!profiles[key]) {
        profiles[key] = { color, rate, mo, netAmount: 0 };
      }
      profiles[key].netAmount += (parseFloat(e.amount) || 0);
    }
  });

  // 2. Filter profiles that have a positive net balance
  const availableProfiles = Object.values(profiles).filter(p => p.netAmount > 0.001);

  let remainingToTransfer = amountToMove;
  const today = new Date().toISOString().split('T')[0];

  let baseComment = "";
  if (moRef) {
    baseComment += `[MO: ${moRef}] `;
  }
  if (commentVal) {
    baseComment += `${commentVal} `;
  }

  for (const profile of availableProfiles) {
    if (remainingToTransfer <= 0.001) break;

    const transferQty = Math.min(profile.netAmount, remainingToTransfer);

    const baseId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

    // Create a negative entry for the source location
    const outEntry = {
      id: baseId + "-1-out",
      date: today,
      hairType: type,
      length: len,
      color: profile.color,
      rate: profile.rate,
      amount: -transferQty,
      mo: profile.mo,
      location: sourceLoc,
      comments: (baseComment + `(Transferred ${formatNumber(transferQty)} to ${destLoc})`).trim()
    };
    
    // Create a positive entry for the destination location
    const inEntry = {
      id: baseId + "-2-in",
      date: today,
      hairType: type,
      length: len,
      color: profile.color,
      rate: profile.rate,
      amount: transferQty,
      mo: profile.mo,
      location: destLoc,
      comments: (baseComment + `(Transferred ${formatNumber(transferQty)} from ${sourceLoc})`).trim()
    };

    state.entries.push(outEntry, inEntry);
    
    remainingToTransfer -= transferQty;
  }
}

// Render main ledger table rows
function renderTable() {
  const tableBody = document.getElementById("ledger-table-body");
  const searchQuery = document.getElementById("table-search-input").value.trim().toLowerCase();
  const rowLimitVal = document.getElementById("table-row-limit").value;
  
  let filtered = [...state.entries];
  
  // If the user is searching for an MO Journey, they want to see it chronologically (oldest first).
  // Otherwise, default to newest first.
  const isMOJourneySearch = searchQuery && (searchQuery.startsWith("trial-") || searchQuery.startsWith("mo-"));
  const sortDir = isMOJourneySearch ? 1 : -1;

  filtered.sort((a, b) => {
    // Sort by date. If sortDir is 1 (Ascending), a comes before b if a is older.
    // If sortDir is -1 (Descending), b comes before a if b is newer.
    const dateComp = a.date.localeCompare(b.date) * sortDir;
    if (dateComp !== 0) return dateComp;
    
    // Within the same day, sort by ID to ensure out (-1) comes before in (-2).
    return a.id.localeCompare(b.id) * sortDir;
  });

  if (searchQuery) {
    filtered = filtered.filter(entry => {
      const mo = entry.mo || "";
      const comments = entry.comments || "";
      return entry.hairType.toLowerCase().includes(searchQuery) ||
             entry.length.toLowerCase().includes(searchQuery) ||
             entry.color.toLowerCase().includes(searchQuery) ||
             entry.location.toLowerCase().includes(searchQuery) ||
             mo.toLowerCase().includes(searchQuery) ||
             comments.toLowerCase().includes(searchQuery);
    });
  }

  const matchesCount = filtered.length;
  const badge = document.getElementById("results-count");
  badge.textContent = `${formatNumber(matchesCount)} match${matchesCount === 1 ? '' : 'es'}`;
  
  const limit = rowLimitVal === "all" ? matchesCount : parseInt(rowLimitVal, 10);
  const sliced = filtered.slice(0, limit);

  tableBody.innerHTML = "";

  if (sliced.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="11" class="empty-table-message">
        No matching records found. Use the bottom row to add new stock entries.
      </td>
    `;
    tableBody.appendChild(tr);
    return;
  }

  sliced.forEach(entry => {
    const tr = document.createElement("tr");
    tr.dataset.id = entry.id;

    const rate = parseFloat(entry.rate) || 0;
    const amount = parseFloat(entry.amount) || 0;
    const total = rate * amount;
    const moVal = entry.mo || "-";
    const commentsVal = entry.comments || "-";

    tr.innerHTML = `
      <td class="editable-cell date-cell" data-col="date">${entry.date}</td>
      <td class="editable-cell" data-col="hairType">${escapeHtml(entry.hairType)}</td>
      <td class="editable-cell align-right" data-col="length">${escapeHtml(entry.length)}</td>
      <td class="editable-cell" data-col="color">${escapeHtml(entry.color)}</td>
      <td class="editable-cell align-right rate-cell" data-col="rate">${formatCurrency(rate)}</td>
      <td class="editable-cell align-right amount-cell" data-col="amount">${formatNumber(amount)}</td>
      <td class="align-right total-cell">${formatCurrency(total)}</td>
      <td class="editable-cell mo-cell" data-col="mo">
        ${moVal !== "-" 
          ? `<span class="mo-link badge" style="cursor:pointer; background-color:#e0e7ff; color:#4f46e5; border: 1px solid #c7d2fe;" title="Click to view all events for ${escapeHtml(moVal)}">${escapeHtml(moVal)}</span>` 
          : escapeHtml(moVal)}
      </td>
      <td class="editable-cell" data-col="location">${escapeHtml(entry.location)}</td>
      <td class="editable-cell" data-col="comments" title="${escapeHtml(commentsVal)}">${escapeHtml(commentsVal)}</td>
      <td style="text-align: center;">
        <button class="btn-danger-link delete-row-btn" data-id="${entry.id}" title="Delete Row">
          <span class="material-icons-round" style="font-size: 18px;">delete</span>
        </button>
      </td>
    `;

    tr.querySelectorAll(".editable-cell").forEach(cell => {
      cell.addEventListener("dblclick", (e) => {
        const col = e.currentTarget.dataset.col;
        makeCellEditable(e.currentTarget, entry.id, col);
      });
    });

    const moLink = tr.querySelector(".mo-link");
    if (moLink) {
      moLink.addEventListener("click", (e) => {
        e.stopPropagation();
        const searchInput = document.getElementById("table-search-input");
        searchInput.value = moVal;
        renderTable();
        document.querySelector(".table-section").scrollIntoView({ behavior: 'smooth' });
      });
    }

    tr.querySelector(".delete-row-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      if (confirm("Are you sure you want to delete this stock entry?")) {
        handleDeleteEntry(id);
      }
    });

    tableBody.appendChild(tr);
  });

  renderActiveMOPills();

  const searchInput = document.getElementById("table-search-input");
  const currentSearch = (searchInput ? searchInput.value.trim() : "");
  const isExactMO = state.entries.some(e => e.mo && e.mo.trim().toLowerCase() === currentSearch.toLowerCase() && e.mo !== "-");
  
  if (isExactMO && currentSearch !== "") {
    renderMOFlowDiagram(currentSearch);
  } else {
    const diagramContainer = document.getElementById("mo-flow-diagram-container");
    if (diagramContainer) diagramContainer.style.display = "none";
  }
}

// Render MO Flow Diagram (Timeline)
function renderMOFlowDiagram(moId) {
  const container = document.getElementById("mo-flow-diagram-container");
  if (!container) return;

  const moEntries = state.entries
    .filter(e => e.mo && e.mo.trim().toLowerCase() === moId.toLowerCase())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (moEntries.length === 0) {
    container.style.display = "none";
    return;
  }

  // 1. Parse Events (Transfers, Additions, Deductions) across ALL entries first
  const allEvents = [];
  
  // Clone entries to allow mutation
  let workingEntries = [...moEntries];
  
  // Find transfers
  let i = 0;
  while (i < workingEntries.length) {
    let e1 = workingEntries[i];
    if (!e1) { i++; continue; }
    let matched = false;
    for (let j = i + 1; j < workingEntries.length; j++) {
      let e2 = workingEntries[j];
      if (!e2) continue;
      
      // For a transfer, dates should ideally match, or at least they are the same item and opposite amounts
      let amt1 = parseFloat(e1.amount) || 0;
      let amt2 = parseFloat(e2.amount) || 0;

      if ((amt1 > 0 && amt2 < 0) || (amt1 < 0 && amt2 > 0)) {
        if (Math.abs(amt1) === Math.abs(amt2) &&
            e1.hairType === e2.hairType &&
            e1.length === e2.length &&
            e1.color === e2.color) {
          
          let fromLoc = amt1 < 0 ? e1.location : e2.location;
          let toLoc = amt1 > 0 ? e1.location : e2.location;
          
          // Use the date of the primary event (or e1)
          allEvents.push({
            date: e1.date,
            type: 'transfer',
            from: fromLoc,
            to: toLoc,
            item: `${escapeHtml(e1.hairType)} ${escapeHtml(e1.length)}" ${escapeHtml(e1.color)}`,
            amount: Math.abs(amt1)
          });
          
          workingEntries[i] = null;
          workingEntries[j] = null;
          matched = true;
          break;
        }
      }
    }
    i++;
  }

  // Remaining are additions or deductions
  workingEntries.forEach(e => {
    if (!e) return;
    let amt = parseFloat(e.amount) || 0;
    allEvents.push({
      date: e.date,
      type: amt > 0 ? 'addition' : 'deduction',
      location: e.location,
      item: `${escapeHtml(e.hairType)} ${escapeHtml(e.length)}" ${escapeHtml(e.color)}`,
      amount: Math.abs(amt)
    });
  });

  // Group events by date
  const eventsByDate = {};
  allEvents.forEach(ev => {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  });
  
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a) - new Date(b));

  // 2. Calculate Final Balance for the MO
  const balances = {};
  moEntries.forEach(e => {
    let loc = e.location;
    let item = `${escapeHtml(e.hairType)} ${escapeHtml(e.length)}" ${escapeHtml(e.color)}`;
    let amt = parseFloat(e.amount) || 0;
    
    if (!balances[loc]) balances[loc] = {};
    if (!balances[loc][item]) balances[loc][item] = 0;
    balances[loc][item] += amt;
  });

  // 3. Render HTML
  let html = `
    <div class="mo-timeline-container">
      <div class="mo-timeline-header">
        <span class="material-icons-round" style="color: var(--accent-color);">timeline</span>
        Lifecycle Flow: ${escapeHtml(moId.toUpperCase())}
      </div>
      <div class="mo-timeline">
  `;

  sortedDates.forEach(date => {
    const events = eventsByDate[date];
    if (events.length === 0) return;

    // Date Header
    const dateObj = new Date(date);
    // Formatting correctly, considering timezone offset to avoid previous day bug
    const dateStr = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000)
                     .toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    html += `
      <div class="mo-timeline-date-group">
        <div class="mo-timeline-date-badge">
          <span class="material-icons-round" style="font-size: 16px; color: #64748b;">event</span>
          ${dateStr}
        </div>
      </div>
    `;

    events.forEach(ev => {
      let icon = '', iconColor = '', eventTitle = '', eventDetails = '', amtClass = '', sign = '';
      if (ev.type === 'transfer') {
        icon = 'swap_horiz'; iconColor = '#3b82f6'; eventTitle = 'Transferred';
        eventDetails = `From <strong>${escapeHtml(ev.from)}</strong> <span class="material-icons-round" style="font-size: 14px; vertical-align: middle;">arrow_right_alt</span> <strong>${escapeHtml(ev.to)}</strong>`;
        amtClass = 'mo-qty-transfer'; sign = '';
      } else if (ev.type === 'addition') {
        icon = 'add'; iconColor = '#10b981'; eventTitle = 'Added';
        eventDetails = `To <strong>${escapeHtml(ev.location)}</strong>`;
        amtClass = 'mo-qty-positive'; sign = '+';
      } else if (ev.type === 'deduction') {
        icon = 'remove'; iconColor = '#ef4444'; eventTitle = 'Deducted';
        eventDetails = `From <strong>${escapeHtml(ev.location)}</strong>`;
        amtClass = 'mo-qty-negative'; sign = '-';
      }

      html += `
        <div class="mo-timeline-event">
          <div class="mo-timeline-icon" style="background-color: ${iconColor};">
            <span class="material-icons-round">${icon}</span>
          </div>
          <div class="mo-timeline-content">
            <div class="mo-timeline-item-row" style="border-bottom: none; padding: 0;">
              <div>
                <span style="color:var(--text-muted);">${eventTitle}:</span> 
                <strong>${formatNumber(ev.amount)}</strong> of ${ev.item} <br/>
                <span style="font-size: 12px; color: var(--text-muted);">${eventDetails}</span>
              </div>
              <div class="${amtClass}" style="align-self: center;">${sign}${formatNumber(ev.amount)}</div>
            </div>
          </div>
        </div>
      `;
    });
  });

  // Render Final Balance Node
  let balanceHtml = '';
  Object.keys(balances).forEach(loc => {
    Object.keys(balances[loc]).forEach(item => {
      let amt = balances[loc][item];
      if (Math.abs(amt) > 0.001) { // Ignore floating point zeros
        balanceHtml += `
          <div class="mo-timeline-item-row">
            <div><strong>${escapeHtml(loc)}</strong>: ${item}</div>
            <div style="font-weight: 600;">${formatNumber(amt)}</div>
          </div>
        `;
      }
    });
  });

  if (balanceHtml === '') {
    balanceHtml = `<div class="mo-timeline-item-row"><div style="color:var(--text-muted);">MO fully exhausted/depleted.</div></div>`;
  }

  html += `
        <div class="mo-timeline-event final-status">
          <div class="mo-timeline-icon" style="background-color: #10b981;">
            <span class="material-icons-round">done_all</span>
          </div>
          <div class="mo-timeline-content" style="border-left: 3px solid #10b981; background: #ecfdf5;">
            <div style="color: #047857; font-weight: 600; margin-bottom: 8px;">Current Status</div>
            <div class="mo-timeline-details">
              ${balanceHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  container.style.display = "block";
}


// Render Active MO Pills
function renderActiveMOPills() {
  const container = document.getElementById("active-mo-pills-container");
  if (!container) return;

  // Extract unique active MOs from entries
  const activeMOs = new Set();
  state.entries.forEach(entry => {
    if (entry.mo && entry.mo !== "-" && entry.mo.trim() !== "") {
      activeMOs.add(entry.mo.trim());
    }
  });

  const sortedMOs = Array.from(activeMOs).sort();
  
  if (sortedMOs.length === 0) {
    container.style.display = "none";
    return;
  }
  
  container.style.display = "flex";
  container.innerHTML = "";

  const searchInput = document.getElementById("table-search-input");
  const currentSearch = (searchInput ? searchInput.value.trim().toLowerCase() : "");
  let isMoFilterActive = false;

  sortedMOs.forEach(mo => {
    const pill = document.createElement("div");
    const isActive = currentSearch === mo.toLowerCase();
    if (isActive) isMoFilterActive = true;
    
    pill.className = `active-mo-pill ${isActive ? 'active' : ''}`;
    pill.innerHTML = `
      <span class="material-icons-round" style="font-size: 14px;">label</span>
      ${escapeHtml(mo)}
    `;
    
    pill.addEventListener("click", () => {
      if (isActive) {
        // Toggle off
        searchInput.value = "";
      } else {
        // Toggle on
        searchInput.value = mo;
      }
      renderTable();
    });
    
    container.appendChild(pill);
  });
  
  // Add clear filter pill if there's an active MO filter
  if (isMoFilterActive) {
    const clearPill = document.createElement("div");
    clearPill.className = "active-mo-pill-clear";
    clearPill.innerHTML = `
      <span class="material-icons-round" style="font-size: 14px;">close</span>
      Clear Filter
    `;
    clearPill.addEventListener("click", () => {
      searchInput.value = "";
      renderTable();
    });
    container.appendChild(clearPill);
  }
}


// Render Suppliers Directory (Purchase view sidebar)
function renderSuppliers() {
  const container = document.getElementById("supplier-list-container");
  if (!container) return;

  if (state.suppliers.length === 0) {
    container.innerHTML = '<div class="no-supplier-message">No suppliers found. Use the form above to add one.</div>';
    return;
  }

  container.innerHTML = "";
  const sorted = [...state.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  
  if (state.suppliers.length > 0 && (!state.currentSupplierId || !state.suppliers.find(s => s.id === state.currentSupplierId))) {
    state.currentSupplierId = sorted[0].id;
  }

  sorted.forEach(s => {
    const card = document.createElement("div");
    card.className = `supplier-card ${s.id === state.currentSupplierId ? 'active' : ''}`;
    
    card.innerHTML = `
      <span class="supplier-card-name">${escapeHtml(s.name)}</span>
      <span class="supplier-card-contact">${escapeHtml(s.contact)}</span>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".supplier-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      
      state.currentSupplierId = s.id;
      renderSupplierDetails();
    });

    container.appendChild(card);
  });
}

// Render Active Supplier details & Purchase form
function renderSupplierDetails() {
  const emptyState = document.getElementById("no-supplier-selected-state");
  const activeState = document.getElementById("supplier-active-state");
  if (!emptyState || !activeState) return;

  const supplier = state.suppliers.find(s => s.id === state.currentSupplierId);

  if (!supplier) {
    emptyState.style.display = "flex";
    activeState.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  activeState.style.display = "block";

  document.getElementById("active-supplier-name").textContent = supplier.name;
  
  // Populate Price Lists
  const plSelect = document.getElementById("purchase-price-list");
  if (plSelect) {
    plSelect.innerHTML = "";
    if (supplier.priceLists && supplier.priceLists.length > 0) {
      supplier.priceLists.forEach(pl => {
        const option = document.createElement("option");
        option.value = pl.id;
        option.textContent = pl.name;
        plSelect.appendChild(option);
      });
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- No Price Lists --";
      plSelect.appendChild(option);
    }
  }

  // Reset form
  document.getElementById("new-purchase-entry-form").reset();
  renderPurchaseGrid();
}

function renderPurchaseGrid() {
  const plSelect = document.getElementById("purchase-price-list");
  const gridBody = document.getElementById("purchase-grid-body");
  const grandTotalEl = document.getElementById("purchase-grand-total");
  
  if (!plSelect || !gridBody || !grandTotalEl) return;
  
  gridBody.innerHTML = "";
  grandTotalEl.textContent = "₹0";
  
  const supplier = state.suppliers.find(s => s.id === state.currentSupplierId);
  if (!supplier || !supplier.priceLists || supplier.priceLists.length === 0) {
    gridBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No Price Lists found for this supplier.</td></tr>`;
    return;
  }
  
  const selectedPl = supplier.priceLists.find(pl => pl.id === plSelect.value) || supplier.priceLists[0];
  if (!selectedPl || !selectedPl.rates || Object.keys(selectedPl.rates).length === 0) {
    gridBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No rates defined in this price list.</td></tr>`;
    return;
  }
  
  const sortedLengths = Object.keys(selectedPl.rates).sort((a, b) => parseFloat(a) - parseFloat(b));
  
  sortedLengths.forEach(length => {
    const rate = parseFloat(selectedPl.rates[length]) || 0;
    
    const tr = document.createElement("tr");
    tr.dataset.length = length;
    tr.dataset.rate = rate;
    
    tr.innerHTML = `
      <td style="text-align: left; padding-left: 1.5rem; font-weight: 500;">${escapeHtml(length)}"</td>
      <td style="text-align: right; padding-right: 1.5rem; color: var(--text-muted);">₹${formatNumber(rate)}</td>
      <td style="text-align: center;">
        <input type="number" class="table-input purchase-grid-qty" data-length="${escapeHtml(length)}" step="0.001" min="0" placeholder="0.00" style="text-align: center; width: 80%; margin: 0 auto;">
      </td>
      <td class="purchase-grid-row-total font-semibold text-gray-700" style="text-align: right; padding-right: 1.5rem;">₹0</td>
    `;
    
    const qtyInput = tr.querySelector(".purchase-grid-qty");
    const totalCell = tr.querySelector(".purchase-grid-row-total");
    
    qtyInput.addEventListener("input", () => {
      const qty = parseFloat(qtyInput.value) || 0;
      const rowTotal = qty * rate;
      totalCell.textContent = `₹${formatNumber(rowTotal)}`;
      updatePurchaseGrandTotal();
    });
    
    gridBody.appendChild(tr);
  });
}

function updatePurchaseGrandTotal() {
  const gridBody = document.getElementById("purchase-grid-body");
  const grandTotalEl = document.getElementById("purchase-grand-total");
  if (!gridBody || !grandTotalEl) return;
  
  let grandTotal = 0;
  const rows = gridBody.querySelectorAll("tr[data-length]");
  
  rows.forEach(row => {
    const rate = parseFloat(row.dataset.rate) || 0;
    const qtyInput = row.querySelector(".purchase-grid-qty");
    if (qtyInput) {
      const qty = parseFloat(qtyInput.value) || 0;
      grandTotal += (rate * qty);
    }
  });
  
  grandTotalEl.textContent = `₹${formatNumber(grandTotal)}`;
}

function handleNewPurchaseEntry(e) {
  e.preventDefault();
  
  const supplier = state.suppliers.find(s => s.id === state.currentSupplierId);
  if (!supplier) return;
  
  const typeVal = document.getElementById("purchase-hair-type").value.trim();
  const colorVal = document.getElementById("purchase-color").value.trim();
  const commentsVal = document.getElementById("purchase-comments").value.trim();
  
  if (!typeVal || !colorVal) {
    showToast("Please provide Hair Type and Color.", "error");
    return;
  }

  const dateObj = new Date();
  const dateStr = String(dateObj.getDate()).padStart(2, '0') + String(dateObj.getMonth() + 1).padStart(2, '0') + String(dateObj.getFullYear()).slice(-2);
  const uniqueNum = Math.floor(1000 + Math.random() * 9000);
  const poNumber = `${dateStr}-${supplier.shortCode}-${uniqueNum}`;

  const gridBody = document.getElementById("purchase-grid-body");
  const rows = gridBody.querySelectorAll("tr[data-length]");
  let addedCount = 0;
  let totalQty = 0;

  rows.forEach(row => {
    const lengthVal = row.dataset.length;
    const rateVal = parseFloat(row.dataset.rate) || 0;
    const qtyInput = row.querySelector(".purchase-grid-qty");
    
    if (qtyInput) {
      const qtyVal = parseFloat(qtyInput.value) || 0;
      if (qtyVal > 0) {
        const newEntry = {
          id: Date.now().toString() + "-" + lengthVal,
          date: new Date().toISOString().split('T')[0],
          hairType: typeVal,
          length: lengthVal,
          color: colorVal,
          rate: rateVal,
          amount: qtyVal,
          mo: poNumber,
          location: "INH-in", 
          comments: commentsVal || `Purchased from ${supplier.name}`
        };
        state.entries.push(newEntry);
        addedCount++;
        totalQty += qtyVal;
      }
    }
  });

  if (addedCount === 0) {
    showToast("Please enter a quantity for at least one length.", "error");
    return;
  }

  saveData();

  document.getElementById("new-purchase-entry-form").reset();
  renderPurchaseGrid();
  
  showToast(`Successfully purchased ${formatNumber(totalQty)} kg across ${addedCount} lengths!`, "success");
  document.querySelector('.tab-btn[data-target="view-ledger"]')?.click();
}
// Add Attribute Preset Value
function addPresetValue(attribute, value) {
  if (!state.presets[attribute]) {
    state.presets[attribute] = [];
  }
  
  const lowerVal = value.toLowerCase();
  const exists = state.presets[attribute].some(v => v.toLowerCase() === lowerVal);
  
  if (exists) {
    showToast(`"${value}" is already in the presets list.`, "error");
    return;
  }
  
  state.presets[attribute].push(value);
  savePresets();
  renderPresetLists();
  updateDatalist();
  showToast(`Added "${value}" to presets.`, "success");
}

// Delete Attribute Preset Value
function deletePresetValue(attribute, value) {
  const index = state.presets[attribute].indexOf(value);
  if (index !== -1) {
    state.presets[attribute].splice(index, 1);
    savePresets();
    renderPresetLists();
    updateDatalist();
    showToast(`Removed "${value}" from presets.`, "success");
  }
}

// Render Lists in Attributes Tab View
function renderPresetLists() {
  const attributes = ["hairType", "length", "color", "location"];
  
  attributes.forEach(attr => {
    const listContainer = document.getElementById(`preset-list-${attr}`);
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    const values = state.presets[attr] || [];
    
    // Sort logically
    const sorted = [...values].sort((a, b) => {
      if (attr === "length") {
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      }
      return a.localeCompare(b);
    });
    
    if (sorted.length === 0) {
      listContainer.innerHTML = '<div class="no-supplier-message" style="padding: 12px 0;">No presets defined.</div>';
      return;
    }
    
    sorted.forEach(val => {
      const tag = document.createElement("div");
      tag.className = "preset-tag";
      tag.innerHTML = `
        <span>${escapeHtml(val)}</span>
        <button type="button" class="delete-preset-btn" title="Delete Preset">&times;</button>
      `;
      
      // Attach delete click
      tag.querySelector(".delete-preset-btn").addEventListener("click", () => {
        if (confirm(`Remove "${val}" from presets? (This will not affect existing stock ledger records)`)) {
          deletePresetValue(attr, val);
        }
      });
      
      listContainer.appendChild(tag);
    });
  });
}

// Toast Notifications
function showToast(message, type = "success") {
  const toast = document.getElementById("notification-toast");
  const msgSpan = document.getElementById("toast-message");
  
  msgSpan.textContent = message;
  toast.className = `toast show ${type}`;
  
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

// Utility formatting functions
function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(val);
}

function formatNumber(val) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3
  }).format(val);
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// CSV Export Logic
function exportCSV() {
  if (state.entries.length === 0) {
    showToast("No data to export.", "error");
    return;
  }

  const headers = ["Date", "Hair Type", "Length", "Color", "Rate", "Amount", "MO", "Location", "Comments"];
  const rows = state.entries.map(e => [
    e.date,
    `"${e.hairType.replace(/"/g, '""')}"`,
    `"${e.length.replace(/"/g, '""')}"`,
    `"${e.color.replace(/"/g, '""')}"`,
    e.rate,
    e.amount,
    `"${(e.mo || "").replace(/"/g, '""')}"`,
    `"${e.location.replace(/"/g, '""')}"`,
    `"${(e.comments || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `hair_stock_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV Exported successfully!", "success");
}

// CSV Import Logic
function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      showToast("CSV file is empty or only contains headers.", "error");
      return;
    }

    const headerLine = lines[0].toLowerCase();
    if (!headerLine.includes("hair type") || !headerLine.includes("length") || !headerLine.includes("rate")) {
      showToast("Invalid CSV headers. Must contain: Date, Hair Type, Length, Color, Rate, Amount, MO, Location, Comments.", "error");
      return;
    }

    const newEntries = [];
    const importTime = Date.now();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      
      const vals = matches.map(v => {
        let clean = v.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) {
          clean = clean.substring(1, clean.length - 1).replace(/""/g, '"');
        }
        return clean;
      });

      if (vals.length < 5) continue;

      const dateVal = vals[0] || new Date().toISOString().split('T')[0];
      const hairTypeVal = vals[1] || "Unknown";
      const lengthVal = vals[2] || "0";
      const colorVal = vals[3] || "Natural";
      const rateVal = parseFloat(vals[4]) || 0;
      const amountVal = parseFloat(vals[5]) || 0;
      const moVal = vals.length > 6 ? vals[6] : "-";
      const locationVal = vals.length > 7 ? vals[7] : "-";
      const commentsVal = vals.length > 8 ? vals[8] : "-";

      newEntries.push({
        id: (importTime + i).toString(),
        date: dateVal,
        hairType: hairTypeVal,
        length: lengthVal,
        color: colorVal,
        rate: rateVal,
        amount: amountVal,
        mo: moVal || "-",
        location: locationVal || "-",
        comments: commentsVal || "-"
      });
    }

    if (newEntries.length === 0) {
      showToast("No valid rows imported.", "error");
      return;
    }

    if (confirm(`Do you want to append ${newEntries.length} entries to your ledger? (Click Cancel to overwrite)`)) {
      state.entries = [...state.entries, ...newEntries];
    } else if (confirm("Overwrite ledger with CSV? This deletes current entries.")) {
      state.entries = newEntries;
    } else {
      event.target.value = "";
      return;
    }

    saveData();
    renderApp();
    showToast(`Successfully imported ${newEntries.length} entries!`, "success");
    event.target.value = "";
  };
  
  reader.readAsText(file);
}
