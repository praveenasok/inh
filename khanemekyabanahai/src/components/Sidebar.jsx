import { NavLink } from 'react-router-dom';
import { ChefHat, Calendar, ChevronRight, Package, ListTodo } from 'lucide-react';

function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-neutral-900 border-r border-neutral-100 dark:border-neutral-800 z-50 transition-transform duration-500 transform shadow-none hidden md:block">
      <div className="p-8 flex flex-col h-full">
        <div className="flex items-center justify-between mb-12">
          <span className="text-xl font-black tracking-tighter lowercase">KhaanaApp</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavLink
            to="/planner"
            className={({ isActive }) => 
              `w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}>
                    <Calendar size={18} />
                  </span>
                  <span className="text-sm font-bold lowercase tracking-tight">meal plan</span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-50" />}
              </>
            )}
          </NavLink>

          <NavLink
            to="/pantry"
            className={({ isActive }) => 
              `w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}>
                    <Package size={18} />
                  </span>
                  <span className="text-sm font-bold lowercase tracking-tight">pantry</span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-50" />}
              </>
            )}
          </NavLink>

          <NavLink
            to="/logistics"
            className={({ isActive }) => 
              `w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}>
                    <ListTodo size={18} />
                  </span>
                  <span className="text-sm font-bold lowercase tracking-tight">prep logistics</span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-50" />}
              </>
            )}
          </NavLink>
          
          <NavLink
            to="/recipes"
            className={({ isActive }) => 
              `w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                  : 'text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white'}>
                    <ChefHat size={18} />
                  </span>
                  <span className="text-sm font-bold lowercase tracking-tight">recipes</span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-50" />}
              </>
            )}
          </NavLink>

        </nav>

        {/* Status indicator */}
        <div className="mt-auto pt-8 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-neutral-500 lowercase italic">system online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
