import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Recipes from './pages/Recipes';
import MealPlanner from './pages/MealPlanner';
import Pantry from './pages/Pantry';
import Logistics from './pages/Logistics';
import { KitchenProvider } from './context/KitchenContext';
import './index.css';

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 selection:bg-blue-100 dark:selection:bg-blue-900/30 font-sans">
      <Sidebar />
      <div className="md:pl-[280px] min-h-screen transition-all duration-500">
        <div className="max-w-[1200px] mx-auto p-4 md:p-12">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <KitchenProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/planner" replace />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/planner" element={<MealPlanner />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/logistics" element={<Logistics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </KitchenProvider>
  );
}

export default App;
