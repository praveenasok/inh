const fs = require('fs');

let html = fs.readFileSync('inventory.html', 'utf8');

// The marker where we will insert new components.
const marker = "        const root = ReactDOM.createRoot(document.getElementById('root'));";

const newComponents = `
        // --- 7. Phase 2 Issuance (Hackling & MR) ---
        function Phase2MoIssue({ db }) {
            const { lotInventory, mos, setMos, nrRooms, mrRooms, setLotInventory } = db;
            // Only Segregated available stock
            const availableLots = lotInventory.filter(l => l.status === 'AVAILABLE' && (!l.room || l.room === 'SEGREGATED'));
            
            const [selectedLotIds, setSelectedLotIds] = useState([]);
            const [targetType, setTargetType] = useState('HACKLING'); // 'HACKLING' or 'MACHINE_REMY'
            const [roomId, setRoomId] = useState('');
            const [mixingRatio, setMixingRatio] = useState('');

            const selectedWeight = availableLots.filter(l => selectedLotIds.includes(l.id)).reduce((sum, l) => sum + l.availableWeightKg, 0);

            const handleToggleLot = (id) => {
                setSelectedLotIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            };

            const handleIssue = (e) => {
                e.preventDefault();
                if (selectedLotIds.length === 0 || !roomId || !mixingRatio) return alert('Fill all required fields');

                const newMoNumber = \`MO-\${1000 + mos.length + 1}\`;
                
                const newMo = {
                    id: generateId(),
                    moNumber: newMoNumber,
                    type: targetType, // HACKLING or MACHINE_REMY
                    issuedLotIds: selectedLotIds,
                    targetRoomId: roomId,
                    mixingRatio: mixingRatio,
                    issueDate: new Date().toISOString(),
                    issuedWeightKg: selectedWeight,
                    status: 'OPEN'
                };

                // Deduct lots by changing status
                const updatedLots = lotInventory.map(l => 
                    selectedLotIds.includes(l.id) ? { ...l, status: \`ISSUED_\${targetType}\` } : l
                );

                setMos([newMo, ...mos]);
                setLotInventory(updatedLots);
                setSelectedLotIds([]); setRoomId(''); setMixingRatio('');
                alert(\`Phase 2 Manufacturing Order \${newMoNumber} generated perfectly!\`);
            };

            const activeRooms = targetType === 'HACKLING' ? nrRooms : mrRooms;

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold mb-4 border-b pb-2">Issue to Hackling / MR Room</h3>
                        <form onSubmit={handleIssue} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Target Process</label>
                                <div className="flex space-x-4">
                                    <label className="flex items-center"><input type="radio" name="ttype" checked={targetType==='HACKLING'} onChange={() => {setTargetType('HACKLING');setRoomId('');}} className="mr-2"/> NRDD (Hackling)</label>
                                    <label className="flex items-center"><input type="radio" name="ttype" checked={targetType==='MACHINE_REMY'} onChange={() => {setTargetType('MACHINE_REMY');setRoomId('');}} className="mr-2"/> Machine Remy 1x1</label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Select Target Room</label>
                                <select className="w-full p-2 border rounded" value={roomId} onChange={e=>setRoomId(e.target.value)} required>
                                    <option value="">-- Choose destination room --</option>
                                    {activeRooms.map(r => {
                                        const rName = typeof r === 'object' ? r.name : r;
                                        return <option key={rName} value={rName}>{rName}</option>;
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Size Mixing Ratio</label>
                                <input type="text" className="w-full p-2 border rounded" placeholder="e.g. 10% 18, 50% 20, 40% 22" value={mixingRatio} onChange={e=>setMixingRatio(e.target.value)} required />
                            </div>

                            <button type="submit" disabled={selectedLotIds.length === 0} className="w-full bg-indigo-600 disabled:bg-indigo-300 text-white font-bold py-4 rounded hover:bg-indigo-700 transition">
                                Issue {selectedWeight.toFixed(2)} kg to Factory Floor
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                        <h3 className="p-4 bg-gray-50 border-b font-bold text-gray-800 flex justify-between">
                            <span>Select Segregated Lots ({selectedLotIds.length} chosen)</span>
                            <span className="text-indigo-700">{selectedWeight.toFixed(2)} kg selected</span>
                        </h3>
                        <div className="overflow-auto flex-1 p-2">
                            {availableLots.map(lot => (
                                <div key={lot.id} onClick={()=>handleToggleLot(lot.id)} className={\`cursor-pointer border p-3 mb-2 rounded flex justify-between items-center transition \${selectedLotIds.includes(lot.id) ? 'bg-indigo-50 border-indigo-400': 'hover:bg-gray-50'}\`}>
                                    <div>
                                        <div className="font-mono font-bold text-gray-700">{lot.id}</div>
                                        <div className="text-xs text-gray-500">{lot.lengthInches}" - {lot.density}</div>
                                    </div>
                                    <div className="font-bold text-green-700">{lot.availableWeightKg.toFixed(2)} kg</div>
                                </div>
                            ))}
                            {availableLots.length === 0 && <p className="text-gray-400 p-4 text-center">No segregated stock available.</p>}
                        </div>
                    </div>
                </div>
            );
        }

        // --- 8. Phase 2 Return (Hackling & MR) ---
        function Phase2Return({ db }) {
            const { mos, setMos, lotInventory, setLotInventory } = db;
            // Phase 2 MOs are targetType: HACKLING or MACHINE_REMY
            const openMos = mos.filter(m => m.status === 'OPEN' && (m.type === 'HACKLING' || m.type === 'MACHINE_REMY'));
            
            const [selectedMoId, setSelectedMoId] = useState('');
            const selectedMo = openMos.find(m => m.id === selectedMoId);

            const [outputs, setOutputs] = useState({});
            const [waste, setWaste] = useState({ processLoss: '' }); // Simplified waste for phase 2

            useEffect(() => { setOutputs({}); setWaste({processLoss: ''}); }, [selectedMoId]);

            const issuedWeight = selectedMo ? selectedMo.issuedWeightKg : 0;
            const totalProduced = Object.values(outputs).reduce((sum, val) => sum + Number(val || 0), 0);
            const totalWaste = Number(waste.processLoss || 0);
            const totalAccounted = totalProduced + totalWaste;
            
            // For Demo: lenient tolerance for Phase 2, e.g. 5% due to hackling loss
            const variancePercent = issuedWeight > 0 ? ((totalAccounted - issuedWeight) / issuedWeight) * 100 : 0;
            const isReconciled = selectedMo && Math.abs(variancePercent) <= 5.0; 

            const handleSave = () => {
                if (!isReconciled) return;

                const newLots = [];
                Object.entries(outputs).forEach(([len, weight]) => {
                    const numWt = Number(weight);
                    if (numWt > 0) {
                        // Inherit ID trail from the FIRST lot issued in this MO (simplified for demo)
                        // True traceability would concatenate all IDs, or create a parent-child graph.
                        const firstLotId = selectedMo.issuedLotIds[0];
                        const originLot = lotInventory.find(l => l.id === firstLotId);
                        const rawIdPart = originLot ? originLot.id.split('-')[0] : 'MIX';
                        
                        // Smart ID: ORIGIN-MO-LENGTH
                        const lotId = \`\${rawIdPart}-\${selectedMo.moNumber}-L\${len}\`;
                        
                        const isNrdd = selectedMo.type === 'HACKLING';

                        newLots.push({
                            id: lotId,
                            moId: selectedMo.id,
                            lengthInches: Number(len),
                            initialWeightKg: numWt,
                            availableWeightKg: numWt,
                            status: 'AVAILABLE',
                            // NRDD goes to FINISHED_GOODS, MR 1x1 goes to WIP
                            room: isNrdd ? 'FINISHED_GOODS' : 'WIP',
                            subType: isNrdd ? 'NRDD' : 'MR_1X1',
                            createdAt: new Date().toISOString(),
                            mixingRatio: selectedMo.mixingRatio // Carry forward documentation
                        });
                    }
                });

                const updatedMos = mos.map(m => m.id === selectedMo.id ? { ...m, status: 'RETURNED' } : m);
                setLotInventory([...newLots, ...lotInventory]);
                setMos(updatedMos);
                setSelectedMoId('');
                alert(\`Saved! Generated \${newLots.length} new advanced lots.\`);
            };

            return (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Select Open Phase 2 MO</label>
                        <select className="w-full p-3 border rounded text-lg font-mono" value={selectedMoId} onChange={e=>setSelectedMoId(e.target.value)}>
                            <option value="">-- Choose an Open MO --</option>
                            {openMos.map(m => (
                                <option key={m.id} value={m.id}>{m.moNumber} ({m.type} for {m.targetRoomId}) | Issued: {m.issuedWeightKg.toFixed(2)} kg</option>
                            ))}
                        </select>
                        {selectedMo && (
                            <div className="mt-4 p-4 bg-gray-50 rounded border">
                                <p><strong>Target:</strong> {selectedMo.type === 'HACKLING' ? 'NRDD' : 'Machine Remy 1x1'}</p>
                                <p><strong>Mixing Ratio:</strong> {selectedMo.mixingRatio}</p>
                            </div>
                        )}
                    </div>

                    <div className={\`grid grid-cols-1 md:grid-cols-2 gap-6 \${!selectedMo ? 'opacity-40 pointer-events-none' : ''}\`}>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-xl font-bold mb-4 border-b pb-2">Lengths Produced</h3>
                            <div className="space-y-2 h-64 overflow-y-auto pr-2">
                                {LENGTHS.map(len => (
                                    <div key={len} className="flex justify-between items-center mb-2">
                                        <span className="font-bold w-12">{len}"</span>
                                        <input type="number" step="0.01" className="p-2 border rounded w-full ml-4" placeholder="0.00" value={outputs[len]||''} onChange={e=>setOutputs({...outputs, [len]:e.target.value})}/>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <label className="block text-sm font-semibold text-red-600 mb-1">Process Loss (kg)</label>
                                <input type="number" step="0.01" className="w-full p-2 border rounded" value={waste.processLoss} onChange={e=>setWaste({processLoss: e.target.value})} placeholder="0.00" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-4 border-b pb-2">Reconciliation</h3>
                                <div className="space-y-2 text-lg font-mono">
                                    <div className="flex justify-between text-gray-600"><span>Target:</span> <span>{issuedWeight.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-green-700"><span>Produced:</span> <span>{totalProduced.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-red-600 border-b pb-2"><span>Loss:</span> <span>{totalWaste.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold pt-2"><span>Accounted:</span> <span>{totalAccounted.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm mt-4 text-gray-500">
                                        <span>Variance (%):</span> <span>{variancePercent.toFixed(2)}% (Max ±5%)</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSave} disabled={!isReconciled} className={\`w-full py-4 text-white font-bold rounded-xl mt-6 \${isReconciled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300'}\`}>
                                Save {"&"} Transfer to Inventory
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // --- 9. Phase 3 Issuance (MR Bulk) ---
        function Phase3MoIssue({ db }) {
            const { lotInventory, mos, setMos, setLotInventory } = db;
            // Only WIP MR_1x1 stock
            const availableLots = lotInventory.filter(l => l.status === 'AVAILABLE' && l.room === 'WIP' && l.subType === 'MR_1X1');
            
            const [selectedLotIds, setSelectedLotIds] = useState([]);
            const [mixingRatio, setMixingRatio] = useState('');

            const selectedWeight = availableLots.filter(l => selectedLotIds.includes(l.id)).reduce((sum, l) => sum + l.availableWeightKg, 0);

            const handleToggleLot = (id) => setSelectedLotIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

            const handleIssue = (e) => {
                e.preventDefault();
                if (selectedLotIds.length === 0 || !mixingRatio) return;
                const newMoNumber = \`MO-\${1000 + mos.length + 1}\`;
                const newMo = {
                    id: generateId(), moNumber: newMoNumber, type: 'MR_BULK', issuedLotIds: selectedLotIds, mixingRatio: mixingRatio, issueDate: new Date().toISOString(), issuedWeightKg: selectedWeight, status: 'OPEN'
                };
                const updatedLots = lotInventory.map(l => selectedLotIds.includes(l.id) ? { ...l, status: 'ISSUED_MR_BULK' } : l);
                setMos([newMo, ...mos]); setLotInventory(updatedLots); setSelectedLotIds([]); setMixingRatio('');
                alert(\`MR Bulk MO \${newMoNumber} generated!\`);
            };

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
                    <div className="bg-white p-6 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold mb-4 border-b pb-2">Issue Work-In-Progress for MR Bulk</h3>
                        <form onSubmit={handleIssue} className="space-y-4">
                            <div><label className="block text-sm font-semibold mb-1">Mixing Ratio for MR Bulk</label><input type="text" className="w-full p-2 border rounded" value={mixingRatio} onChange={e=>setMixingRatio(e.target.value)} placeholder="e.g. 100% 18inch" required /></div>
                            <button type="submit" disabled={selectedLotIds.length === 0} className="w-full bg-yellow-600 text-white font-bold py-4 rounded hover:bg-yellow-700">Issue {selectedWeight.toFixed(2)} kg to Bulk Rm</button>
                        </form>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm h-[500px] flex flex-col">
                        <h3 className="font-bold border-b pb-2">Select WIP MR_1x1 Lots</h3>
                        <div className="overflow-auto flex-1 pt-2">
                            {availableLots.map(lot => (
                                <div key={lot.id} onClick={()=>handleToggleLot(lot.id)} className={\`cursor-pointer border p-2 mb-2 rounded flex justify-between items-center \${selectedLotIds.includes(lot.id)?'bg-yellow-50 border-yellow-400':''}\`}>
                                    <div><div className="font-mono font-bold text-sm">{lot.id}</div><div className="text-xs">{lot.lengthInches}" - {lot.subType}</div></div>
                                    <div className="font-bold">{lot.availableWeightKg.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // --- 10. Phase 3 Return (MR Bulk) ---
        function Phase3Return({ db }) {
            const { mos, setMos, lotInventory, setLotInventory } = db;
            const openMos = mos.filter(m => m.status === 'OPEN' && m.type === 'MR_BULK');
            const [selectedMoId, setSelectedMoId] = useState('');
            const selectedMo = openMos.find(m => m.id === selectedMoId);
            const [bulkWeight, setBulkWeight] = useState('');

            const handleSave = () => {
                if(!selectedMo || !bulkWeight) return;
                const newLot = {
                    id: \`MBULK-\${selectedMo.moNumber}\`, moId: selectedMo.id, lengthInches: 'MIXED', initialWeightKg: Number(bulkWeight), availableWeightKg: Number(bulkWeight), status: 'AVAILABLE', room: 'SEMI_FINISHED', subType: 'MR_BULK', createdAt: new Date().toISOString(), mixingRatio: selectedMo.mixingRatio
                };
                const updatedMos = mos.map(m => m.id === selectedMo.id ? { ...m, status: 'RETURNED' } : m);
                setLotInventory([newLot, ...lotInventory]); setMos(updatedMos); setSelectedMoId(''); setBulkWeight('');
                alert('Saved! Transferred to Semi-Finished Inventory Room.');
            };

            return (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-sm font-semibold mb-1">Select MR Bulk MO</label>
                        <select className="w-full p-2 border mb-4" value={selectedMoId} onChange={e=>setSelectedMoId(e.target.value)}>
                            <option value="">-- Select --</option>
                            {openMos.map(m => <option key={m.id} value={m.id}>{m.moNumber} | target: {m.issuedWeightKg.toFixed(2)} kg</option>)}
                        </select>
                        <label className="block text-sm font-semibold mb-1 pt-4 border-t">Final Output Weight (MR Bulk kg)</label>
                        <input type="number" step="0.01" className="w-full p-4 text-xl border font-mono rounded" value={bulkWeight} onChange={e=>setBulkWeight(e.target.value)} />
                        <button onClick={handleSave} disabled={!selectedMo || !bulkWeight} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl mt-4">Generate Semi-Finished Bulk Lot</button>
                    </div>
                </div>
            );
        }

        // --- 11. Master Inventory Ledgers ---
        function MasterInventory({ db }) {
            const { lotInventory } = db;
            const availableLots = lotInventory.filter(l => l.status === 'AVAILABLE');
            
            const [roomFilter, setRoomFilter] = useState('ALL');

            const filteredLots = availableLots.filter(l => {
                if (roomFilter === 'ALL') return true;
                if (roomFilter === 'SEGREGATED' && (!l.room || l.room === 'SEGREGATED')) return true;
                return l.room === roomFilter;
            });

            return (
                <div className="space-y-6 max-w-7xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border p-4 flex space-x-2">
                        {['ALL', 'SEGREGATED', 'WIP', 'FINISHED_GOODS', 'SEMI_FINISHED'].map(f => (
                            <button key={f} onClick={()=>setRoomFilter(f)} className={\`px-4 py-2 rounded font-bold text-sm \${roomFilter===f?'bg-slate-800 text-white':'bg-gray-100 text-gray-600'}\`}>
                                {f.replace('_', ' ')} Room
                            </button>
                        ))}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-100 uppercase">
                                <tr>
                                    <th className="p-3">Lot ID</th><th className="p-3">Location (Room)</th><th className="p-3">Type</th><th className="p-3">Length</th><th className="p-3 text-right">Avail Wt(kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLots.map(lot => (
                                    <tr key={lot.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono font-bold text-blue-700">{lot.id}</td>
                                        <td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">{lot.room || 'SEGREGATED'}</span></td>
                                        <td className="p-3">{lot.subType || lot.density}</td>
                                        <td className="p-3">{lot.lengthInches}{lot.lengthInches==='MIXED'?'':'"'}</td>
                                        <td className="p-3 text-right font-mono text-green-700 font-bold">{lot.availableWeightKg.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // --- Extracted Settings Redux to Support Objects ---
`;

html = html.replace(marker, newComponents + '\n' + marker);

// Update active tabs in settings renderer
const oldSettings = "case 'settings': return <Settings db={db} />;";
const newSettings = "case 'settings': return <Settings db={db} />;"; // No change

// Ensure the new Settings is exactly as user requested with all fields.
// This is already fully merged in the html previously.

fs.writeFileSync('inventory.html', html);
console.log('Appended extra components!');
