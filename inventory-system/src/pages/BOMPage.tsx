import { useState } from 'react';
import { Save, FileText, AlertCircle, Plus, Trash2, Sliders, FilePlus, Layers, Trash } from 'lucide-react';

const RAW_LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
const FINISHED_LENGTHS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

interface ComponentItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
}

interface BOMSheet {
    id: string;
    productName: string;
    wastagePct: number;
    matrix: Record<number, Record<number, number>>;
    components: ComponentItem[];
    updatedAt: string;
}

const PRESET_COMPONENTS = [
    { name: 'Clip (Standard Black)', unit: 'pcs' },
    { name: 'Clip (Brown)', unit: 'pcs' },
    { name: 'Elastic Band (Black)', unit: 'pcs' },
    { name: 'Elastic Band (Clear)', unit: 'pcs' },
    { name: 'Sewing Thread (Heavy Duty)', unit: 'meters' },
    { name: 'Net Base (Closure)', unit: 'pcs' },
    { name: 'Lace Material (Swiss)', unit: 'yards' },
    { name: 'Packaging Box (INH Premium)', unit: 'pcs' },
    { name: 'Silk Ribbon', unit: 'meters' },
    { name: 'Label Tag', unit: 'pcs' },
];

export default function BOMPage() {
    // boms state
    const [boms, setBoms] = useState<BOMSheet[]>(() => {
        try {
            const saved = localStorage.getItem('inv_boms');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [currentBomId, setCurrentBomId] = useState<string>('');
    const [productName, setProductName] = useState('Machine Weft Bulk');
    const [wastagePct, setWastagePct] = useState(4.5);
    // matrix[finishedLen][rawLen] = percentage
    const [matrix, setMatrix] = useState<Record<number, Record<number, number>>>({});
    const [components, setComponents] = useState<ComponentItem[]>([]);
    const [activeTab, setActiveTab] = useState<'mixer' | 'matrix'>('mixer');

    // Component Form States
    const [newCompName, setNewCompName] = useState('');
    const [newCompQty, setNewCompQty] = useState('');
    const [newCompUnit, setNewCompUnit] = useState('pcs');

    const handleCellChange = (finLen: number, rawLen: number, value: string) => {
        const num = parseFloat(value);
        setMatrix(prev => {
            const col = { ...(prev[finLen] || {}) };
            if (isNaN(num)) {
                delete col[rawLen];
            } else {
                col[rawLen] = num;
            }
            return { ...prev, [finLen]: col };
        });
    };

    const getColTotal = (finLen: number) => {
        const col = matrix[finLen] || {};
        return Object.values(col).reduce((sum, val) => sum + val, 0);
    };

    const isColValid = (finLen: number) => {
        const total = getColTotal(finLen);
        return total === 0 || Math.abs(total - 100) < 0.1;
    };

    // Component Actions
    const handleAddComponent = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newCompName.trim()) return;
        const qtyVal = parseFloat(newCompQty);
        if (isNaN(qtyVal) || qtyVal <= 0) return;

        const newComp: ComponentItem = {
            id: Math.random().toString(36).substring(2, 9),
            name: newCompName.trim(),
            qty: qtyVal,
            unit: newCompUnit
        };

        setComponents(prev => [...prev, newComp]);
        setNewCompName('');
        setNewCompQty('');
    };

    const handleSelectPreset = (preset: typeof PRESET_COMPONENTS[0]) => {
        setNewCompName(preset.name);
        setNewCompUnit(preset.unit);
    };

    const handleRemoveComponent = (id: string) => {
        setComponents(prev => prev.filter(c => c.id !== id));
    };

    const handleEditComponent = (id: string, field: keyof ComponentItem, value: any) => {
        setComponents(prev => prev.map(c => {
            if (c.id === id) {
                if (field === 'qty') {
                    const num = parseFloat(value);
                    return { ...c, qty: isNaN(num) ? 0 : num };
                }
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    // BOM Operations
    const handleSaveSpecSheet = () => {
        if (!productName.trim()) {
            alert('Please specify a Product Name');
            return;
        }

        const id = currentBomId || Math.random().toString(36).substring(2, 9);
        const newSheet: BOMSheet = {
            id,
            productName: productName.trim(),
            wastagePct,
            matrix,
            components,
            updatedAt: new Date().toISOString()
        };

        const updatedBoms = boms.filter(b => b.id !== id);
        updatedBoms.unshift(newSheet);

        setBoms(updatedBoms);
        setCurrentBomId(id);
        localStorage.setItem('inv_boms', JSON.stringify(updatedBoms));
        alert('Spec Sheet saved successfully!');
    };

    const handleCreateNewBOM = () => {
        setCurrentBomId('');
        setProductName('New Product Specification');
        setWastagePct(4.5);
        setMatrix({});
        setComponents([]);
    };

    const handleLoadBOM = (id: string) => {
        if (!id) {
            handleCreateNewBOM();
            return;
        }
        const found = boms.find(b => b.id === id);
        if (found) {
            setCurrentBomId(found.id);
            setProductName(found.productName);
            setWastagePct(found.wastagePct);
            setMatrix(found.matrix || {});
            setComponents(found.components || []);
        }
    };

    const handleDeleteBOM = (id: string) => {
        if (!confirm('Are you sure you want to delete this Spec Sheet?')) return;
        const updatedBoms = boms.filter(b => b.id !== id);
        setBoms(updatedBoms);
        localStorage.setItem('inv_boms', JSON.stringify(updatedBoms));
        if (currentBomId === id) {
            handleCreateNewBOM();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header section with load and create options */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Spec Sheet (BOM) & Ratio Mixer</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Define full product specifications, hair blends, and physical materials.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={currentBomId}
                        onChange={(e) => handleLoadBOM(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-1 focus:ring-accent focus:outline-none max-w-[200px]"
                    >
                        <option value="">-- Load Saved Spec Sheet --</option>
                        {boms.map(b => (
                            <option key={b.id} value={b.id}>{b.productName}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleCreateNewBOM}
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <FilePlus size={16} />
                        <span>New Sheet</span>
                    </button>
                    {currentBomId && (
                        <button
                            onClick={() => handleDeleteBOM(currentBomId)}
                            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors shadow-sm"
                            title="Delete current BOM"
                        >
                            <Trash size={16} />
                        </button>
                    )}
                    <button
                        onClick={handleSaveSpecSheet}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        <Save size={18} />
                        <span>Save Spec Sheet</span>
                    </button>
                </div>
            </div>

            {/* Spec Sheet Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Product Line</label>
                    <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g. 7-Piece Clip-in Extension Set"
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-accent focus:outline-none text-gray-800 text-sm"
                    />
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Standard Wastage (%)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={wastagePct}
                        onChange={(e) => setWastagePct(parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-accent focus:outline-none text-gray-800 text-sm font-mono"
                    />
                </div>
            </div>

            {/* Main Tabs (Ratio Mixer vs Length Ratio Matrix) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="border-b border-gray-100 p-4 flex justify-between items-center bg-gray-50/50">
                    <div className="flex space-x-6">
                        <button
                            onClick={() => setActiveTab('mixer')}
                            className={`text-sm font-semibold pb-4 -mb-4 border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'mixer' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Sliders size={16} />
                            Ratio Mixer (Embedded)
                        </button>
                        <button
                            onClick={() => setActiveTab('matrix')}
                            className={`text-sm font-semibold pb-4 -mb-4 border-b-2 transition-colors flex items-center gap-2 ${
                                activeTab === 'matrix' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Layers size={16} />
                            Length Ratio Matrix Grid
                        </button>
                    </div>
                </div>

                <div className="p-1">
                    {activeTab === 'mixer' ? (
                        <div className="relative">
                            <div className="absolute top-3 right-4 z-10 flex gap-2">
                                <a
                                    href="/inh-ratio-mix/index.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/90 backdrop-blur border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition font-medium"
                                >
                                    Open Mixer in New Tab ↗
                                </a>
                            </div>
                            <iframe
                                src="/inh-ratio-mix/index.html"
                                className="w-full h-[780px] border-none rounded-xl"
                                title="Hair Ratio Mixer"
                            />
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="p-4 mb-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-xl">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                                    <FileText size={16} className="text-gray-500" /> Length Ratio Matrix
                                </h3>
                                <div className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                    <AlertCircle size={14} className="text-orange-500" /> Columns must equal exactly 100%
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-[500px] border border-gray-100 rounded-xl relative">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="text-xs text-gray-600 uppercase bg-gray-100 sticky top-0 z-20 shadow-sm pt-2">
                                        <tr>
                                            <th className="px-4 py-3 sticky left-0 bg-gray-100 z-30 shadow-[1px_0_0_#eee] w-24">Raw input ↓</th>
                                            {FINISHED_LENGTHS.map(finLen => (
                                                <th key={finLen} className="px-3 py-3 text-center border-l border-gray-200 min-w-[80px]">
                                                    {finLen}" Out
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {RAW_LENGTHS.map(rawLen => (
                                            <tr key={rawLen} className="hover:bg-blue-50/30">
                                                <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_#eee]">
                                                    {rawLen}" Raw
                                                </td>
                                                {FINISHED_LENGTHS.map(finLen => {
                                                    const val = matrix[finLen]?.[rawLen];
                                                    return (
                                                        <td key={finLen} className="px-2 py-1 border-l border-gray-100 bg-white">
                                                            <input
                                                                type="number"
                                                                placeholder="-"
                                                                value={val === undefined ? '' : val}
                                                                onChange={(e) => handleCellChange(finLen, rawLen, e.target.value)}
                                                                className="w-full text-center py-1.5 focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-accent rounded transition-colors text-gray-700 text-sm font-mono"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_0_#eee] bg-gray-50 font-medium">
                                        <tr>
                                            <td className="px-4 py-3 sticky left-0 bg-gray-50 z-30 shadow-[1px_0_0_#eee]">Col Total</td>
                                            {FINISHED_LENGTHS.map(finLen => {
                                                const total = getColTotal(finLen);
                                                const valid = isColValid(finLen);
                                                const hasData = total > 0;
                                                return (
                                                    <td key={finLen} className="px-2 py-2 border-l border-gray-200 bg-gray-50 text-center">
                                                        <span className={`inline-block w-full rounded py-1 text-xs ${hasData ? (valid ? 'bg-green-100 text-green-700 font-bold' : 'bg-red-100 text-red-700 font-bold') : 'text-gray-400'}`}>
                                                            {total}%
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Additional Components Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <Plus className="text-accent" size={20} />
                        Additional Components (BOM)
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">Manage additional accessories, materials, and hardware required for the final product line.</p>
                </div>

                {/* Form and Preset Selectors */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                    {/* Presets Card */}
                    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Presets</span>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COMPONENTS.map(p => (
                                <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleSelectPreset(p)}
                                    className="bg-white border border-gray-200 hover:border-accent text-gray-700 text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                                    <span>{p.name.split(' (')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Form */}
                    <form onSubmit={handleAddComponent} className="lg:col-span-2 border border-gray-100 rounded-xl p-4 space-y-4 bg-white flex flex-col justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Component Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 3-hole Clip (Black)"
                                    value={newCompName}
                                    onChange={(e) => setNewCompName(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-accent focus:outline-none text-sm text-gray-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Quantity Required</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Quantity"
                                    value={newCompQty}
                                    onChange={(e) => setNewCompQty(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-accent focus:outline-none text-sm text-gray-800 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                                <select
                                    value={newCompUnit}
                                    onChange={(e) => setNewCompUnit(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-accent focus:outline-none text-sm text-gray-800 bg-white"
                                >
                                    <option value="pcs">Pieces (pcs)</option>
                                    <option value="grams">Grams (g)</option>
                                    <option value="meters">Meters (m)</option>
                                    <option value="yards">Yards (yd)</option>
                                    <option value="packs">Packs</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-primary hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Plus size={14} /> Add Component
                            </button>
                        </div>
                    </form>
                </div>

                {/* Added Components List Table */}
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Component Name</th>
                                <th className="px-6 py-3 w-40 text-center">Quantity</th>
                                <th className="px-6 py-3 w-40 text-center">Unit</th>
                                <th className="px-6 py-3 w-24 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components.map(comp => (
                                <tr key={comp.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        <input
                                            type="text"
                                            value={comp.name}
                                            onChange={(e) => handleEditComponent(comp.id, 'name', e.target.value)}
                                            className="w-full bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-gray-200 focus:border-accent border rounded px-2 py-1 transition text-sm focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="number"
                                            value={comp.qty === 0 ? '' : comp.qty}
                                            onChange={(e) => handleEditComponent(comp.id, 'qty', e.target.value)}
                                            className="w-24 bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-gray-200 focus:border-accent border rounded px-2 py-1 text-center transition font-mono text-sm focus:outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <select
                                            value={comp.unit}
                                            onChange={(e) => handleEditComponent(comp.id, 'unit', e.target.value)}
                                            className="bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-gray-200 focus:border-accent border rounded px-2 py-1 transition text-sm focus:outline-none"
                                        >
                                            <option value="pcs">pcs</option>
                                            <option value="grams">grams</option>
                                            <option value="meters">meters</option>
                                            <option value="yards">yards</option>
                                            <option value="packs">packs</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRemoveComponent(comp.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                            title="Delete component"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">
                                        No additional components added yet. Use the form above to add clips, elastic bands, boxes, etc.
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

