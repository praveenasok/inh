const LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

const DEFAULT_SUPPLIERS = [
  { id: 'sup-1', name: 'Venkatesh Hair Impex', shortCode: 'VNK', contactPerson: 'M. Venkatesh', phone1: '9845012345', address: '12 GNT Road, Madhavaram', state: 'Tamil Nadu', pinCode: '600060', priceLists: [{ id: 'pl-default', name: 'Default Price List', rates: { 16: 45000, 18: 52000, 20: 60000, 22: 68000 } }] },
  { id: 'sup-2', name: 'Royal Indian Hair', shortCode: 'RIH', contactPerson: 'S. Rajan', phone1: '9444098765', address: '45 NH-5, Nellore Bypass', state: 'Andhra Pradesh', pinCode: '524002', priceLists: [{ id: 'pl-default', name: 'Default Price List', rates: { 18: 54000, 20: 62000, 22: 70000, 24: 78000 } }] },
  { id: 'sup-3', name: 'Arun Hair Exports', shortCode: 'AHE', contactPerson: 'Arun Kumar', phone1: '9884055667', address: '88 Trunk Road, Eluru', state: 'Andhra Pradesh', pinCode: '534001', priceLists: [{ id: 'pl-default', name: 'Default Price List', rates: { 16: 43000, 18: 50000, 20: 58000, 22: 66000 } }] }
];

let suppliers = [];
let selectedSupplierId = null;
let selectedPriceListId = null;
let editId = null;

function loadMasterSuppliers() {
  const saved = localStorage.getItem('inv_suppliers');
  suppliers = saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
  
  // Data Migration
  suppliers = suppliers.map(sup => {
    if (sup.rates && !sup.priceLists) {
      sup.priceLists = [{ id: 'pl-default', name: 'Default Price List', rates: sup.rates }];
      delete sup.rates;
    } else if (!sup.priceLists) {
      sup.priceLists = [{ id: 'pl-default', name: 'Default Price List', rates: {} }];
    }
    return sup;
  });
  
  if (suppliers.length > 0 && !selectedSupplierId) {
    selectedSupplierId = suppliers[0].id;
    if (suppliers[0].priceLists.length > 0) {
      selectedPriceListId = suppliers[0].priceLists[0].id;
    }
  }
  
  renderSupplierGrid();
}

function saveMasterSuppliers() {
  localStorage.setItem('inv_suppliers', JSON.stringify(suppliers));
  renderSupplierGrid();
}

function renderSupplierGrid() {
  const grid = document.getElementById('supplier-grid');
  if (!grid) return;
  grid.innerHTML = '';
  document.getElementById('active-vendors-count').innerText = suppliers.length;
  
  suppliers.forEach(sup => {
    const isSelected = selectedSupplierId === sup.id;
    const card = document.createElement('div');
    card.className = `p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-sm relative group ${isSelected ? 'border-[#1A1A1A] bg-amber-50/15 shadow-sm' : 'border-gray-200 bg-white'}`;
    card.onclick = () => {
      selectedSupplierId = sup.id;
      if (sup.priceLists && sup.priceLists.length > 0) {
        selectedPriceListId = sup.priceLists[0].id;
      }
      renderSupplierGrid();
      renderPriceMatrix();
    };
    
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-extrabold text-gray-800 text-base">${sup.name}</h4>
            <span class="mt-1 inline-block px-2.5 py-0.5 bg-gray-100 border text-gray-600 font-mono font-bold text-[10px] rounded-full uppercase tracking-wider">
              Code: ${sup.shortCode}
            </span>
          </div>
          <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="event.stopPropagation(); handleEditSupplier('${sup.id}')" class="text-gray-500 hover:text-gray-800 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg material-icons-round" style="font-size:14px">edit</button>
            <button onclick="event.stopPropagation(); handleDeleteSupplier('${sup.id}')" class="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg material-icons-round" style="font-size:14px">delete</button>
          </div>
        </div>
        <div class="mt-3 space-y-1 text-xs text-gray-500">
          <div class="flex items-center gap-1.5">
            <span class="material-icons-round text-gray-400" style="font-size:13px">person</span>
            <span>Contact: <strong>${sup.contactPerson || 'N/A'}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="material-icons-round text-gray-400" style="font-size:13px">phone</span>
            <span class="font-mono">${sup.phone1} ${sup.phone2 ? '/ ' + sup.phone2 : ''}</span>
          </div>
          ${sup.address ? `
          <div class="flex items-start gap-1.5">
            <span class="material-icons-round text-gray-400 mt-0.5 flex-shrink-0" style="font-size:13px">place</span>
            <span class="line-clamp-1">${sup.address}, ${sup.state || ''} - ${sup.pinCode || ''}</span>
          </div>` : ''}
        </div>
      </div>
      <div class="mt-4 border-t pt-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <span>Rate Mapping:</span>
        <span class="text-[#1A1A1A] font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          ${sup.priceLists ? sup.priceLists.length : 0} Lists
        </span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function handleEditSupplier(id) {
  const sup = suppliers.find(s => s.id === id);
  if (!sup) return;
  editId = sup.id;
  document.getElementById('sup-name').value = sup.name || '';
  document.getElementById('sup-shortCode').value = sup.shortCode || '';
  document.getElementById('sup-contactPerson').value = sup.contactPerson || '';
  document.getElementById('sup-phone1').value = sup.phone1 || '';
  document.getElementById('sup-phone2').value = sup.phone2 || '';
  document.getElementById('sup-address').value = sup.address || '';
  document.getElementById('sup-state').value = sup.state || '';
  document.getElementById('sup-pinCode').value = sup.pinCode || '';
  document.getElementById('sup-geoLocation').value = sup.geoLocation || '';
  
  document.getElementById('sup-form-title').innerText = 'Modify Supplier Profile';
  document.getElementById('sup-btn-cancel').style.display = 'flex';
  document.getElementById('sup-btn-submit-text').innerText = 'Update Profile';
  document.getElementById('sup-btn-submit').classList.remove('w-full');
  document.getElementById('sup-btn-submit').classList.add('w-2/3');
}

function handleDeleteSupplier(id) {
  if (confirm('Are you sure you want to delete this supplier? Historical purchase invoices referencing this supplier will retain their logs, but their pricing maps will be removed.')) {
    suppliers = suppliers.filter(s => s.id !== id);
    if (selectedSupplierId === id) selectedSupplierId = null;
    saveMasterSuppliers();
    renderPriceMatrix();
  }
}

function resetSupForm() {
  editId = null;
  document.getElementById('sup-form').reset();
  document.getElementById('sup-form-title').innerText = 'Register New Supplier';
  document.getElementById('sup-btn-cancel').style.display = 'none';
  document.getElementById('sup-btn-submit-text').innerText = 'Add Supplier';
  document.getElementById('sup-btn-submit').classList.remove('w-2/3');
  document.getElementById('sup-btn-submit').classList.add('w-full');
}

document.addEventListener('DOMContentLoaded', () => {
  const supForm = document.getElementById('sup-form');
  if (supForm) {
    supForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('sup-name').value;
      const shortCode = document.getElementById('sup-shortCode').value.trim().toUpperCase().slice(0, 3);
      const contactPerson = document.getElementById('sup-contactPerson').value;
      const phone1 = document.getElementById('sup-phone1').value;
      const phone2 = document.getElementById('sup-phone2').value;
      const address = document.getElementById('sup-address').value;
      const state = document.getElementById('sup-state').value;
      const pinCode = document.getElementById('sup-pinCode').value;
      const geoLocation = document.getElementById('sup-geoLocation').value;

      if (!name.trim() || !shortCode.trim() || !phone1.trim()) {
        alert('Please fill out Name, Short Code, and primary Phone.');
        return;
      }

      if (editId) {
        suppliers = suppliers.map(s => {
          if (s.id === editId) {
            return { ...s, name, shortCode, contactPerson, phone1, phone2, address, state, pinCode, geoLocation };
          }
          return s;
        });
        alert('Supplier updated successfully!');
      } else {
        suppliers.push({
          id: `sup-${Date.now()}`,
          name, shortCode, contactPerson, phone1, phone2, address, state, pinCode, geoLocation,
          priceLists: [{ id: `pl-${Date.now()}`, name: 'Default Price List', rates: {} }]
        });
        alert('Supplier added successfully!');
      }
      saveMasterSuppliers();
      resetSupForm();
    });
  }

  document.getElementById('sup-btn-cancel')?.addEventListener('click', resetSupForm);
  document.getElementById('btn-save-rates')?.addEventListener('click', handleSaveRatesMatrix);
  
  document.getElementById('price-list-select')?.addEventListener('change', (e) => {
    selectedPriceListId = e.target.value;
    renderPriceMatrix();
  });
  
  document.getElementById('btn-add-price-list')?.addEventListener('click', handleAddPriceList);
  document.getElementById('btn-delete-price-list')?.addEventListener('click', handleDeletePriceList);
  
  loadMasterSuppliers();
  renderPriceMatrix();
});

function renderPriceMatrix() {
  const container = document.getElementById('price-matrix-container');
  if (!container) return;
  const sup = suppliers.find(s => s.id === selectedSupplierId);
  if (!sup || !sup.priceLists || sup.priceLists.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  document.getElementById('matrix-supplier-name').innerText = sup.name;
  
  const select = document.getElementById('price-list-select');
  select.innerHTML = '';
  sup.priceLists.forEach(pl => {
    const opt = document.createElement('option');
    opt.value = pl.id;
    opt.innerText = pl.name;
    if (pl.id === selectedPriceListId) opt.selected = true;
    select.appendChild(opt);
  });
  
  // If no selected list matches, default to the first one
  if (!sup.priceLists.find(pl => pl.id === selectedPriceListId)) {
    selectedPriceListId = sup.priceLists[0].id;
    select.value = selectedPriceListId;
  }
  
  const activePriceList = sup.priceLists.find(pl => pl.id === selectedPriceListId);
  
  const list = document.getElementById('price-matrix-list');
  list.innerHTML = '';
  
  LENGTHS.forEach(len => {
    const val = (activePriceList.rates && activePriceList.rates[len]) ? activePriceList.rates[len] : '';
    const div = document.createElement('div');
    div.className = "flex items-center justify-between p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus-within:border-blue-400 hover:bg-gray-50 transition-colors gap-4";
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="font-mono font-extrabold text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100/50">
          ${len}" Size
        </span>
        <span class="text-xs text-gray-400 font-semibold hidden sm:inline">Procurement Rate Matrix</span>
      </div>
      <div class="relative w-44">
        <input type="number" data-len="${len}" value="${val}" placeholder="--" class="rate-input w-full pl-3 pr-12 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-right" />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">₹/kg</span>
      </div>
    `;
    list.appendChild(div);
  });
}

function handleSaveRatesMatrix() {
  if (!selectedSupplierId) return;
  const inputs = document.querySelectorAll('.rate-input');
  const parsedRates = {};
  inputs.forEach(input => {
    const len = Number(input.getAttribute('data-len'));
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      parsedRates[len] = val;
    }
  });

  suppliers = suppliers.map(s => {
    if (s.id === selectedSupplierId) {
      const updatedPriceLists = s.priceLists.map(pl => {
        if (pl.id === selectedPriceListId) {
          return { ...pl, rates: parsedRates };
        }
        return pl;
      });
      return { ...s, priceLists: updatedPriceLists };
    }
    return s;
  });
  saveMasterSuppliers();
  alert(`Rates saved successfully!`);
}

function handleAddPriceList() {
  if (!selectedSupplierId) return;
  const name = prompt("Enter a name for the new Price List (e.g. 'Premium Quality'):");
  if (!name || !name.trim()) return;
  
  suppliers = suppliers.map(s => {
    if (s.id === selectedSupplierId) {
      const newList = {
        id: `pl-${Date.now()}`,
        name: name.trim(),
        rates: {}
      };
      s.priceLists.push(newList);
      selectedPriceListId = newList.id;
    }
    return s;
  });
  saveMasterSuppliers();
  renderPriceMatrix();
}

function handleDeletePriceList() {
  if (!selectedSupplierId || !selectedPriceListId) return;
  
  const sup = suppliers.find(s => s.id === selectedSupplierId);
  if (sup && sup.priceLists.length <= 1) {
    alert("You cannot delete the last remaining price list.");
    return;
  }
  
  if (confirm("Are you sure you want to delete this price list?")) {
    suppliers = suppliers.map(s => {
      if (s.id === selectedSupplierId) {
        s.priceLists = s.priceLists.filter(pl => pl.id !== selectedPriceListId);
        selectedPriceListId = s.priceLists[0].id;
      }
      return s;
    });
    saveMasterSuppliers();
    renderPriceMatrix();
  }
}

// Ensure the Suppliers logic runs when the tab is switched
document.getElementById('tab-suppliers')?.addEventListener('click', () => {
  if(suppliers.length === 0) loadMasterSuppliers();
});
