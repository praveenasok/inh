import { useState } from 'react';
import { Package, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useKitchen } from '../context/KitchenContext';
import { format } from 'date-fns';

function Pantry() {
  const { pantry, addPantryItem, removePantryItem } = useKitchen();
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'g', perishability: 1 });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity) return;
    addPantryItem({
      ...newItem,
      quantity: Number(newItem.quantity),
      perishability: Number(newItem.perishability)
    });
    setNewItem({ name: '', quantity: '', unit: 'g', perishability: 1 });
  };

  const getPerishabilityColor = (level) => {
    switch (level) {
      case 5: return 'bg-red-100 text-red-700 border-red-200';
      case 4: return 'bg-orange-100 text-orange-700 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 2: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getPerishabilityText = (level) => {
    switch (level) {
      case 5: return 'Critical (Consume 1-2 days)';
      case 4: return 'High (Consume 3-5 days)';
      case 3: return 'Medium (Consume 1 week)';
      case 2: return 'Low (Consume 2-4 weeks)';
      default: return 'Stable (Long shelf life)';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm text-blue-600 dark:text-blue-400">
             <Package size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter lowercase">pantry manager</h1>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{format(new Date(), 'EEEE, MMM do')}</p>
          </div>
        </div>
      </header>

      {/* Add New Item Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] p-6 shadow-sm">
        <h2 className="text-sm font-bold tracking-tight mb-4 flex items-center gap-2">
          <Plus size={16} className="text-blue-500" />
          Log New Ingredient
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ingredient Name</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-sm"
              placeholder="e.g. Spinach"
              value={newItem.name}
              onChange={e => setNewItem({...newItem, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Qty</label>
            <input 
              type="number" 
              className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-sm"
              value={newItem.quantity}
              onChange={e => setNewItem({...newItem, quantity: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Perishability (1-5)</label>
            <select 
              className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black text-sm"
              value={newItem.perishability}
              onChange={e => setNewItem({...newItem, perishability: e.target.value})}
            >
              <option value="1">1 - Stable</option>
              <option value="2">2 - Low</option>
              <option value="3">3 - Medium</option>
              <option value="4">4 - High</option>
              <option value="5">5 - Critical</option>
            </select>
          </div>
          <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl font-bold lowercase hover:bg-blue-700 transition">
            add
          </button>
        </form>
      </div>

      {/* Inventory List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold tracking-tight">Current Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pantry.sort((a, b) => b.perishability - a.perishability).map(item => (
            <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-5 flex items-start justify-between shadow-sm group">
              <div>
                <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                <p className="text-xs text-neutral-500 mb-3">{item.quantity} {item.unit}</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${getPerishabilityColor(item.perishability)}`}>
                  {item.perishability >= 4 && <AlertCircle size={12} />}
                  {getPerishabilityText(item.perishability)}
                </div>
              </div>
              <button 
                onClick={() => removePantryItem(item.id)}
                className="text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Pantry;
