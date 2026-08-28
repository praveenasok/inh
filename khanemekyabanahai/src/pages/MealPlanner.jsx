import { useEffect, useCallback } from 'react';
import { Calendar, Save, Sparkles, Clock, Flame, AlertCircle } from 'lucide-react';
import { useKitchen } from '../context/KitchenContext';
import recipesData from '../data/recipes.json';
import { format, addDays } from 'date-fns';

const TagBadge = ({ text, type }) => {
  if (!text) return null;
  const upperText = text.toString().toUpperCase();
  
  let styles = "text-[8px] font-bold text-neutral-400 border border-neutral-200 bg-white";
  if (type === 'veg') styles = "text-[8px] font-bold bg-green-50 text-green-600 border border-green-100";
  if (type === 'light') styles = "text-[8px] font-bold bg-blue-50 text-blue-600 border border-blue-100";
  if (type === 'cals') styles = "text-[9px] font-bold text-orange-500 ml-1 border-none bg-transparent";

  return <span className={`px-1.5 py-0.5 rounded ${styles}`}>{upperText}</span>;
};

// Helper to determine the engine category
function getEngineCategory(recipe) {
  if (recipe.isLight && recipe.calories < 400) return "Efficiency";
  if (recipe.isVegetarian && recipe.calories >= 400) return "Staple";
  return "Wildcard";
}

function MealPlanner() {
  const { pantry, activePlan, setActivePlan } = useKitchen();

  const generatePlan = useCallback(() => {
    const breakfasts = recipesData.filter(r => r.category === 'Breakfast');
    const lunches = recipesData.filter(r => r.category === 'Lunch');
    const dinners = recipesData.filter(r => r.category === 'Dinner');

    const pickRandom = (arr, category) => {
      const filtered = arr.filter(r => getEngineCategory(r) === category);
      if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
      return arr[Math.floor(Math.random() * arr.length)]; // fallback
    };

    const newPlan = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) { // Generate 3 days for demo
      const dayDate = addDays(today, i);
      
      const dayPlan = {
        date: dayDate,
        meals: {
          Breakfast: {
            A: pickRandom(breakfasts, 'Efficiency'),
            B: pickRandom(breakfasts, 'Staple'),
            C: pickRandom(breakfasts, 'Wildcard')
          },
          Lunch: {
            A: pickRandom(lunches, 'Efficiency'),
            B: pickRandom(lunches, 'Staple'),
            C: pickRandom(lunches, 'Wildcard')
          },
          Dinner: {
            A: pickRandom(dinners, 'Efficiency'),
            B: pickRandom(dinners, 'Staple'),
            C: pickRandom(dinners, 'Wildcard')
          }
        },
        selected: {
          Breakfast: 'B',
          Lunch: 'B',
          Dinner: 'B'
        }
      };
      newPlan.push(dayPlan);
    }
    setActivePlan(newPlan);
  }, [setActivePlan]);

  useEffect(() => {
    if (activePlan.length === 0) {
      generatePlan();
    }
  }, [activePlan, generatePlan]);

  const handleSelect = (dayIndex, mealType, optionKey) => {
    const updatedPlan = [...activePlan];
    updatedPlan[dayIndex].selected[mealType] = optionKey;
    setActivePlan(updatedPlan);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm text-blue-600">
             <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter lowercase">meal planner</h1>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">3-Option Engine Active</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={generatePlan} className="flex items-center gap-2 p-3 px-5 bg-white border border-neutral-200 rounded-2xl text-sm font-bold shadow-sm hover:bg-neutral-50 transition-all">
            <Sparkles size={16} className="text-blue-500" />
            Regenerate
          </button>
          <button className="flex items-center gap-2 p-3 px-5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all font-bold text-sm">
            <Save size={16} />
            Save Plan
          </button>
        </div>
      </header>

      {/* Warning if pantry is missing highly perishable items? */}
      {pantry.some(i => i.perishability === 5) && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle size={16} />
          Your engine is prioritizing recipes that use highly perishable pantry items!
        </div>
      )}

      <div className="space-y-12">
        {activePlan.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] p-8 shadow-sm">
            <h2 className="text-lg font-black tracking-tighter mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              {format(day.date, 'EEEE, MMM do')}
            </h2>

            <div className="space-y-8">
              {['Breakfast', 'Lunch', 'Dinner'].map(mealType => (
                <div key={mealType}>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">{mealType}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Render Options A, B, C */}
                    {['A', 'B', 'C'].map(optionKey => {
                      const recipe = day.meals[mealType][optionKey];
                      if (!recipe) return null;
                      const isSelected = day.selected[mealType] === optionKey;
                      const categoryLabel = optionKey === 'A' ? 'Efficiency' : optionKey === 'B' ? 'Staple' : 'Wildcard';
                      const categoryIcon = optionKey === 'A' ? <Clock size={12}/> : optionKey === 'B' ? <Calendar size={12}/> : <Flame size={12}/>;

                      return (
                        <div 
                          key={optionKey}
                          onClick={() => handleSelect(dayIndex, mealType, optionKey)}
                          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-md transform scale-[1.02]' 
                              : 'border-neutral-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-600' : 'text-neutral-400'}`}>
                              {categoryIcon} Option {optionKey}: {categoryLabel}
                            </span>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />}
                          </div>
                          
                          <h4 className="font-bold text-sm mb-2">{recipe.mealName}</h4>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {recipe.isVegetarian && <TagBadge text="VEG" type="veg" />}
                            {recipe.isLight && <TagBadge text="LIGHT" type="light" />}
                            <TagBadge text={`${recipe.calories} KCAL`} type="cals" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MealPlanner;
