const fs = require('fs');

let html = fs.readFileSync('inventory.html', 'utf8');

// 1. Update State
html = html.replace(
    /const \[teams, setTeams\] = useLocalStorage\('teams', \[[\s\S]*?\]\);/,
    `$&
            const [nrRooms, setNrRooms] = useLocalStorage('nrRooms', []);
            const [mrRooms, setMrRooms] = useLocalStorage('mrRooms', []);`
);

// Update DB
html = html.replace(
    /const db = { suppliers, rawLots, mos, lotInventory, teams, setSuppliers, setRawLots, setMos, setLotInventory, setTeams };/,
    `const db = { suppliers, rawLots, mos, lotInventory, teams, nrRooms, mrRooms, setSuppliers, setRawLots, setMos, setLotInventory, setTeams, setNrRooms, setMrRooms };`
);

// 2. Add New Tabs to renderContent
html = html.replace(
    /case 'finished-inventory': return <FinishedInventory db=\{db\} \/>;/,
    `case 'finished-inventory': return <FinishedInventory db={db} />;
                    case 'phase2-issue': return <Phase2MoIssue db={db} />;
                    case 'phase2-return': return <Phase2Return db={db} />;
                    case 'phase3-issue': return <Phase3MoIssue db={db} />;
                    case 'phase3-return': return <Phase3Return db={db} />;`
);

// 3. Add Sidebar Buttons
html = html.replace(
    /<SidebarBtn active=\{activeTab === 'finished-inventory'\} onClick=\{\(\) => setActiveTab\('finished-inventory'\)\} icon="📦">4. Finished Stock<\/SidebarBtn>/,
    `<SidebarBtn active={activeTab === 'finished-inventory'} onClick={() => setActiveTab('finished-inventory')} icon="📦">4. Segregated Stock</SidebarBtn>
                            
                            <div className="text-xs font-bold text-slate-500 uppercase px-4 mt-6 mb-2 tracking-wider">Adv. Manufacturing</div>
                            <SidebarBtn active={activeTab === 'phase2-issue'} onClick={() => setActiveTab('phase2-issue')} icon="📋">5. NR/MR Issue</SidebarBtn>
                            <SidebarBtn active={activeTab === 'phase2-return'} onClick={() => setActiveTab('phase2-return')} icon="⚖️">6. NR/MR Return</SidebarBtn>
                            <SidebarBtn active={activeTab === 'phase3-issue'} onClick={() => setActiveTab('phase3-issue')} icon="📋">7. Bulk Mix Issue</SidebarBtn>
                            <SidebarBtn active={activeTab === 'phase3-return'} onClick={() => setActiveTab('phase3-return')} icon="⚖️">8. Bulk Return</SidebarBtn>
                            
                            <div className="text-xs font-bold text-slate-500 uppercase px-4 mt-6 mb-2 tracking-wider">Master Ledgers</div>
                            <SidebarBtn active={activeTab === 'master-inventory'} onClick={() => setActiveTab('master-inventory')} icon="🏛️">Master Inventory</SidebarBtn>`
);

// Ensure master-inventory is handled in renderContent
html = html.replace(
    /case 'finished-inventory': return <FinishedInventory db=\{db\} \/>;/,
    `case 'finished-inventory': return <FinishedInventory db={db} />;
                    case 'master-inventory': return <MasterInventory db={db} />;`
);

// 4. Update lot generation in SegregationReturn to add room: 'SEGREGATED'
html = html.replace(
    /status: 'AVAILABLE',/,
    `status: 'AVAILABLE',
                            room: 'SEGREGATED',`
);

// Wait, we also need lotInventory to only show 'SEGREGATED' in FinishedInventory
html = html.replace(
    /const availableLots = lotInventory.filter\(l => l.status === 'AVAILABLE'\);/g,
    `const availableLots = lotInventory.filter(l => l.status === 'AVAILABLE' && (!l.room || l.room === 'SEGREGATED'));`
);
html = html.replace( // Change FinishedInventory title
    /<h2 className="text-2xl font-bold text-gray-800">Finished Segregated Stock<\/h2>/,
    `<h2 className="text-2xl font-bold text-gray-800">Segregated Stock (Available for Processing)</h2>`
);

fs.writeFileSync('inventory.html', html);
console.log("Patch 1 applied!");
