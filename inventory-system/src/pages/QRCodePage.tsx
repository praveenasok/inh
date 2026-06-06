import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { QrCode, Plus, Trash2, Download, Printer, TrendingUp, MapPin, Smartphone, History, Play, Sparkles, Layers, CheckCircle } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, setDoc, deleteDoc, doc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface ProductType {
  id: string;
  name: string;
  uom: string;
  description: string;
}

interface RawLot {
  id: string;
  density: string;
  grossWeightKg: number;
  supplyDate: string;
}

interface LocationItem {
  id: string;
  name: string;
}

interface QRCodeItem {
  id: string;
  name: string;
  type: 'PRODUCT' | 'LOT' | 'LOCATION' | 'CUSTOM';
  targetId: string;
  payload: string;
  createdAt: string;
}

interface ScanEvent {
  id: string;
  qrId: string;
  qrName: string;
  timestamp: string;
  city: string;
  country: string;
  os: 'iOS' | 'Android' | 'Windows' | 'macOS';
  browser: 'Safari' | 'Chrome' | 'Firefox' | 'Edge';
}

const CITIES = [
  { city: 'Chennai', country: 'India' },
  { city: 'Delhi', country: 'India' },
  { city: 'Nellore', country: 'India' },
  { city: 'Eluru', country: 'India' },
  { city: 'Madhavaram', country: 'India' },
  { city: 'New York', country: 'USA' },
  { city: 'London', country: 'UK' },
  { city: 'Paris', country: 'France' }
];

const PLATFORMS: ('iOS' | 'Android' | 'Windows' | 'macOS')[] = ['iOS', 'Android', 'Windows', 'macOS'];
const BROWSERS: ('Safari' | 'Chrome' | 'Firefox' | 'Edge')[] = ['Chrome', 'Safari', 'Firefox', 'Edge'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function QRCodePage() {
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'analytics' | 'simulator'>('generator');

  // --- Data Stores (Localstorage) ---
  const [products] = useState<ProductType[]>(() => {
    const saved = localStorage.getItem('inv_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [rawLots] = useState<RawLot[]>(() => {
    const saved = localStorage.getItem('inv_raw_lots');
    return saved ? JSON.parse(saved) : [];
  });

  const [locations] = useState<LocationItem[]>(() => {
    const saved = localStorage.getItem('inv_locations');
    return saved ? JSON.parse(saved) : [];
  });

  const [qrList, setQrList] = useState<QRCodeItem[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);

  // Fetch QR Codes from Firebase
  useEffect(() => {
    const q = query(collection(db, 'inv_qr_codes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qrs: QRCodeItem[] = [];
      snapshot.forEach(doc => qrs.push(doc.data() as QRCodeItem));
      setQrList(qrs);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Scans from Firebase
  useEffect(() => {
    const q = query(collection(db, 'inv_qr_scans'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scans: ScanEvent[] = [];
      snapshot.forEach(doc => scans.push({ ...doc.data(), id: doc.id } as ScanEvent));
      setScanEvents(scans);
    });
    return () => unsubscribe();
  }, []);

  // --- Form States (Generator) ---
  const [qrName, setQrName] = useState('');
  const [qrType, setQrType] = useState<'PRODUCT' | 'LOT' | 'LOCATION' | 'CUSTOM'>('PRODUCT');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [customText, setCustomText] = useState('');

  // Auto select target item when QR Type changes
  useEffect(() => {
    if (qrType === 'PRODUCT' && products.length > 0) setSelectedTargetId(products[0].id);
    else if (qrType === 'LOT' && rawLots.length > 0) setSelectedTargetId(rawLots[0].id);
    else if (qrType === 'LOCATION' && locations.length > 0) setSelectedTargetId(locations[0].id);
    else setSelectedTargetId('');
  }, [qrType, products, rawLots, locations]);

  // --- Simulator States ---
  const [simQrId, setSimQrId] = useState('');
  const [simCityIndex, setSimCityIndex] = useState(0);
  const [simPlatform, setSimPlatform] = useState<'iOS' | 'Android' | 'Windows' | 'macOS'>('iOS');
  const [simBrowser, setSimBrowser] = useState<'Safari' | 'Chrome' | 'Firefox' | 'Edge'>('Chrome');

  useEffect(() => {
    if (qrList.length > 0 && !simQrId) {
      setSimQrId(qrList[0].id);
    }
  }, [qrList, simQrId]);

  // --- Handlers ---
  const handleGenerateQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrName.trim()) return alert('Please enter a label name.');

    let payload = '';
    let targetId = '';

    if (qrType === 'PRODUCT') {
      const match = products.find(p => p.id === selectedTargetId);
      payload = `PRODUCT:${selectedTargetId}:${match ? match.name : ''}`;
      targetId = selectedTargetId;
    } else if (qrType === 'LOT') {
      const match = rawLots.find(l => l.id === selectedTargetId);
      payload = `LOT:${selectedTargetId}:${match ? match.density + ' ' + match.grossWeightKg + 'kg' : ''}`;
      targetId = selectedTargetId;
    } else if (qrType === 'LOCATION') {
      const match = locations.find(l => l.id === selectedTargetId);
      payload = `LOCATION:${selectedTargetId}:${match ? match.name : ''}`;
      targetId = selectedTargetId;
    } else {
      payload = customText.trim() || 'CUSTOM:TEXT';
      targetId = 'custom';
    }

    const newQR: QRCodeItem = {
      id: `qr-${Date.now()}`,
      name: qrName.trim(),
      type: qrType,
      targetId,
      payload,
      createdAt: new Date().toISOString()
    };

    setDoc(doc(db, 'inv_qr_codes', newQR.id), newQR).then(() => {
      setQrName('');
      setCustomText('');
      alert('QR label configuration created!');
    }).catch(err => {
      console.error('Error creating QR code:', err);
      alert('Failed to save QR code.');
    });
  };

  const handleDeleteQR = (id: string) => {
    if (confirm('Are you sure you want to delete this QR configuration? Historical scan logs will still remain.')) {
      deleteDoc(doc(db, 'inv_qr_codes', id)).catch(err => console.error('Error deleting QR:', err));
      if (simQrId === id) setSimQrId('');
    }
  };

  const handleSimulateScan = () => {
    if (!simQrId) return alert('Please create or select a QR Code configuration first.');

    const qr = qrList.find(q => q.id === simQrId);
    if (!qr) return;

    const loc = CITIES[simCityIndex];
    const newScan = {
      qrId: simQrId,
      qrName: qr.name,
      timestamp: new Date().toISOString(),
      city: loc.city,
      country: loc.country,
      os: simPlatform,
      browser: simBrowser,
      createdAt: serverTimestamp()
    };

    addDoc(collection(db, 'inv_qr_scans'), newScan).then(() => {
      alert(`Mock Scan successfully recorded from ${loc.city} (${simPlatform}/${simBrowser})!`);
    }).catch(err => {
      console.error('Error adding mock scan:', err);
      alert('Failed to save scan event.');
    });
  };

  const handleAutoSeedAnalytics = () => {
    if (qrList.length === 0) return alert('Please generate at least one QR code to seed scanning events.');

    const mockScans: ScanEvent[] = [];
    const now = Date.now();

    for (let i = 0; i < 60; i++) {
      const randomQR = qrList[Math.floor(Math.random() * qrList.length)];
      const randomLoc = CITIES[Math.floor(Math.random() * CITIES.length)];
      const randomOS = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
      const randomBrowser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
      const randomTimeOffset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // offset within last 7 days

      mockScans.push({
        id: `scan-mock-${i}-${Date.now()}`,
        qrId: randomQR.id,
        qrName: randomQR.name,
        timestamp: new Date(now - randomTimeOffset).toISOString(),
        city: randomLoc.city,
        country: randomLoc.country,
        os: randomOS,
        browser: randomBrowser
      });
    }

    setScanEvents(prev => [...mockScans, ...prev]);
    alert('Successfully generated 60 historical scan data points for demographics graphs!');
  };

  const handleClearScans = () => {
    if (confirm('Are you sure you want to purge all scan tracking analytics logs? Note: Due to Firestore limits, this bulk delete is disabled in this UI. Please manually manage or we can add a batch delete function.')) {
      alert('Clear functionality is disabled when connected to live Firebase. Delete logs from Firebase Console.');
    }
  };

  // --- Data aggregation for Recharts Charts ---

  // 1. Timeline Data (Last 7 Days)
  const getTimelineData = () => {
    const datesMap: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      datesMap[dateString] = 0;
    }

    scanEvents.forEach(scan => {
      try {
        const scanDate = new Date(scan.timestamp);
        const dateString = scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (datesMap[dateString] !== undefined) {
          datesMap[dateString]++;
        }
      } catch (_) {}
    });

    return Object.entries(datesMap).map(([day, scans]) => ({ day, scans }));
  };

  // 2. City Breakdown Data
  const getCityData = () => {
    const citiesMap: Record<string, number> = {};
    scanEvents.forEach(scan => {
      citiesMap[scan.city] = (citiesMap[scan.city] || 0) + 1;
    });

    return Object.entries(citiesMap)
      .map(([name, scans]) => ({ name, scans }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 5);
  };

  // 3. OS Breakdown Data
  const getOSData = () => {
    const osMap: Record<string, number> = {};
    scanEvents.forEach(scan => {
      osMap[scan.os] = (osMap[scan.os] || 0) + 1;
    });

    return Object.entries(osMap).map(([name, value]) => ({ name, value }));
  };

  const timelineData = getTimelineData();
  const cityData = getCityData();
  const osData = getOSData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Code Stock Tags & Scan Analytics</h1>
          <p className="text-gray-500 text-sm">Generate physical tags for products, lots, and rooms, and track real-time scanning demographics.</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border self-start">
          <button
            onClick={() => setActiveSubTab('generator')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'generator' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-slate-700'}`}
          >
            <QrCode className="inline-block mr-1.5" size={14} /> Tag Generator
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'analytics' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-slate-700'}`}
          >
            <TrendingUp className="inline-block mr-1.5" size={14} /> Tracking Analytics
          </button>
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'simulator' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-slate-700'}`}
          >
            <Play className="inline-block mr-1.5" size={14} /> Scan Simulator
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUBTAB 1: TAG GENERATOR */}
      {/* ==================================================== */}
      {activeSubTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Creator */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-b pb-4">
              <Plus className="text-[#1A1A1A]" size={20} />
              <span>Create QR Tag</span>
            </h3>

            <form onSubmit={handleGenerateQR} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Label Name</label>
                <input
                  type="text"
                  placeholder="e.g. Raw Lot Rack label"
                  value={qrName}
                  onChange={e => setQrName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold text-gray-700 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resource Type</label>
                <select
                  value={qrType}
                  onChange={e => setQrType(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] font-semibold bg-white"
                >
                  <option value="PRODUCT">Product Type Reference</option>
                  <option value="LOT">Raw Lot Reference</option>
                  <option value="LOCATION">Storage Location Reference</option>
                  <option value="CUSTOM">Custom URL / Link</option>
                </select>
              </div>

              {/* Dynamic selectors based on type choice */}
              {qrType === 'PRODUCT' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Product Type</label>
                  {products.length > 0 ? (
                    <select
                      value={selectedTargetId}
                      onChange={e => setSelectedTargetId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-medium text-gray-700"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.uom})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/50">No products configured. Create product types in Products Master tab first.</p>
                  )}
                </div>
              )}

              {qrType === 'LOT' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Raw Lot</label>
                  {rawLots.length > 0 ? (
                    <select
                      value={selectedTargetId}
                      onChange={e => setSelectedTargetId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-medium text-gray-700"
                    >
                      {rawLots.map(l => (
                        <option key={l.id} value={l.id}>{l.id} ({l.density} - {l.grossWeightKg}kg)</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/50">No raw purchase lots exist. Log purchases in Raw Purchase tab first.</p>
                  )}
                </div>
              )}

              {qrType === 'LOCATION' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Location Room</label>
                  {locations.length > 0 ? (
                    <select
                      value={selectedTargetId}
                      onChange={e => setSelectedTargetId(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-medium text-gray-700"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200/50">No inventory rooms found. Setup locations in Locations Master first.</p>
                  )}
                </div>
              )}

              {qrType === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Custom URL or Text</label>
                  <input
                    type="text"
                    placeholder="https://indiannaturalhair.com"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none font-semibold text-gray-700 bg-white"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-4 py-2.5 bg-[#1A1A1A] hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} />
                <span>Generate QR Tag</span>
              </button>
            </form>
          </div>

          {/* List Matrix */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-250 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} />
              <span>Generated QR Stock Tags ({qrList.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qrList.map(qr => {
                const liveTrackerUrl = `https://inhsuite.web.app/inventory-system/dist/index.html#/scan/${qr.id}?payload=${encodeURIComponent(qr.payload)}&name=${encodeURIComponent(qr.name)}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(liveTrackerUrl)}`;
                return (
                  <div key={qr.id} className="p-4 border border-gray-200 rounded-2xl flex gap-4 hover:shadow-md transition-all group relative bg-gray-50/20">
                    {/* QR display block */}
                    <div className="w-24 h-24 bg-white border border-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center p-1 shadow-inner relative">
                      <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-gray-800 text-sm truncate leading-tight">{qr.name}</h4>
                          <button
                            onClick={() => handleDeleteQR(qr.id)}
                            className="text-slate-350 hover:text-red-500 p-1 rounded hover:bg-slate-100 flex-shrink-0 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Label"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <span className="mt-1.5 inline-block px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 font-mono font-bold text-[9px] rounded uppercase tracking-wider">
                          {qr.type}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-2 font-mono truncate leading-none">Payload: {qr.payload}</p>
                      </div>

                      <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                        <a
                          href={qrUrl}
                          download={`${qr.name}.png`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1 bg-white hover:bg-slate-50 border border-gray-200 text-slate-700 font-bold text-[10px] uppercase rounded-lg text-center flex items-center justify-center gap-1 shadow-sm active:scale-98"
                        >
                          <Download size={10} /> Save
                        </a>
                        <button
                          onClick={() => {
                            const w = window.open();
                            if (w) {
                              w.document.write(`
                                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:90vh; font-family:sans-serif; text-align:center;">
                                  <div style="border: 2px solid #000; border-radius: 12px; padding: 20px; max-width: 250px;">
                                    <h2 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">INH Stock Tag</h2>
                                    <img src="${qrUrl}" style="width: 150px; height: 150px;" />
                                    <p style="margin: 10px 0 0 0; font-size: 13px; font-weight: bold;">${qr.name}</p>
                                    <p style="margin: 3px 0 0 0; font-size: 9px; font-family: monospace; color: #555;">${qr.payload}</p>
                                  </div>
                                  <script>window.print();</script>
                                </div>
                              `);
                            }
                          }}
                          className="flex-1 py-1 bg-[#1A1A1A] hover:bg-gray-800 text-white font-bold text-[10px] uppercase rounded-lg flex items-center justify-center gap-1 shadow-sm active:scale-98 cursor-pointer"
                        >
                          <Printer size={10} /> Print
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {qrList.length === 0 && (
                <div className="col-span-2 py-16 text-center text-gray-400 border border-dashed border-gray-250 rounded-2xl bg-gray-50/50">
                  <QrCode size={36} className="mx-auto mb-2 text-slate-350" />
                  <p className="font-semibold text-sm">No QR Tags defined yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Setup tag parameters on the left to generate templates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 2: TRACKING ANALYTICS */}
      {/* ==================================================== */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total QR Scans</p>
                <h3 className="text-3xl font-extrabold text-gray-800 mt-2">{scanEvents.length}</h3>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">Live Tracking</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 text-blue-600">
                <Smartphone size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Unique Codes Scanned</p>
                <h3 className="text-3xl font-extrabold text-gray-800 mt-2">
                  {new Set(scanEvents.map(s => s.qrId)).size}
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">Out of {qrList.length} total active tags</span>
              </div>
              <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
                <QrCode size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Top Scanning City</p>
                <h3 className="text-xl font-extrabold text-gray-800 mt-2 truncate w-36">
                  {cityData[0]?.name || 'N/A'}
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">{cityData[0]?.scans || 0} scans logged</span>
              </div>
              <div className="p-4 rounded-xl bg-green-50 text-green-600">
                <MapPin size={24} />
              </div>
            </div>

            {/* Utility actions for demo testing */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Analytics Controls
                </h4>
                <p className="text-[10px] text-amber-800 mt-1 leading-relaxed">Seed historical scans to preview demographics charting.</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAutoSeedAnalytics}
                  className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Seed Data
                </button>
                <button
                  onClick={handleClearScans}
                  className="flex-1 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 font-bold text-[9px] uppercase tracking-wider rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </div>

          {/* Demographics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Timeline area chart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 text-base mb-6 flex items-center gap-1.5">
                <TrendingUp size={16} className="text-blue-500" />
                <span>Scan History Timeline (Scans per Day)</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScans)" name="Scans" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* OS Pie chart */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-1.5">
                <Smartphone size={16} className="text-purple-500" />
                <span>Mobile Platform / OS</span>
              </h3>
              <div className="h-44 w-full relative flex items-center justify-center">
                {scanEvents.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={osData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {osData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" style={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400 italic">No scans recorded to generate OS charts.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Geographic Cities stats */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 text-base mb-6 flex items-center gap-1.5">
                <MapPin size={16} className="text-green-500" />
                <span>Scan Distribution by Location</span>
              </h3>
              <div className="h-64">
                {scanEvents.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cityData} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} style={{ fontSize: '9px', fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#334155' }} />
                      <Tooltip />
                      <Bar dataKey="scans" fill="#10b981" radius={[0, 6, 6, 0]} name="Scans" barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">No geographic stats log recorded.</div>
                )}
              </div>
            </div>

            {/* Recent Scan feed */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <History size={16} />
                  <span>Real-time Tracking Feed (Recent Scans)</span>
                </h3>
              </div>

              <div className="flex-1 overflow-x-auto min-h-[220px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-150">
                    <tr>
                      <th className="px-4 py-2.5">Time</th>
                      <th className="px-4 py-2.5">Tag Name</th>
                      <th className="px-4 py-2.5">Location</th>
                      <th className="px-4 py-2.5">Platform</th>
                      <th className="px-4 py-2.5">Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                    {scanEvents.slice(0, 5).map(scan => (
                      <tr key={scan.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-gray-400 font-mono">
                          {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-extrabold">{scan.qrName}</td>
                        <td className="px-4 py-3 flex items-center gap-1">
                          <MapPin size={11} className="text-gray-400" />
                          {scan.city}, {scan.country}
                        </td>
                        <td className="px-4 py-3 font-mono">{scan.os}</td>
                        <td className="px-4 py-3 font-mono text-gray-500">{scan.browser}</td>
                      </tr>
                    ))}

                    {scanEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 italic">No scanning activities recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 3: SCAN SIMULATOR */}
      {/* ==================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="text-center border-b pb-6">
            <Smartphone className="mx-auto text-blue-600 mb-3" size={32} />
            <h3 className="text-xl font-extrabold text-gray-800">Geodemographic Scan Simulator</h3>
            <p className="text-gray-500 text-xs mt-1 leading-relaxed">
              Since this app runs fully local, you can simulate real-world mobile QR code scans here. Selecting a tag and submitting simulates a real user scanning the tag, which live-updates the charts in the analytics tab.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Target Stock Tag</label>
              {qrList.length > 0 ? (
                <select
                  value={simQrId}
                  onChange={e => setSimQrId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-bold text-gray-700 focus:ring-1 focus:ring-[#1A1A1A]"
                >
                  {qrList.map(qr => (
                    <option key={qr.id} value={qr.id}>{qr.name} ({qr.type})</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">No QR Code tags available. Go to the Generator tab to create tags first.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scan City / Location</label>
                <select
                  value={simCityIndex}
                  onChange={e => setSimCityIndex(Number(e.target.value))}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                >
                  {CITIES.map((c, idx) => (
                    <option key={idx} value={idx}>{c.city}, {c.country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Device OS Platform</label>
                <select
                  value={simPlatform}
                  onChange={e => setSimPlatform(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scan Browser</label>
                <select
                  value={simBrowser}
                  onChange={e => setSimBrowser(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white font-semibold"
                >
                  {BROWSERS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={qrList.length === 0}
              className="w-full mt-6 py-3 bg-[#1A1A1A] hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={16} />
              <span>Submit Simulated Scan Event</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
