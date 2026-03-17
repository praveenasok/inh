import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, Archive, FileText,
  ClipboardList, Factory, SplitSquareVertical, PackageCheck, Package,
  ArrowLeftRight, Search, BarChart3, Menu
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import TraceabilityScreen from './pages/Traceability';
import MOPage from './pages/MOPage';
import BOMPage from './pages/BOMPage';

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Traceability', path: '/traceability', icon: <Search size={20} /> },
    { name: 'Manufacturing Orders', path: '/mo', icon: <Factory size={20} /> },
    { name: 'Raw Hair Purchase', path: '/purchase', icon: <ShoppingCart size={20} /> },
    { name: 'Suppliers Master', path: '/suppliers', icon: <Users size={20} /> },
    { name: 'Spec Sheet (BOM)', path: '/bom', icon: <FileText size={20} /> },
    { name: 'Order Entry', path: '/orders', icon: <ClipboardList size={20} /> },
    { name: 'Raw Hair Inventory', path: '/raw-inventory', icon: <Archive size={20} /> },
    { name: 'WIP Processing', path: '/wip', icon: <SplitSquareVertical size={20} /> },
    { name: 'Semi Finished Inventory', path: '/semi-inventory', icon: <Package size={20} /> },
    { name: 'Finished Goods', path: '/finished-inventory', icon: <PackageCheck size={20} /> },
    { name: 'Movements & Audit', path: '/movements', icon: <ArrowLeftRight size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
  ];

  return (
    <div className="w-64 bg-[#1a1c23] text-gray-300 h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4 flex items-center justify-center font-bold text-xl text-white tracking-widest border-b border-gray-700">
        INH.FACTORY
      </div>
      <nav className="mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-6 py-3 hover:bg-gray-800 hover:text-white transition-colors gap-4 ${isActive ? 'bg-gray-800 text-white border-l-4 border-accent' : 'border-l-4 border-transparent'
                }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const Header = () => (
  <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
    <div className="flex items-center gap-4">
      <button className="lg:hidden text-gray-600"><Menu /></button>
      <h1 className="text-xl font-semibold text-gray-800">Supply Chain OS</h1>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-sm font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full">HQ Factory User</div>
      <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">A</div>
    </div>
  </header>
);

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-gray-100">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  </div>
);

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-center">
    <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
    <p className="text-gray-500">This module is part of the implementation plan and will be fully integrated with backend APIs.</p>
  </div>
);

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/traceability" element={<TraceabilityScreen />} />
          <Route path="/mo" element={<MOPage />} />
          <Route path="/purchase" element={<PlaceholderPage title="Raw Hair Purchase Entry" />} />
          <Route path="/suppliers" element={<PlaceholderPage title="Supplier Management" />} />
          <Route path="/bom" element={<BOMPage />} />
          <Route path="/orders" element={<PlaceholderPage title="Sales Order Entry" />} />
          <Route path="/raw-inventory" element={<PlaceholderPage title="Raw Hair Inventory" />} />
          <Route path="/wip" element={<PlaceholderPage title="WIP Processing & Segregation" />} />
          <Route path="/semi-inventory" element={<PlaceholderPage title="Semi Finished Stock" />} />
          <Route path="/finished-inventory" element={<PlaceholderPage title="Finished Goods Stock" />} />
          <Route path="/movements" element={<PlaceholderPage title="Stock Movement Register" />} />
          <Route path="/reports" element={<PlaceholderPage title="Analytics & Reports" />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
