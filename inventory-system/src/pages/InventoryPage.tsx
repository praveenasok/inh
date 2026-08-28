import { useState, useEffect } from 'react';
import {
  Plus, Trash2, ArrowLeftRight, History, MapPin, Layers,
  AlertCircle, CheckCircle2, Search, Building2,
  FilePlus2, ChevronRight, X, Edit3, Save
} from 'lucide-react';

// --- Interfaces ---
interface ProductType {
  id: string;
  name: string;
  uom: string;
  lengths: number[];
  description: string;
}

interface LocationItem {
  id: string;
  name: string;
  description: string;
}

interface StockItem {
  productId: string;
  length: number;
  locationId: string;
  quantity: number;
}

interface TransferLog {
  id: string;
  timestamp: string;
  productId: string;
  length: number;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  notes: string;
}

const STANDARD_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];
const STANDARD_UOMS = ['kg', 'grams', 'bundles', 'pieces', 'meters'];

// --- Seed Data ---
const DEFAULT_PRODUCTS: ProductType[] = [
  { id: 'prod-1', name: 'Non-Remy 1x1 Hairs', uom: 'kg', lengths: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], description: 'Standard raw Non-Remy 1x1 ratio hairs' },
  { id: 'prod-2', name: 'Machine Remy Hairs', uom: 'kg', lengths: [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34], description: 'Premium Remy single-donor bulk hairs' },
  { id: 'prod-3', name: 'Remy Machine Weft', uom: 'bundles', lengths: [14, 16, 18, 20, 22, 24, 26, 28], description: 'Double weft machine-made hair bundles (100g)' },
  { id: 'prod-4', name: 'Keratin Tips', uom: 'pieces', lengths: [16, 18, 20, 22, 24], description: 'Standard Italian Keratin bonded glue tips' }
];

const DEFAULT_LOCATIONS: LocationItem[] = [
  { id: 'loc-1', name: 'Raw Hair Room', description: 'Primary entry room for raw material bundles' },
  { id: 'loc-2', name: 'WIP Processing Area', description: 'Area for segregation, washing, and hackling' },
  { id: 'loc-3', name: 'Semi-Finished Room', description: 'Storage for graded bulks prior to wefting/bonding' },
  { id: 'loc-4', name: 'Finished Goods Room', description: 'Final packaged warehouse for order fulfillment' },
  { id: 'loc-wastage', name: 'Wastage / Weight Loss', description: 'System location for tracking material lost during transfers' }
];

const DEFAULT_STOCK: StockItem[] = [
  { productId: 'prod-1', length: 20, locationId: 'loc-1', quantity: 150.5 },
  { productId: 'prod-1', length: 22, locationId: 'loc-1', quantity: 120.0 },
  { productId: 'prod-2', length: 18, locationId: 'loc-3', quantity: 45.2 },
  { productId: 'prod-3', length: 20, locationId: 'loc-4', quantity: 300 },
  { productId: 'prod-4', length: 22, locationId: 'loc-4', quantity: 1500 }
];

const DEFAULT_LOGS: TransferLog[] = [
  { id: 'tlog-1', timestamp: new Date(Date.now() - 86400000).toISOString(), productId: 'prod-1', length: 20, quantity: 20, fromLocationId: 'loc-1', toLocationId: 'loc-2', notes: 'Issued for Segregation Run MO-102' },
  { id: 'tlog-2', timestamp: new Date(Date.now() - 36000000).toISOString(), productId: 'prod-3', length: 20, quantity: 50, fromLocationId: 'loc-3', toLocationId: 'loc-4', notes: 'Received from Weft Room production' }
];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'ledger' | 'transfer' | 'products' | 'locations' | 'history'>('ledger');

  // --- LocalStorage Hooks ---
  const [products, setProducts] = useState<ProductType[]>(() => {
    const saved = localStorage.getItem('inv_products');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  });

  const [locations, setLocations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem('inv_locations');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('inv_stock');
    return saved ? JSON.parse(saved) : DEFAULT_STOCK;
  });

  const [logs, setLogs] = useState<TransferLog[]>(() => {
    const saved = localStorage.getItem('inv_logs');
    return saved ? JSON.parse(saved) : DEFAULT_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('inv_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('inv_locations', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('inv_stock', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('inv_logs', JSON.stringify(logs));
  }, [logs]);

  // --- Search & Filters ---
  const [searchLedger, setSearchLedger] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');

  // --- Modals & Creation States ---
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);

  // 1. New Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdUom, setNewProdUom] = useState('kg');
  const [newProdLengths, setNewProdLengths] = useState<number[]>([]);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  // 2. New Location Form
  const [newLocName, setNewLocName] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');

  // 3. Inward Stock Form
  const [inwardProductId, setInwardProductId] = useState('');
  const [inwardLength, setInwardLength] = useState<number | ''>('');
  const [inwardLocationId, setInwardLocationId] = useState('');
  const [inwardQty, setInwardQty] = useState<number | ''>('');
  const [inwardNotes, setInwardNotes] = useState('');

  // 4. Transfer Form
  const [transferProductId, setTransferProductId] = useState('');
  const [transferLength, setTransferLength] = useState<number | ''>('');
  const [transferFromLoc, setTransferFromLoc] = useState('');
  const [transferToLoc, setTransferToLoc] = useState('');
  const [transferQty, setTransferQty] = useState<number | ''>('');
  const [transferWastage, setTransferWastage] = useState<number | ''>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Dynamic available qty for transfer
  const getAvailableStockQty = (prodId: string, len: number, locId: string): number => {
    const item = stock.find(s => s.productId === prodId && s.length === len && s.locationId === locId);
    return item ? item.quantity : 0;
  };

  const selectedTransferAvailableQty = getAvailableStockQty(
    transferProductId,
    Number(transferLength),
    transferFromLoc
  );

  // --- Handlers ---
  const handleStartEditProduct = (prod: ProductType) => {
    setEditingProdId(prod.id);
    setNewProdName(prod.name);
    setNewProdUom(prod.uom);
    setNewProdLengths(prod.lengths);
    setNewProdDesc(prod.description || '');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    if (editingProdId) {
      setProducts(prev => prev.map(p => {
        if (p.id === editingProdId) {
          return {
            ...p,
            name: newProdName,
            uom: newProdUom,
            lengths: newProdLengths.sort((a, b) => a - b),
            description: newProdDesc
          };
        }
        return p;
      }));
      setEditingProdId(null);
      alert('Product type updated successfully!');
    } else {
      const newProd: ProductType = {
        id: `prod-${Date.now()}`,
        name: newProdName,
        uom: newProdUom,
        lengths: newProdLengths.sort((a, b) => a - b),
        description: newProdDesc
      };
      setProducts(prev => [...prev, newProd]);
      alert('Product type added successfully!');
    }

    setNewProdName('');
    setNewProdLengths([]);
    setNewProdDesc('');
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product type? This will not remove existing stock logs but might cause display inconsistencies.')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const newLoc: LocationItem = {
      id: `loc-${Date.now()}`,
      name: newLocName,
      description: newLocDesc
    };

    setLocations(prev => [...prev, newLoc]);
    setNewLocName('');
    setNewLocDesc('');
    alert('Inventory location added successfully!');
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm('Are you sure you want to delete this location? Ensure no stock is stored in this location before deleting.')) {
      setLocations(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleInwardStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardProductId || inwardLength === '' || !inwardLocationId || !inwardQty || Number(inwardQty) <= 0) {
      alert('Please fill out all fields correctly.');
      return;
    }

    const qty = Number(inwardQty);
    const len = Number(inwardLength);

    // Update Stock balance
    setStock(prev => {
      const matchIndex = prev.findIndex(
        s => s.productId === inwardProductId && s.length === len && s.locationId === inwardLocationId
      );

      if (matchIndex > -1) {
        const copy = [...prev];
        copy[matchIndex] = { ...copy[matchIndex], quantity: copy[matchIndex].quantity + qty };
        return copy;
      } else {
        return [...prev, { productId: inwardProductId, length: len, locationId: inwardLocationId, quantity: qty }];
      }
    });

    // Create Audit Log
    const newLog: TransferLog = {
      id: `tlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId: inwardProductId,
      length: len,
      quantity: qty,
      fromLocationId: '', // Empty means Inward Source
      toLocationId: inwardLocationId,
      notes: inwardNotes || 'Stock Inward / Initialization'
    };

    setLogs(prev => [newLog, ...prev]);

    // Reset Form & Close Modal
    setInwardProductId('');
    setInwardLength('');
    setInwardLocationId('');
    setInwardQty('');
    setInwardNotes('');
    setIsInwardModalOpen(false);
    alert('Stock successfully added!');
  };

  const handleTransferStock = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess(false);

    if (!transferProductId || transferLength === '' || !transferFromLoc || !transferToLoc || !transferQty || Number(transferQty) <= 0) {
      setTransferError('Please complete all form fields.');
      return;
    }

    if (transferFromLoc === transferToLoc) {
      setTransferError('Source and Destination locations must be different.');
      return;
    }

    const qty = Number(transferQty);
    const wQty = Number(transferWastage) || 0;
    const len = Number(transferLength);
    const totalQtyToDeduct = qty + wQty;
    const currentAvailable = getAvailableStockQty(transferProductId, len, transferFromLoc);

    if (totalQtyToDeduct > currentAvailable) {
      setTransferError(`Insufficient stock in source location for Transfer + Wastage. Available: ${currentAvailable}`);
      return;
    }

    // Perform balance transfer
    setStock(prev => {
      // 1. Deduct from source
      let temp = prev.map(s => {
        if (s.productId === transferProductId && s.length === len && s.locationId === transferFromLoc) {
          return { ...s, quantity: Math.max(0, s.quantity - totalQtyToDeduct) };
        }
        return s;
      });

      // 2. Add to destination
      const destIndex = temp.findIndex(
        s => s.productId === transferProductId && s.length === len && s.locationId === transferToLoc
      );

      if (destIndex > -1) {
        temp[destIndex] = { ...temp[destIndex], quantity: temp[destIndex].quantity + qty };
      } else {
        temp.push({ productId: transferProductId, length: len, locationId: transferToLoc, quantity: qty });
      }

      // 3. Add to wastage location if there's wastage
      if (wQty > 0) {
        const wasteIndex = temp.findIndex(
          s => s.productId === transferProductId && s.length === len && s.locationId === 'loc-wastage'
        );
        if (wasteIndex > -1) {
          temp[wasteIndex] = { ...temp[wasteIndex], quantity: temp[wasteIndex].quantity + wQty };
        } else {
          temp.push({ productId: transferProductId, length: len, locationId: 'loc-wastage', quantity: wQty });
        }
      }

      // Filter out zero quantities to keep ledger clean
      return temp.filter(s => s.quantity > 0);
    });

    // Write movement audit log
    const newLog: TransferLog = {
      id: `tlog-${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId: transferProductId,
      length: len,
      quantity: qty,
      fromLocationId: transferFromLoc,
      toLocationId: transferToLoc,
      notes: transferNotes || 'Internal Stock Transfer'
    };

    let logsToAdd = [newLog];

    if (wQty > 0) {
      const wasteLog: TransferLog = {
        id: `tlog-w-${Date.now()}`,
        timestamp: new Date().toISOString(),
        productId: transferProductId,
        length: len,
        quantity: wQty,
        fromLocationId: transferFromLoc,
        toLocationId: 'loc-wastage',
        notes: '[WASTAGE] ' + (transferNotes || 'Weight loss during transfer')
      };
      logsToAdd.push(wasteLog);
    }

    setLogs(prev => [...logsToAdd, ...prev]);

    // Reset Form & Trigger success state
    setTransferQty('');
    setTransferWastage('');
    setTransferNotes('');
    setTransferSuccess(true);
    setTimeout(() => setTransferSuccess(false), 4000);
  };

  const toggleLengthSelection = (len: number) => {
    setNewProdLengths(prev =>
      prev.includes(len) ? prev.filter(l => l !== len) : [...prev, len]
    );
  };

  // --- Calculated Statistics for Dashboard & Cards ---
  const stats = {
    totalWeightKg: stock
      .filter(s => {
        const prod = products.find(p => p.id === s.productId);
        return prod?.uom === 'kg' || prod?.uom === 'grams';
      })
      .reduce((sum, s) => {
        const prod = products.find(p => p.id === s.productId);
        const weightInKg = prod?.uom === 'grams' ? s.quantity / 1000 : s.quantity;
        return sum + weightInKg;
      }, 0),

    totalBundles: stock
      .filter(s => {
        const prod = products.find(p => p.id === s.productId);
        return prod?.uom === 'bundles';
      })
      .reduce((sum, s) => sum + s.quantity, 0),

    totalPieces: stock
      .filter(s => {
        const prod = products.find(p => p.id === s.productId);
        return prod?.uom === 'pieces';
      })
      .reduce((sum, s) => sum + s.quantity, 0),

    activeLocationsCount: locations.length
  };

  // --- Filtering the Live Ledger ---
  const filteredStock = stock.filter(item => {
    const prod = products.find(p => p.id === item.productId);
    const loc = locations.find(l => l.id === item.locationId);

    const matchesSearch =
      (prod?.name.toLowerCase().includes(searchLedger.toLowerCase()) || false) ||
      (prod?.description.toLowerCase().includes(searchLedger.toLowerCase()) || false) ||
      `${item.length}"`.includes(searchLedger);

    const matchesLocation = filterLocation === 'All' || item.locationId === filterLocation;

    return matchesSearch && matchesLocation && prod && loc;
  });

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Hub & Master Ledgers</h1>
          <p className="text-gray-500 text-sm">Unified tracking of raw, WIP, and finished hair stocks across all rooms.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsInwardModalOpen(true)}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} />
            <span>Inward / Initialize Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Hairs Bulk Weight</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.totalWeightKg.toFixed(2)} kg</h3>
            <p className="text-[10px] text-gray-400 mt-1">Sum of KG & Gram products</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Bundles</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.totalBundles} bundles</h3>
            <p className="text-[10px] text-gray-400 mt-1">Weft / processed bundles</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-50 text-green-700 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Pieces</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.totalPieces} pcs</h3>
            <p className="text-[10px] text-gray-400 mt-1">Keratin tips / custom extensions</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Rooms/Locations</p>
            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.activeLocationsCount} Rooms</h3>
            <p className="text-[10px] text-gray-400 mt-1">Tracked physical rooms</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="border-b border-gray-200 flex flex-wrap bg-gray-50/50 p-2 gap-1">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ledger' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Layers size={16} />
            <span>Stock Ledger</span>
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'transfer' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <ArrowLeftRight size={16} />
            <span>Stock Transfer</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'products' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Building2 size={16} />
            <span>Product Types Master</span>
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'locations' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <MapPin size={16} />
            <span>Locations Master</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <History size={16} />
            <span>Transfer History</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* TAB 1: STOCK LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50 p-4 rounded-xl">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by product or length..."
                    value={searchLedger}
                    onChange={e => setSearchLedger(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-gray-800"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Filter Location:</span>
                  <select
                    value={filterLocation}
                    onChange={e => setFilterLocation(e.target.value)}
                    className="w-full sm:w-56 p-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-gray-800 font-medium"
                  >
                    <option value="All">All Locations / Rooms</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Location</th>
                      <th className="px-5 py-3.5 font-bold">Product Name</th>
                      <th className="px-5 py-3.5 font-bold text-center">Length</th>
                      <th className="px-5 py-3.5 font-bold text-right">Quantity</th>
                      <th className="px-5 py-3.5 font-bold text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStock.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      const loc = locations.find(l => l.id === item.locationId);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-gray-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              {loc?.name || 'Unknown Location'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">{prod?.name}</div>
                            <div className="text-xs text-gray-400">{prod?.description}</div>
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-blue-600 bg-blue-50/30">
                            {item.length}"
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-lg text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 font-bold text-xs rounded-full uppercase tracking-wider">
                              {prod?.uom}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStock.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                          <AlertCircle size={28} className="mx-auto mb-2 text-gray-300" />
                          <p className="font-medium text-sm">No stock balances found matching current filters.</p>
                          <p className="text-xs text-gray-400 mt-1">Use "Inward / Initialize Stock" to add inventory.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK TRANSFER */}
          {activeTab === 'transfer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Side */}
              <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                  <ArrowLeftRight className="text-[#1A1A1A]" size={20} />
                  <span>Internal Stock Transfer Operation</span>
                </h3>

                {transferSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
                    <CheckCircle2 size={20} className="text-green-600" />
                    <div>
                      <p className="font-bold text-sm">Transfer Complete!</p>
                      <p className="text-xs">Stocks updated instantly and logged in transfer history.</p>
                    </div>
                  </div>
                )}

                {transferError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
                    <AlertCircle size={20} className="text-red-600" />
                    <p className="font-semibold text-sm">{transferError}</p>
                  </div>
                )}

                <form onSubmit={handleTransferStock} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. Select Product Type</label>
                      <select
                        value={transferProductId}
                        onChange={e => {
                          setTransferProductId(e.target.value);
                          setTransferLength('');
                        }}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                        required
                      >
                        <option value="">-- Choose Product Type --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.uom})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. Length</label>
                      <select
                        value={transferLength}
                        onChange={e => setTransferLength(e.target.value ? Number(e.target.value) : '')}
                        disabled={!transferProductId}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed font-medium font-mono"
                        required
                      >
                        <option value="">-- Choose Length --</option>
                        {transferProductId && products.find(p => p.id === transferProductId)?.lengths.map(len => (
                          <option key={len} value={len}>{len}"</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. Source Location (From)</label>
                      <select
                        value={transferFromLoc}
                        onChange={e => setTransferFromLoc(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                        required
                      >
                        <option value="">-- Choose Source --</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. Destination Location (To)</label>
                      <select
                        value={transferToLoc}
                        onChange={e => setTransferToLoc(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                        required
                      >
                        <option value="">-- Choose Destination --</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock validation checker indicator */}
                  {transferProductId && transferLength !== '' && transferFromLoc && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${selectedTransferAvailableQty > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                      <span className="font-semibold flex items-center gap-1.5">
                        <AlertCircle size={16} />
                        Available Stock in {locations.find(l => l.id === transferFromLoc)?.name}:
                      </span>
                      <span className="font-mono font-black text-lg">
                        {selectedTransferAvailableQty} {products.find(p => p.id === transferProductId)?.uom}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">5. Quantity to Transfer</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={transferQty}
                          onChange={e => setTransferQty(e.target.value ? parseFloat(e.target.value) : '')}
                          disabled={selectedTransferAvailableQty <= 0}
                          className="w-full p-3 border border-gray-200 rounded-xl text-lg font-mono text-center font-bold bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                          required
                        />
                        {transferProductId && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                            {products.find(p => p.id === transferProductId)?.uom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">6. Wastage (Optional)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={transferWastage}
                          onChange={e => setTransferWastage(e.target.value ? parseFloat(e.target.value) : '')}
                          disabled={selectedTransferAvailableQty <= 0}
                          className="w-full p-3 border border-gray-200 rounded-xl text-lg font-mono text-center font-bold bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {transferProductId && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                            {products.find(p => p.id === transferProductId)?.uom}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">7. Transfer Notes / Purpose</label>
                    <textarea
                      placeholder="e.g. Issued to segregate machine wefts..."
                      rows={2}
                      value={transferNotes}
                      onChange={e => setTransferNotes(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={selectedTransferAvailableQty <= 0 || !transferQty || (Number(transferQty) + (Number(transferWastage) || 0)) > selectedTransferAvailableQty}
                    className="w-full py-3.5 bg-[#1A1A1A] hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight size={18} />
                    <span>Execute Internal Transfer</span>
                  </button>
                </form>
              </div>

              {/* Info Card / Quick instructions Side */}
              <div className="lg:col-span-5 bg-gray-50 p-6 rounded-2xl border border-gray-200/60 space-y-5">
                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Transfer Audit Rules</h4>
                <ul className="space-y-3.5 text-xs text-gray-600">
                  <li className="flex gap-2">
                    <span className="text-[#1A1A1A] font-black">✓</span>
                    <span>**ACID Compliance**: Deductions and additions are atomically performed together to prevent stock leakage.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1A1A1A] font-black">✓</span>
                    <span>**Strict Real-time Validation**: You can never transfer more stock than what is currently available in the selected Source Location.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1A1A1A] font-black">✓</span>
                    <span>**Audit Trail Logging**: All completed transfers generate an immediate log in the *Transfer History* register.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#1A1A1A] font-black">✓</span>
                    <span>**Unit Synchronization**: Quantities are computed using the matching Unit of Measurement (e.g. kgs/bundles) defined in the Product Master.</span>
                  </li>
                </ul>

                <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={14} className="text-amber-500" />
                    Quick Rooms Reference
                  </h5>
                  <div className="space-y-2 text-xs">
                    {locations.map(loc => (
                      <div key={loc.id} className="flex justify-between items-start gap-3 bg-gray-50 p-2 rounded">
                        <span className="font-bold text-gray-700 whitespace-nowrap">{loc.name}</span>
                        <span className="text-gray-500 text-right">{loc.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT TYPES MASTER */}
          {activeTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Creation Form */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                  <FilePlus2 className="text-[#1A1A1A]" size={20} />
                  <span>Add New Product Type</span>
                </h3>

                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Weft Remy Bulk"
                      value={newProdName}
                      onChange={e => setNewProdName(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Measurement Unit (UOM)</label>
                    <select
                      value={newProdUom}
                      onChange={e => setNewProdUom(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                    >
                      {STANDARD_UOMS.map(u => (
                        <option key={u} value={u}>{u.toUpperCase()} ({u})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Lengths Available (Select all that apply)
                    </label>
                    <div className="grid grid-cols-6 gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      {STANDARD_LENGTHS.map(len => {
                        const isSelected = newProdLengths.includes(len);
                        return (
                          <button
                            type="button"
                            key={len}
                            onClick={() => toggleLengthSelection(len)}
                            className={`py-1 text-center text-xs font-mono font-bold rounded-lg transition-colors border ${isSelected ? 'bg-[#1A1A1A] text-white border-transparent' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'}`}
                          >
                            {len}"
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description / Specs</label>
                    <textarea
                      placeholder="Enter raw hair specifications or target details..."
                      rows={2}
                      value={newProdDesc}
                      onChange={e => setNewProdDesc(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingProdId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProdId(null);
                          setNewProdName('');
                          setNewProdLengths([]);
                          setNewProdDesc('');
                        }}
                        className="w-1/3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                      >
                        <X size={16} />
                        <span>Cancel</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      className={`py-2.5 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${editingProdId ? 'w-2/3' : 'w-full'}`}
                    >
                      {editingProdId ? <Save size={16} /> : <Plus size={16} />}
                      <span>{editingProdId ? 'Update Product' : 'Create Product Type'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Master List Grid */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Product Master List ({products.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {products.map(prod => (
                    <div key={prod.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-gray-800 text-base">{prod.name}</h4>
                            <span className="px-2 py-0.5 bg-gray-100 border text-gray-600 font-bold text-[10px] rounded-full uppercase tracking-wider">
                              {prod.uom}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{prod.description || 'No description provided.'}</p>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEditProduct(prod)}
                            className="text-gray-500 hover:text-gray-850 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 border-t pt-3 border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Lengths Configured:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {prod.lengths.map(len => (
                            <span key={len} className="px-2 py-0.5 bg-blue-50/50 text-blue-600 font-mono font-bold text-xs rounded border border-blue-100/50">
                              {len}"
                            </span>
                          ))}
                          {prod.lengths.length === 0 && (
                            <span className="text-xs italic text-gray-400">No lengths configured</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOCATIONS MASTER */}
          {activeTab === 'locations' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Creation Form */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
                  <MapPin className="text-[#1A1A1A]" size={20} />
                  <span>Create Inventory Location / Room</span>
                </h3>

                <form onSubmit={handleAddLocation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Location Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Warehouse B"
                      value={newLocName}
                      onChange={e => setNewLocName(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description / Notes</label>
                    <textarea
                      placeholder="Write notes about materials stored here or supervisor details..."
                      rows={3}
                      value={newLocDesc}
                      onChange={e => setNewLocDesc(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>Add Room</span>
                  </button>
                </form>
              </div>

              {/* Master Locations list */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configured physical Locations ({locations.length})</h3>
                <div className="grid grid-cols-1 gap-3">
                  {locations.map(loc => (
                    <div key={loc.id} className="bg-white p-5 border border-gray-200 rounded-2xl flex items-center justify-between group hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-800 text-base">{loc.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{loc.description || 'No description provided.'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSFER HISTORY (AUDIT TRAIL) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <History size={16} />
                  <span>Internal Movements Audit Register</span>
                </h3>
                <span className="text-xs text-gray-400 font-bold font-mono">Real-time trace logs</span>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Timestamp</th>
                      <th className="px-5 py-3.5 font-bold">Product / Length</th>
                      <th className="px-5 py-3.5 font-bold text-center">Movement Type</th>
                      <th className="px-5 py-3.5 font-bold text-right">Quantity</th>
                      <th className="px-5 py-3.5 font-bold">Audit Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map(log => {
                      const prod = products.find(p => p.id === log.productId);
                      const from = locations.find(l => l.id === log.fromLocationId);
                      const to = locations.find(l => l.id === log.toLocationId);
                      const isInternal = log.fromLocationId !== '';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap font-medium text-xs text-gray-400 font-mono">
                            {new Date(log.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-800">{prod?.name || 'Unknown Product'}</div>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 font-mono text-[10px] font-bold rounded border border-blue-100/50">
                              {log.length}"
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isInternal ? (
                              <div className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 border border-amber-200/50 px-2.5 py-1 rounded-full font-semibold">
                                <span className="font-bold">{from?.name}</span>
                                <ChevronRight size={12} className="text-amber-400" />
                                <span className="font-bold">{to?.name}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-800 border border-green-200/50 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                                <Plus size={12} className="text-green-500" />
                                <span>Inwarded to {to?.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-gray-900">
                            {log.quantity} {prod?.uom}
                          </td>
                          <td className="px-5 py-4 text-gray-500 italic max-w-xs truncate text-xs">
                            {log.notes}
                          </td>
                        </tr>
                      );
                    })}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                          <AlertCircle size={28} className="mx-auto mb-2 text-gray-300" />
                          <p className="font-medium text-sm">No transfer audit logs logged in history yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- INWARD STOCK MODAL DIALOG --- */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full overflow-hidden relative animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="text-green-600" size={20} />
                <span>Inward / Initialize Inventory Stock</span>
              </h3>
              <button
                onClick={() => setIsInwardModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleInwardStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. Select Product Type</label>
                <select
                  value={inwardProductId}
                  onChange={e => {
                    setInwardProductId(e.target.value);
                    setInwardLength('');
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold"
                  required
                >
                  <option value="">-- Choose Product Type --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.uom})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. Length</label>
                  <select
                    value={inwardLength}
                    onChange={e => setInwardLength(e.target.value ? Number(e.target.value) : '')}
                    disabled={!inwardProductId}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="">-- Select Length --</option>
                    {inwardProductId && products.find(p => p.id === inwardProductId)?.lengths.map(len => (
                      <option key={len} value={len}>{len}"</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. Destination Room</label>
                  <select
                    value={inwardLocationId}
                    onChange={e => setInwardLocationId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold"
                    required
                  >
                    <option value="">-- Target Location --</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. Inward Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={inwardQty}
                    onChange={e => setInwardQty(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full p-2.5 border border-gray-200 rounded-xl font-mono text-center font-bold text-lg focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                    required
                  />
                  {inwardProductId && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">
                      {products.find(p => p.id === inwardProductId)?.uom}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">5. Notes / Procurement Details</label>
                <textarea
                  placeholder="e.g. Inwarded from vendor Arun Exports, Invoice ref #553"
                  rows={2}
                  value={inwardNotes}
                  onChange={e => setInwardNotes(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-95"
                >
                  Confirm Stock Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
