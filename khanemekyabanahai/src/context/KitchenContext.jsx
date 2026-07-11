import { createContext, useContext, useState, useEffect } from 'react';

const KitchenContext = createContext();

export function KitchenProvider({ children }) {
  // Initialize pantry with default hypothetical items from the architectural blueprint
  const [pantry, setPantry] = useState([
    { id: '1', name: 'Onions', quantity: 1, unit: 'kg', perishability: 2 },
    { id: '2', name: 'Potatoes', quantity: 1, unit: 'kg', perishability: 1 },
    { id: '3', name: 'Paneer', quantity: 500, unit: 'g', perishability: 4 },
    { id: '4', name: 'Moong Dal', quantity: 500, unit: 'g', perishability: 1 },
    { id: '5', name: 'Tomatoes', quantity: 1, unit: 'kg', perishability: 3 },
  ]);

  // The active meal plan array (starts empty, gets generated in MealPlanner)
  const [activePlan, setActivePlan] = useState([]);

  // Provide some actions to modify state
  const addPantryItem = (item) => {
    setPantry([...pantry, { ...item, id: Date.now().toString() }]);
  };

  const removePantryItem = (id) => {
    setPantry(pantry.filter(i => i.id !== id));
  };

  return (
    <KitchenContext.Provider value={{
      pantry,
      addPantryItem,
      removePantryItem,
      activePlan,
      setActivePlan
    }}>
      {children}
    </KitchenContext.Provider>
  );
}

export function useKitchen() {
  return useContext(KitchenContext);
}
