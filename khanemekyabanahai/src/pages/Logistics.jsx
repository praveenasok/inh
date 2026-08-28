import { useMemo } from 'react';
import { ListTodo, Moon, Flame, Droplets, CheckCircle2 } from 'lucide-react';
import { useKitchen } from '../context/KitchenContext';
import { format, subDays } from 'date-fns';

function generatePrepActionsForRecipe(recipe) {
  const actions = [];
  if (!recipe || !recipe.ingredients) return actions;
  
  const lowerIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
  
  if (lowerIngredients.some(i => i.includes('rajma') || i.includes('chickpea') || i.includes('chole') || i.includes('moong dal') || i.includes('urad dal'))) {
    actions.push({
      action_type: "Soak",
      target: "Lentils / Beans",
      icon: <Droplets size={16} className="text-blue-500" />,
      desc: "Soak overnight in water"
    });
  }

  if (lowerIngredients.some(i => i.includes('paneer') || i.includes('chicken') || i.includes('fish'))) {
    actions.push({
      action_type: "Marinate",
      target: "Protein",
      icon: <Flame size={16} className="text-orange-500" />,
      desc: "Marinate with spices and yogurt"
    });
  }

  if (lowerIngredients.some(i => i.includes('potato') || i.includes('aloo'))) {
    actions.push({
      action_type: "Boil",
      target: "Potatoes",
      icon: <Flame size={16} className="text-red-500" />,
      desc: "Boil and peel for tomorrow"
    });
  }

  return actions;
}

function Logistics() {
  const { activePlan } = useKitchen();

  const prepSchedule = useMemo(() => {
    if (!activePlan || activePlan.length === 0) return [];
    
    // Map each day in the plan to a "Night Before" checklist
    return activePlan.map(dayPlan => {
      const nightBeforeDate = subDays(dayPlan.date, 1);
      
      const bRecipe = dayPlan.meals.Breakfast[dayPlan.selected.Breakfast];
      const lRecipe = dayPlan.meals.Lunch[dayPlan.selected.Lunch];
      const dRecipe = dayPlan.meals.Dinner[dayPlan.selected.Dinner];

      const tasks = [
        ...generatePrepActionsForRecipe(bRecipe).map(t => ({ ...t, meal: `Breakfast: ${bRecipe.mealName}` })),
        ...generatePrepActionsForRecipe(lRecipe).map(t => ({ ...t, meal: `Lunch: ${lRecipe.mealName}` })),
        ...generatePrepActionsForRecipe(dRecipe).map(t => ({ ...t, meal: `Dinner: ${dRecipe.mealName}` }))
      ];

      return {
        date: nightBeforeDate,
        targetDayDate: dayPlan.date,
        tasks
      };
    });
  }, [activePlan]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm text-blue-600">
             <ListTodo size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter lowercase">prep logistics</h1>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">Night-Before Engine</p>
          </div>
        </div>
      </header>

      {prepSchedule.length === 0 ? (
        <div className="text-center py-12 text-neutral-400 font-medium italic text-sm border border-dashed border-neutral-200 rounded-3xl">
          Generate a meal plan first to see your prep schedule.
        </div>
      ) : (
        <div className="space-y-8">
          {prepSchedule.map((schedule, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[2rem] overflow-hidden shadow-sm">
              <div className="bg-blue-600 p-6 flex items-center justify-between text-white">
                <div>
                  <div className="flex items-center gap-2 mb-1 opacity-80">
                    <Moon size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Night Before</span>
                  </div>
                  <h2 className="text-lg font-bold">
                    {format(schedule.date, 'EEEE, MMM do')}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Prep For</div>
                  <div className="text-sm font-bold">{format(schedule.targetDayDate, 'EEEE')}</div>
                </div>
              </div>
              
              <div className="p-6">
                {schedule.tasks.length === 0 ? (
                  <div className="text-neutral-400 italic text-sm">No specific prep actions required for tomorrow's menu. Relax!</div>
                ) : (
                  <ul className="space-y-4">
                    {schedule.tasks.map((task, taskIdx) => (
                      <li key={taskIdx} className="flex items-start gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-black/50 group cursor-pointer hover:border-blue-200 transition-colors">
                        <div className="mt-0.5">
                          {task.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm mb-1">{task.action_type} {task.target}</h4>
                          <p className="text-xs text-neutral-500 mb-2">{task.desc}</p>
                          <span className="inline-block px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                            {task.meal}
                          </span>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-transparent group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                          <CheckCircle2 size={16} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Logistics;
