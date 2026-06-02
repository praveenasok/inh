import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Calendar, Scale, IndianRupee, Layers, AlertCircle, Eye, Tag } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  shortCode: string;
  rates?: Record<number, number>;
}

interface PurchaseEntry {
  length: number | 'MIXED';
  weight: number;
  rate: number;
}

interface RawLot {
  id: string;
  supplierId: string;
  supplyDate: string;
  density: string;
  grossWeightKg: number;
  availableWeightKg: number;
  totalAmount: number;
  details: PurchaseEntry[];
  status: 'AVAILABLE' | 'DEPLETED';
}

interface ProductType {
  id: string;
  name: string;
  uom: string;
  lengths: number[];
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

const LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Venkatesh Hair Impex', shortCode: 'VNK', rates: { 16: 45000, 18: 52000, 20: 60000, 22: 68000 } },
  { id: 'sup-2', name: 'Royal Indian Hair', shortCode: 'RIH', rates: { 18: 54000, 20: 62000, 22: 70000, 24: 78000 } },
  { id: 'sup-3', name: 'Arun Hair Exports', shortCode: 'AHE', rates: { 16: 43000, 18: 50000, 20: 58000, 22: 66000 } }
];

export default function PurchasePage() {
  // --- LocalStorage Hooks ---
  const [suppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('inv_suppliers');
    return saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
  });

  const [rawLots, setRawLots] = useState<RawLot[]>(() => {
    const saved = localStorage.getItem('inv_raw_lots');
    return saved ? JSON.parse(saved) : [];
  });

  const [products] = useState<ProductType[]>(() => {
    const saved = localStorage.getItem('inv_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [stock, setStock] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('inv_stock');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<TransferLog[]>(() => {
    const saved = localStorage.getItem('inv_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('inv_raw_lots', JSON.stringify(rawLots));
  }, [rawLots]);

  useEffect(() => {
    localStorage.setItem('inv_stock', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('inv_logs', JSON.stringify(logs));
  }, [logs]);

  // --- Form States ---
  const [supplierId, setSupplierId] = useState('');
  const [supplyDate, setSupplyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [grades, setGrades] = useState<string[]>(() => {
    const saved = localStorage.getItem('inv_custom_densities');
    return saved ? JSON.parse(saved) : ['1x1 Non-Remy', '2x2 Non-Remy', 'Remy Single Donor'];
  });
  const [density, setDensity] = useState('1x1 Non-Remy');
  const [customDensity, setCustomDensity] = useState('');
  const [isCustomGrade, setIsCustomGrade] = useState(false);
  const [entries, setEntries] = useState<PurchaseEntry[]>([{ length: 20, weight: 0, rate: 0 }]);
  const [targetProductId, setTargetProductId] = useState('');

  // Auto-find default "Non-Remy" or raw product
  useEffect(() => {
    if (products.length > 0) {
      const defaultProd = products.find(p => p.name.toLowerCase().includes('raw') || p.name.toLowerCase().includes('non-remy'));
      if (defaultProd) {
        setTargetProductId(defaultProd.id);
      } else {
        setTargetProductId(products[0].id);
      }
    }
  }, [products]);

  // --- Calculations ---
  const totalWeight = entries.reduce((sum, e) => sum + Number(e.weight || 0), 0);
  const totalAmount = entries.reduce((sum, e) => sum + (Number(e.weight || 0) * Number(e.rate || 0)), 0);

  // Automatically seed rates when supplier is changed
  useEffect(() => {
    if (!supplierId) return;
    const selectedSup = suppliers.find(s => s.id === supplierId);
    if (!selectedSup || !selectedSup.rates) return;

    setEntries(prev => prev.map(entry => {
      const lenKey = entry.length === 'MIXED' ? 20 : entry.length;
      const supplierRate = selectedSup.rates?.[lenKey] || 0;
      return {
        ...entry,
        rate: supplierRate || entry.rate
      };
    }));
  }, [supplierId, suppliers]);

  // --- Handlers ---
  const handleAddEntry = () => {
    let initialRate = 0;
    const defaultLen = 20;
    if (supplierId) {
      const selectedSup = suppliers.find(s => s.id === supplierId);
      if (selectedSup && selectedSup.rates) {
        initialRate = selectedSup.rates[defaultLen] || 0;
      }
    }
    setEntries(prev => [...prev, { length: defaultLen, weight: 0, rate: initialRate }]);
  };

  const handleRemoveEntry = (idx: number) => {
    if (entries.length > 1) {
      setEntries(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleChangeEntry = (idx: number, field: keyof PurchaseEntry, val: string) => {
    setEntries(prev => {
      const copy = [...prev];
      if (field === 'length') {
        const newLen = val === 'MIXED' ? 'MIXED' : Number(val);
        copy[idx].length = newLen;
        if (supplierId) {
          const selectedSup = suppliers.find(s => s.id === supplierId);
          if (selectedSup && selectedSup.rates) {
            const lenKey = newLen === 'MIXED' ? 20 : newLen;
            const supplierRate = selectedSup.rates[lenKey];
            if (supplierRate) {
              copy[idx].rate = supplierRate;
            }
          }
        }
      } else {
        copy[idx][field] = parseFloat(val) || 0;
      }
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return alert('Please select a supplier.');
    if (entries.some(ent => ent.weight <= 0 || ent.rate <= 0)) {
      return alert('Weight and Rate must be greater than 0 for all items.');
    }

    const finalDensity = isCustomGrade ? customDensity.trim() : density;
    if (isCustomGrade && !customDensity.trim()) {
      return alert('Please enter a custom density / sort grade.');
    }

    // Save custom density to persistent list
    if (isCustomGrade && !grades.includes(finalDensity)) {
      const updatedGrades = [...grades, finalDensity];
      setGrades(updatedGrades);
      localStorage.setItem('inv_custom_densities', JSON.stringify(updatedGrades));
    }

    const selectedSup = suppliers.find(s => s.id === supplierId);
    const shortCode = selectedSup ? selectedSup.shortCode : 'SUP';
    const cleanDate = supplyDate.replace(/-/g, '');
    const lotIndexStr = String(rawLots.length + 1).padStart(3, '0');
    const lotId = `RAW-${cleanDate}-${shortCode}-${lotIndexStr}`;

    const newLot: RawLot = {
      id: lotId,
      supplierId,
      supplyDate,
      density: finalDensity,
      grossWeightKg: totalWeight,
      availableWeightKg: totalWeight,
      totalAmount,
      details: entries,
      status: 'AVAILABLE'
    };

    // 1. Save Lot Purchase Record
    setRawLots(prev => [newLot, ...prev]);

    // 2. Automatically Add Stock to Stock Ledger (inv_stock) under 'loc-1' (Raw Hair Room)
    if (targetProductId) {
      setStock(prev => {
        let updatedStock = [...prev];
        entries.forEach(entry => {
          const lenNum = entry.length === 'MIXED' ? 20 : entry.length; // Default mixed length to 20 for stock ledger tracking
          const destLocation = 'loc-1'; // Raw Hair Room

          const matchIndex = updatedStock.findIndex(
            s => s.productId === targetProductId && s.length === lenNum && s.locationId === destLocation
          );

          if (matchIndex > -1) {
            updatedStock[matchIndex] = {
              ...updatedStock[matchIndex],
              quantity: updatedStock[matchIndex].quantity + entry.weight
            };
          } else {
            updatedStock.push({
              productId: targetProductId,
              length: lenNum,
              locationId: destLocation,
              quantity: entry.weight
            });
          }
        });
        return updatedStock;
      });

      // 3. Create Audit Trail Log
      entries.forEach(entry => {
        const lenNum = entry.length === 'MIXED' ? 20 : entry.length;
        const newLog: TransferLog = {
          id: `tlog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: new Date().toISOString(),
          productId: targetProductId,
          length: lenNum,
          quantity: entry.weight,
          fromLocationId: '', // Procurement Source
          toLocationId: 'loc-1', // Raw Hair Room
          notes: `Procured RAW LOT ${lotId} (Supplier: ${selectedSup?.name})`
        };
        setLogs(prev => [newLog, ...prev]);
      });
    }

    // Reset Form
    setSupplierId('');
    setEntries([{ length: 20, weight: 0, rate: 0 }]);
    setCustomDensity('');
    setIsCustomGrade(false);
    setDensity('1x1 Non-Remy');
    alert(`Raw Lot ${lotId} created successfully, and stock is allocated to Raw Hair Room!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Raw Material Purchase Inward</h1>
          <p className="text-gray-500 text-sm">Add procurement shipments, log length breakdowns, and auto-provision ledger stocks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Container */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
            <ShoppingCart className="text-[#1A1A1A]" size={20} />
            <span>New Raw Purchase Entry</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supplier</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.shortCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Supply Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="date"
                    value={supplyDate}
                    onChange={e => setSupplyDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold text-gray-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Density / Sort Grade</label>
                <div className="space-y-2">
                  <select
                    value={isCustomGrade ? 'CUSTOM' : density}
                    onChange={e => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomGrade(true);
                      } else {
                        setIsCustomGrade(false);
                        setDensity(e.target.value);
                      }
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold bg-white"
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="CUSTOM">+ Add Custom Grade...</option>
                  </select>

                  {isCustomGrade && (
                    <input
                      type="text"
                      placeholder="Type custom grade (e.g. 3x3 Remy)"
                      value={customDensity}
                      onChange={e => setCustomDensity(e.target.value)}
                      className="w-full p-2.5 border border-amber-200 bg-amber-50/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold"
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Target Inventory Product Mapping */}
            {products.length > 0 && (
              <div className="p-4 bg-gray-50 border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-amber-500" />
                  Auto-Inward Target Product:
                </span>
                <select
                  value={targetProductId}
                  onChange={e => setTargetProductId(e.target.value)}
                  className="p-2 border border-gray-200 rounded-lg text-xs bg-white font-bold text-gray-700 focus:outline-none"
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.uom})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic Purchase Lines */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lengths & Weights Breakdown</h4>
              
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase px-2">
                <div className="col-span-4">Length (Inches)</div>
                <div className="col-span-3 text-center">Weight (kg)</div>
                <div className="col-span-4 text-center">Rate / kg (₹)</div>
                <div className="col-span-1"></div>
              </div>

              {entries.map((entry, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50/50 p-2 border border-gray-150 rounded-xl">
                  <div className="col-span-4">
                    <select
                      value={entry.length}
                      onChange={e => handleChangeEntry(idx, 'length', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white font-semibold font-mono"
                      required
                    >
                      {LENGTHS.map(l => (
                        <option key={l} value={l}>{l}" Length</option>
                      ))}
                      <option value="MIXED">Mixed / Unsorted</option>
                    </select>
                  </div>

                  <div className="col-span-3 relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={entry.weight || ''}
                      onChange={e => handleChangeEntry(idx, 'weight', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-mono text-center font-bold"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KG</span>
                  </div>

                  <div className="col-span-4 relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="₹0"
                      value={entry.rate || ''}
                      onChange={e => handleChangeEntry(idx, 'rate', e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm font-mono text-center font-bold"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">₹/KG</span>
                  </div>

                  <div className="col-span-1 text-center">
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(idx)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddEntry}
                className="mt-2 text-xs font-bold text-[#1A1A1A] hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Another Length
              </button>
            </div>

            {/* Calculations Banner */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Scale className="text-amber-600" size={18} />
                <span className="text-sm font-semibold text-amber-900">Total Purchase Weight:</span>
                <span className="font-mono text-lg font-black text-amber-950">{totalWeight.toFixed(2)} kg</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="text-amber-600" size={18} />
                <span className="text-sm font-semibold text-amber-900">Estimated Valuation:</span>
                <span className="font-mono text-lg font-black text-amber-950">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span>Save Complete Raw Lot & Allocate Stock</span>
            </button>
          </form>
        </div>

        {/* Informational Guidelines Side */}
        <div className="lg:col-span-4 bg-gray-50 p-6 rounded-2xl border border-gray-200/60 space-y-4 text-xs text-gray-600">
          <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Lot Numbering System</h4>
          <p>Upon submitting, the system dynamically parses the supplier name and generation indexes to compile a strict **Lot ID** (e.g. `RAW-YYYYMMDD-[SUPPLIER]-XXX`).</p>
          
          <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-2">
            <h5 className="font-bold text-gray-700 flex items-center gap-1">
              <AlertCircle size={14} className="text-amber-500" />
              Automated Operations:
            </h5>
            <ol className="list-decimal list-inside space-y-2 text-[11px]">
              <li>Compiles procurement receipt records in historical logs.</li>
              <li>Calculates total billing amounts and bundles them under dynamic tracking indexes.</li>
              <li>Atomically inward-stores raw kilograms in the **Raw Hair Room** stock ledger.</li>
              <li>Populates standard system tracing graphs immediately.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Historical Purchases Table */}
      <div className="bg-white rounded-2xl border border-gray-250 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Layers size={18} className="text-[#1A1A1A]" />
            <span>Procurement History Ledger</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-bold">Raw Lot ID</th>
                <th className="px-5 py-3 font-bold">Supplier</th>
                <th className="px-5 py-3 font-bold">Procurement Date</th>
                <th className="px-5 py-3 font-bold text-center">Grade</th>
                <th className="px-5 py-3 font-bold text-right">Invoice weight / amount</th>
                <th className="px-5 py-3 font-bold text-center">Receipt details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rawLots.map(lot => {
                const sup = suppliers.find(s => s.id === lot.supplierId);
                return (
                  <tr key={lot.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-blue-600">
                      {lot.id}
                      <span className="block mt-1 text-[9px] w-max uppercase tracking-wider font-extrabold px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                        {lot.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-800">
                      {sup ? sup.name : 'Unknown Supplier'}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-400 font-mono">
                      {lot.supplyDate}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 font-bold text-xs rounded-md uppercase">
                        {lot.density}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-mono font-bold text-gray-900">₹{lot.totalAmount.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-semibold">for {lot.grossWeightKg.toFixed(2)} kg</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <details className="inline-block relative">
                        <summary className="text-xs font-bold text-blue-600 hover:underline cursor-pointer list-none outline-none flex items-center gap-1 justify-center">
                          <Eye size={12} /> View Breakdown
                        </summary>
                        <div className="absolute right-0 mt-2 z-30 w-52 bg-white border border-gray-200 rounded-xl p-3 shadow-lg space-y-1.5 text-[11px] text-left">
                          <div className="font-bold border-b pb-1 text-gray-500 mb-1 flex justify-between">
                            <span>Length</span>
                            <span>Weight & Rate</span>
                          </div>
                          {lot.details.map((d, idx) => (
                            <div key={idx} className="flex justify-between font-mono">
                              <span className="font-bold text-gray-700">{d.length === 'MIXED' ? 'MIXED' : `${d.length}"`}</span>
                              <span className="text-gray-500 font-semibold">{d.weight.toFixed(2)} kg @ ₹{d.rate}/kg</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
              {rawLots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <AlertCircle size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-medium text-sm">No historical raw lot shipments recorded in history.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
