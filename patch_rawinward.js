const fs = require('fs');

let html = fs.readFileSync('inventory.html', 'utf8');

const regex = /\/\/ \-\-\- 2\. Raw Material Inward Component \-\-\-[\s\S]*?(?=\/\/ \-\-\- 3\. MO Generation Component \-\-\-)/;

const replacement = `// --- 2. Raw Material Inward Component ---
        function RawInward({ db }) {
            const { suppliers, rawLots, setRawLots } = db;
            const [formData, setFormData] = useState({ supplierId: '', supplyDate: new Date().toISOString().split('T')[0], density: '1x1' });
            const [entries, setEntries] = useState([{ length: '', weight: '', rate: '' }]);

            const getTotalWeight = () => entries.reduce((sum, e) => sum + Number(e.weight || 0), 0);
            const getTotalAmount = () => entries.reduce((sum, e) => sum + (Number(e.weight || 0) * Number(e.rate || 0)), 0);

            const handleAddEntry = () => setEntries([...entries, { length: '', weight: '', rate: '' }]);
            const handleRemoveEntry = (idx) => setEntries(entries.filter((_, i) => i !== idx));
            const handleChangeEntry = (idx, field, val) => {
                const newEntries = [...entries];
                newEntries[idx][field] = val;
                setEntries(newEntries);
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!formData.supplierId || entries.length === 0) return alert('Fill required fields');
                
                const totalWeight = getTotalWeight();
                if (totalWeight <= 0) return alert('Total weight must be greater than 0');

                const newLot = {
                    id: \`RAW-\${Date.now().toString().slice(-6)}\`,
                    ...formData,
                    grossWeightKg: totalWeight,
                    availableWeightKg: totalWeight,
                    totalAmount: getTotalAmount(),
                    details: entries,
                    status: 'AVAILABLE'
                };
                setRawLots([newLot, ...rawLots]);
                setEntries([{ length: '', weight: '', rate: '' }]);
                alert('Raw material added successfully with its lengths breakdown!');
            };

            return (
                <div className="space-y-6 max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold mb-4 border-b pb-2">New Raw Purchase Entry</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Supplier</label>
                                    <select className="w-full p-2 border rounded" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} required>
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shortCode})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Supply Date</label>
                                    <input type="date" className="w-full p-2 border rounded" value={formData.supplyDate} onChange={e => setFormData({ ...formData, supplyDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Density</label>
                                    <select className="w-full p-2 border rounded" value={formData.density} onChange={e => setFormData({ ...formData, density: e.target.value })}>
                                        <option value="1x1">1x1 Non-Remy</option>
                                        <option value="2x2">2x2 Non-Remy</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="mt-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Lengths & Rates Breakdown</h4>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
                                        <div className="col-span-3">Length (Inches)</div>
                                        <div className="col-span-3">Weight (kg)</div>
                                        <div className="col-span-3">Rate/kg (₹)</div>
                                        <div className="col-span-2 text-right">Amount (₹)</div>
                                        <div className="col-span-1 border-gray-800"></div>
                                    </div>
                                    {entries.map((entry, idx) => {
                                        const amount = (Number(entry.weight || 0) * Number(entry.rate || 0)).toFixed(2);
                                        return (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded">
                                                <div className="col-span-3">
                                                    <select className="w-full p-2 border rounded" value={entry.length} onChange={e => handleChangeEntry(idx, 'length', e.target.value)} required>
                                                        <option value="">-- Length --</option>
                                                        {LENGTHS.map(l => <option key={l} value={l}>{l}"</option>)}
                                                        <option value="MIXED">Mixed / Unsorted</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-3">
                                                    <input type="number" step="0.01" min="0.01" className="w-full p-2 border rounded" placeholder="0.00" value={entry.weight} onChange={e => handleChangeEntry(idx, 'weight', e.target.value)} required />
                                                </div>
                                                <div className="col-span-3">
                                                    <input type="number" step="0.01" min="0" className="w-full p-2 border rounded" placeholder="0.00" value={entry.rate} onChange={e => handleChangeEntry(idx, 'rate', e.target.value)} required />
                                                </div>
                                                <div className="col-span-2 text-right font-mono font-bold text-gray-700">
                                                    ₹{amount}
                                                </div>
                                                <div className="col-span-1 text-center">
                                                    {entries.length > 1 && (
                                                        <button type="button" onClick={() => handleRemoveEntry(idx)} className="text-red-500 hover:bg-red-100 p-1 rounded transition">🗑️</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button type="button" onClick={handleAddEntry} className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center transition">
                                    <span className="mr-1 text-lg leading-none">+</span> Add Another Length
                                </button>
                                
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0 text-sm">
                                    <div>
                                        <span className="font-semibold text-blue-800">Total Weight: </span>
                                        <span className="text-lg font-bold font-mono text-blue-900 ml-1">{getTotalWeight().toFixed(2)} kg</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-blue-800">Invoice Amount: </span>
                                        <span className="text-lg font-bold font-mono text-blue-900 ml-1">₹{getTotalAmount().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition mt-4 shadow-sm">Save Complete Purchase Receipt</button>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <h3 className="p-4 bg-gray-50 border-b font-bold text-gray-800">Historical Raw Purchases</h3>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 text-gray-600 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="p-3">Raw Lot ID</th>
                                    <th className="p-3">Supplier</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3 text-center">Density</th>
                                    <th className="p-3 text-right">Invoice / Wt</th>
                                    <th className="p-3">Breakdown</th>
                                    <th className="p-3 text-right">Available Wt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rawLots.map(lot => {
                                    const sup = suppliers.find(s => s.id === lot.supplierId);
                                    return (
                                        <tr key={lot.id} className="hover:bg-blue-50 transition">
                                            <td className="p-3 font-mono font-bold text-blue-700">
                                                {lot.id}
                                                <div className={\`mt-1 px-2 py-0.5 text-[10px] w-max uppercase font-bold tracking-wider rounded-full \${lot.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}\`}>{lot.status}</div>
                                            </td>
                                            <td className="p-3">{sup ? sup.name : 'Unknown'}</td>
                                            <td className="p-3 text-gray-500">{formatDate(lot.supplyDate)}</td>
                                            <td className="p-3 text-center"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{lot.density}</span></td>
                                            <td className="p-3 text-right">
                                                <div className="font-mono font-bold text-gray-700">
                                                    {lot.totalAmount ? \`₹\${lot.totalAmount.toFixed(2)}\` : '-'}
                                                </div>
                                                <div className="text-xs text-gray-500">for {lot.grossWeightKg}kg</div>
                                            </td>
                                            <td className="p-3 text-xs">
                                                {lot.details ? (
                                                    <details className="cursor-pointer">
                                                        <summary className="font-semibold text-indigo-600 outline-none">View {lot.details.length} Lengths</summary>
                                                        <div className="mt-2 text-[10px] space-y-1 bg-white p-2 rounded shadow-sm border border-gray-200 min-w-40 border">
                                                            {lot.details.map((d, i) => (
                                                                <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                                                                    <span className="font-bold">{d.length}" :</span>
                                                                    <span className="font-mono text-gray-600">{Number(d.weight).toFixed(2)}kg <span className="opacity-50">@ ₹{d.rate}</span></span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                ) : <span className="text-gray-400 italic">Legacy Lot (No Detail)</span>}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-green-700 text-lg">
                                                {lot.availableWeightKg.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {rawLots.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No raw materials recorded yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

`;

if (!regex.test(html)) {
    console.log('Regex did NOT match!');
    const str = html.substring(html.indexOf('// --- 2. Raw Material Inward Component ---'), html.indexOf('// --- 2. Raw Material Inward Component ---') + 2000);
    console.log('Sample format:', str);
} else {
    html = html.replace(regex, replacement);
    fs.writeFileSync('inventory.html', html);
    console.log('Patcher completed successfully!');
}
