import { useState } from 'react';
import { ChefHat, Activity, ChevronRight } from 'lucide-react';
import recipesData from '../data/recipes.json';
import { format } from 'date-fns';

function Recipes() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      
      {/* Header section */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:scale-105 transition-all text-neutral-600 dark:text-neutral-400">
             <ChefHat size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter lowercase">recipes</h1>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">{format(new Date(), 'EEEE, MMM do')}</p>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipesData.length === 0 ? (
          <div className="col-span-full text-center py-12 text-neutral-400 font-medium italic text-sm">
            No recipes found.
          </div>
        ) : (
          recipesData.map(recipe => (
            <div key={recipe.id} className="group cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div className="w-8 h-8 rounded-full border border-neutral-100 dark:border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-orange-50 group-hover:text-orange-500 group-hover:border-orange-100 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  {recipe.category} • {recipe.calories} KCAL {recipe.isVegetarian ? '• VEG' : ''} {recipe.isLight ? '• LIGHT' : ''}
                </p>
                <h3 className="text-2xl font-black tracking-tighter truncate">
                  {recipe.mealName}
                </h3>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Recipes;
