const fs = require('fs');

let html = fs.readFileSync('backup_inventory.html', 'utf8');

// 1. Replace HEAD 
const newHead = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>INH Factory | Advanced Operating System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #4F46E5; --primary-hover: #4338CA; --bg-main: #f8fafc; --text-main: #0f172a; }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg-main); color: var(--text-main); margin: 0; -webkit-font-smoothing: antialiased; }
        h1, h2, h3, h4, h5, h6, .font-heading { font-family: 'Outfit', sans-serif; }
        
        .glass-sidebar { background: #0b1120; border-right: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 4px 0 24px rgba(0,0,0,0.2); }
        .glass-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: box-shadow 0.3s ease; }
        .glass-card:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025); }
        
        .input-field { width: 100%; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.625rem 1rem; color: #1e293b; font-size: 0.875rem; transition: all 0.2s ease; outline: none; }
        .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); background-color: #ffffff; }
        
        .btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 0.75rem; transition: all 0.2s ease; border: none; cursor: pointer; display: inline-flex; justify-content: center; align-items: center; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 12px -2px rgba(79, 70, 229, 0.3); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .btn-secondary { background: #f1f5f9; color: #334155; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 0.75rem; transition: all 0.2s ease; border: 1px solid #e2e8f0; cursor: pointer; }
        .btn-secondary:hover { background: #e2e8f0; }

        .sidebar-link { color: #94a3b8; padding: 0.875rem 1.25rem; border-radius: 0.5rem; margin-bottom: 0.25rem; display: flex; align-items: center; transition: all 0.2s ease; font-size: 0.875rem; font-weight: 500; }
        .sidebar-link:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }
        .sidebar-active { background: rgba(79, 70, 229, 0.15); color: #fff; font-weight: 600; box-shadow: inset 3px 0 0 var(--primary); }

        .badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
        .badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-gray { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .badge-yellow { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .badge-indigo { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }

        .table-container { border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; background: white; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
        .custom-table { width: 100%; text-align: left; border-collapse: collapse; }
        .custom-table th { background: #f8fafc; padding: 1rem 1.25rem; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
        .custom-table td { padding: 1rem 1.25rem; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .custom-table tr:last-child td { border-bottom: none; }
        .custom-table tbody tr:hover { background: #f8fafc; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body class="bg-slate-50">
<div id="root"></div>`;

const headStart = html.indexOf('<!DOCTYPE html>');
const rootEnd = html.indexOf('<div id="root"></div>') + 21;
if (headStart !== -1 && rootEnd !== -1) {
    html = newHead + html.substring(rootEnd);
}

// 2. Replace App component Layout exact literal
const beforeLayout = `// --- Sidebar Button Component ---
        function SidebarBtn({ active, onClick, children, icon }) {`;

const afterLayout = `// --- 1. Dashboard Component ---`;

const newAppLayout = `
        const SidebarBtn = ({ active, onClick, children, icon }) => (
            <button onClick={onClick} className={\`w-full text-left sidebar-link \${active ? 'sidebar-active' : ''}\`}>
                <span className="mr-3 text-lg opacity-80">{icon}</span>{children}
            </button>
        );

        return (
            <div className="flex h-screen overflow-hidden bg-slate-50">
                <div className="w-72 glass-sidebar flex flex-col h-full text-slate-300 z-20">
                    <div className="p-6 border-b border-white/5 bg-slate-900/50">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg font-heading text-xl tracking-tighter">INH</div>
                            <div>
                                <h1 className="text-lg font-heading font-bold text-white tracking-tight leading-none">OS.Factory</h1>
                                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mt-1">Enterprise Core</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3 mt-4">Overview</div>
                        <SidebarBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="⌘">Dashboard</SidebarBtn>
                        
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3 mt-8">Primary Processing</div>
                        <SidebarBtn active={activeTab === 'raw-inward'} onClick={() => setActiveTab('raw-inward')} icon="📥">1. Raw Inward</SidebarBtn>
                        <SidebarBtn active={activeTab === 'mo-issue'} onClick={() => setActiveTab('mo-issue')} icon="📤">2. Factory Issue</SidebarBtn>
                        <SidebarBtn active={activeTab === 'segregation'} onClick={() => setActiveTab('segregation')} icon="⚖️">3. Process Return</SidebarBtn>
                        
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3 mt-8">Adv. Manufacturing</div>
                        <SidebarBtn active={activeTab === 'phase2-issue'} onClick={() => setActiveTab('phase2-issue')} icon="🔄">5. NR/MR Issue</SidebarBtn>
                        <SidebarBtn active={activeTab === 'phase2-return'} onClick={() => setActiveTab('phase2-return')} icon="✨">6. NR/MR Return</SidebarBtn>
                        <SidebarBtn active={activeTab === 'phase3-issue'} onClick={() => setActiveTab('phase3-issue')} icon="🧶">7. Bulk Mix Issue</SidebarBtn>
                        <SidebarBtn active={activeTab === 'phase3-return'} onClick={() => setActiveTab('phase3-return')} icon="✅">8. Bulk Return</SidebarBtn>
                        
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3 mt-8">Management</div>
                        <SidebarBtn active={activeTab === 'master-inventory'} onClick={() => setActiveTab('master-inventory')} icon="🏛️">Master Ledgers</SidebarBtn>
                        <SidebarBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon="⚙️">System Settings</SidebarBtn>
                    </nav>
                </div>

                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 z-10 transition-all">
                        <h2 className="text-2xl font-heading font-bold text-slate-800 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-semibold text-slate-500">Administrator System</span>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">A</div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto p-10 fade-in relative max-w-[1600px] w-full mx-auto">
                        {renderContent()}
                    </main>
                </div>
            </div>
        );
    }
`;

const sidebarString = html.indexOf(beforeLayout);
const dashStart = html.indexOf(afterLayout);

if (sidebarString !== -1 && dashStart !== -1) {
    let prePart = html.substring(0, sidebarString);
    // Find the place where the App return statement starts
    let appReturnStart = prePart.lastIndexOf('return (');
    if (appReturnStart !== -1) {
        html = prePart.substring(0, appReturnStart) + newAppLayout + "\n\n        " + html.substring(dashStart);
    }
} else {
    console.error("Layout split string not found");
}

// 3. Fix the missing tag and babel issue identified by subagent
html = html.replace('// --- 3. MO Generation Component ---', '// --- 3. MO Generation Component ---\n');

// 4. Global string patches
const replacements = [
    [/bg-white rounded-xl p-6 shadow-sm border border-gray-100/g, "glass-card p-6"],
    [/bg-white p-6 rounded-xl shadow-sm border border-gray-200/g, "glass-card p-8"],
    [/bg-white p-6 rounded-xl shadow-sm border border-gray-100/g, "glass-card p-8"],
    [/bg-white rounded-xl shadow-sm border border-gray-200 border border-t-0 rounded-t-none/g, "table-container rounded-t-none border-t-0"],
    [/bg-white rounded-xl shadow-sm border border-gray-200/g, "table-container"],
    [/w-full p-2 border rounded/g, "input-field"],
    [/bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700/g, "btn-primary w-full py-4"],
    [/bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700/g, "btn-primary w-full py-4 text-lg"],
    [/bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700/g, "btn-primary"],
    [/bg-green-600 text-white font-bold py-3 rounded hover:bg-green-700/g, "btn-primary w-full py-4 text-green-100 border-none"],
    [/block text-sm font-semibold text-gray-600 mb-1/g, "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"],

    // Header tags inside components
    [/<h3 className="text-lg font-bold mb-4 border-b pb-2">/g, '<h3 className="text-xl font-heading font-bold mb-6 border-b border-slate-100 pb-4 text-slate-800">'],
    [/<h3 className="p-4 bg-gray-50 border-b font-bold text-gray-800">/g, '<div className="px-6 py-5 border-b border-slate-100 bg-white"><h3 className="font-heading font-bold text-lg text-slate-800">'],
    [/<\/h3>\s*<table/g, '</h3></div><table'],

    // Tables
    [/<table className=".*?"/g, '<table className="custom-table"'],
    [/<thead className=".*?"/g, '<thead>'],
    [/<tr className="border-b last:border-0 hover:bg-gray-50">/g, '<tr>'],

    // Typography
    [/font-bold text-gray-800/g, "font-heading font-bold text-slate-800"],
    [/text-gray-500/g, "text-slate-500"],
    [/text-gray-900/g, "text-slate-900"],
    [/bg-gray-50/g, "bg-slate-50"],
    [/border-gray-200/g, "border-slate-200"],
    [/bg-[a-z]+-100 text-[a-z]+-800/g, function (match) { return "badge " + match; }] // injects badge generic class into existing pills
];

for (let [r, s] of replacements) { html = html.replace(r, s); }

// Fix bad structure in Master Inventory pills
html = html.replace('bg-indigo-600 text-white shadow-md', 'btn-primary px-4 py-2 text-xs shadow-md');

fs.writeFileSync('inventory.html', html);
console.log('Patch 2 applied successfully.');
