import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit3, MapPin, Phone, User, Landmark, Save, AlertCircle, Sparkles, X } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  shortCode: string;
  contactPerson: string;
  phone1: string;
  phone2?: string;
  address?: string;
  state?: string;
  pinCode?: string;
  geoLocation?: string;
  rates?: Record<number, number>; // matrix[length] = price per kg
}

const LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Venkatesh Hair Impex', shortCode: 'VNK', contactPerson: 'M. Venkatesh', phone1: '9845012345', address: '12 GNT Road, Madhavaram', state: 'Tamil Nadu', pinCode: '600060', rates: { 16: 45000, 18: 52000, 20: 60000, 22: 68000 } },
  { id: 'sup-2', name: 'Royal Indian Hair', shortCode: 'RIH', contactPerson: 'S. Rajan', phone1: '9444098765', address: '45 NH-5, Nellore Bypass', state: 'Andhra Pradesh', pinCode: '524002', rates: { 18: 54000, 20: 62000, 22: 70000, 24: 78000 } },
  { id: 'sup-3', name: 'Arun Hair Exports', shortCode: 'AHE', contactPerson: 'Arun Kumar', phone1: '9884055667', address: '88 Trunk Road, Eluru', state: 'Andhra Pradesh', pinCode: '534001', rates: { 16: 43000, 18: 50000, 20: 58000, 22: 66000 } }
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('inv_suppliers');
    return saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
  });

  useEffect(() => {
    localStorage.setItem('inv_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  // --- Form States ---
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [geoLocation, setGeoLocation] = useState('');

  // Rate Matrix setup for selected supplier
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>('sup-1');
  const [tempRates, setTempRates] = useState<Record<number, string>>({});

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Sync tempRates when selectedSupplier changes
  useEffect(() => {
    if (selectedSupplier) {
      const ratesCopy: Record<number, string> = {};
      LENGTHS.forEach(len => {
        ratesCopy[len] = selectedSupplier.rates?.[len]?.toString() || '';
      });
      setTempRates(ratesCopy);
    }
  }, [selectedSupplierId, suppliers]);

  // --- Handlers ---
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim() || !phone1.trim()) {
      alert('Please fill out Name, Short Code, and primary Phone.');
      return;
    }

    const cleanShortCode = shortCode.trim().toUpperCase().slice(0, 3);

    if (editId) {
      // Update
      setSuppliers(prev => prev.map(s => {
        if (s.id === editId) {
          return {
            ...s,
            name,
            shortCode: cleanShortCode,
            contactPerson,
            phone1,
            phone2: phone2 || undefined,
            address: address || undefined,
            state: state || undefined,
            pinCode: pinCode || undefined,
            geoLocation: geoLocation || undefined
          };
        }
        return s;
      }));
      setEditId(null);
      alert('Supplier updated successfully!');
    } else {
      // Create
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        name,
        shortCode: cleanShortCode,
        contactPerson,
        phone1,
        phone2: phone2 || undefined,
        address: address || undefined,
        state: state || undefined,
        pinCode: pinCode || undefined,
        geoLocation: geoLocation || undefined,
        rates: {}
      };
      setSuppliers(prev => [...prev, newSup]);
      alert('Supplier added successfully!');
    }

    // Reset Form
    setName('');
    setShortCode('');
    setContactPerson('');
    setPhone1('');
    setPhone2('');
    setAddress('');
    setState('');
    setPinCode('');
    setGeoLocation('');
  };

  const handleEditSupplier = (sup: Supplier) => {
    setEditId(sup.id);
    setName(sup.name);
    setShortCode(sup.shortCode);
    setContactPerson(sup.contactPerson);
    setPhone1(sup.phone1);
    setPhone2(sup.phone2 || '');
    setAddress(sup.address || '');
    setState(sup.state || '');
    setPinCode(sup.pinCode || '');
    setGeoLocation(sup.geoLocation || '');
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Are you sure you want to delete this supplier? Historical purchase invoices referencing this supplier will retain their logs, but their pricing maps will be removed.')) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      if (selectedSupplierId === id) {
        setSelectedSupplierId(null);
      }
    }
  };

  const handleSaveRatesMatrix = () => {
    if (!selectedSupplierId) return;

    const parsedRates: Record<number, number> = {};
    Object.entries(tempRates).forEach(([len, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        parsedRates[Number(len)] = num;
      }
    });

    setSuppliers(prev => prev.map(s => {
      if (s.id === selectedSupplierId) {
        return { ...s, rates: parsedRates };
      }
      return s;
    }));

    alert(`Price matrix saved successfully for ${selectedSupplier?.name}!`);
  };

  const handleCellRateChange = (len: number, value: string) => {
    setTempRates(prev => ({ ...prev, [len]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Suppliers Master & Rate Sheets</h1>
          <p className="text-gray-500 text-sm">Manage vendor profiles, customize price sheets, and track procurement rates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Creation / Edit Form (Left column) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
            <Users className="text-[#1A1A1A]" size={20} />
            <span>{editId ? 'Modify Supplier Profile' : 'Register New Supplier'}</span>
          </h3>

          <form onSubmit={handleSaveSupplier} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Supplier Name</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. Siva Hair Exports"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold text-gray-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Short Code</label>
                <input
                  type="text"
                  placeholder="e.g. SIV"
                  maxLength={3}
                  value={shortCode}
                  onChange={e => setShortCode(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-bold text-center uppercase tracking-widest text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Person</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Manager name"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold text-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Primary Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="9999900000"
                    value={phone1}
                    onChange={e => setPhone1(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono text-gray-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Secondary Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Optional"
                    value={phone2}
                    onChange={e => setPhone2(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono text-gray-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
              <textarea
                placeholder="Office or godown address details..."
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">State</label>
                <input
                  type="text"
                  placeholder="e.g. Tamil Nadu"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-gray-700 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pin Code</label>
                <input
                  type="text"
                  placeholder="600001"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-gray-700 font-mono text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Geo Location Coordinate (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="13.0827, 80.2707"
                  value={geoLocation}
                  onChange={e => setGeoLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-mono text-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setName('');
                    setShortCode('');
                    setContactPerson('');
                    setPhone1('');
                    setPhone2('');
                    setAddress('');
                    setState('');
                    setPinCode('');
                    setGeoLocation('');
                  }}
                  className="w-1/3 py-2.5 border rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              )}
              <button
                type="submit"
                className={`py-2.5 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${editId ? 'w-2/3' : 'w-full'}`}
              >
                <Plus size={16} />
                <span>{editId ? 'Update Profile' : 'Add Supplier'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Supplier Master Table and Rates Matrix (Right side) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Supplier Grid */}
          <div className="bg-white p-6 rounded-2xl border border-gray-250 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} />
              <span>Active Vendors List ({suppliers.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map(sup => {
                const isSelected = selectedSupplierId === sup.id;
                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-sm relative group ${isSelected ? 'border-[#1A1A1A] bg-amber-50/15 shadow-sm' : 'border-gray-250 bg-white'}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-gray-800 text-base">{sup.name}</h4>
                          <span className="mt-1 inline-block px-2.5 py-0.5 bg-gray-100 border text-gray-600 font-mono font-bold text-[10px] rounded-full uppercase tracking-wider">
                            Code: {sup.shortCode}
                          </span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSupplier(sup);
                            }}
                            className="text-gray-500 hover:text-gray-800 p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSupplier(sup.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400" />
                          <span>Contact: <strong>{sup.contactPerson || 'N/A'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400" />
                          <span className="font-mono">{sup.phone1} {sup.phone2 && `/ ${sup.phone2}`}</span>
                        </div>
                        {sup.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{sup.address}, {sup.state} - {sup.pinCode}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t pt-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <span>Rate Mapping:</span>
                      <span className="text-[#1A1A1A] font-extrabold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {Object.keys(sup.rates || {}).length} Sizes Mapped
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supplier Length-Rate Matrix */}
          {selectedSupplier && (
            <div className="bg-white p-6 rounded-2xl border border-gray-250 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    <span>Price Matrix: {selectedSupplier.name}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-semibold">Configure procurement prices (₹/kg) per length for this vendor.</p>
                </div>
                <button
                  onClick={handleSaveRatesMatrix}
                  className="flex items-center justify-center gap-1.5 bg-[#1A1A1A] hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Save size={14} />
                  <span>Save Rates Matrix</span>
                </button>
              </div>

              {/* Vertical list of prices */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {LENGTHS.map(len => (
                  <div key={len} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus-within:border-blue-400 hover:bg-gray-50 transition-colors gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100/50">
                        {len}" Size
                      </span>
                      <span className="text-xs text-gray-400 font-semibold hidden sm:inline">Procurement Rate Matrix</span>
                    </div>
                    <div className="relative w-44">
                      <input
                        type="number"
                        placeholder="--"
                        value={tempRates[len] || ''}
                        onChange={e => handleCellRateChange(len, e.target.value)}
                        className="w-full pl-3 pr-12 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">₹/kg</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5 text-xs text-gray-500">
                <AlertCircle size={16} className="text-[#1A1A1A] flex-shrink-0 mt-0.5" />
                <p>Configured rates are preserved in memory and will automatically seed rate estimates when this supplier is chosen on the *Raw Material Purchase* entry tab.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
