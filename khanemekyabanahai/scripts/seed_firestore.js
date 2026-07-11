import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: Insert your actual Firebase Config here before running!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to determine the engine category
function getEngineCategory(recipe) {
  // If it's explicitly light and low calories, it's highly likely to be an Efficiency meal
  if (recipe.isLight && recipe.calories < 400) return "Efficiency";
  // If it's not light but vegetarian with higher calories, it's a Staple
  if (recipe.isVegetarian && recipe.calories >= 400) return "Staple";
  return "Wildcard";
}

// Helper to generate prep actions based on ingredients
function generatePrepActions(ingredients) {
  const actions = [];
  const lowerIngredients = ingredients.map(i => i.name.toLowerCase());
  
  if (lowerIngredients.some(i => i.includes('rajma') || i.includes('chickpea') || i.includes('chole') || i.includes('moong dal') || i.includes('urad dal'))) {
    actions.push({
      action_type: "Soak",
      target_ingredient: "Lentils/Beans",
      time_offset_hours: -12,
      batch_compatible: true
    });
  }

  if (lowerIngredients.some(i => i.includes('paneer') || i.includes('chicken') || i.includes('fish'))) {
    actions.push({
      action_type: "Marinate",
      target_ingredient: "Protein",
      time_offset_hours: -2,
      batch_compatible: false
    });
  }

  if (lowerIngredients.some(i => i.includes('potato') || i.includes('aloo'))) {
    actions.push({
      action_type: "Boil",
      target_ingredient: "Potatoes",
      time_offset_hours: -24,
      batch_compatible: true
    });
  }

  return actions;
}

async function seedDatabase() {
  console.log('Reading recipes from src/data/recipes.json...');
  const recipesPath = path.join(__dirname, '../src/data/recipes.json');
  const rawData = fs.readFileSync(recipesPath, 'utf-8');
  const recipesData = JSON.parse(rawData);

  console.log(`Found ${recipesData.length} recipes to process. Uploading to Firestore...`);

  let count = 0;
  for (const item of recipesData) {
    // The extracted JSON has 'recipeOptions' nested inside meals.
    // We will extract each option as its own standalone recipe document.
    if (!item.recipeOptions || item.recipeOptions.length === 0) continue;

    for (const option of item.recipeOptions) {
      const docId = option.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const firestoreDoc = {
        name: option.name,
        meal_slot: [item.category],
        engine_category: getEngineCategory(item),
        flavor_profile: item.cuisine || "Indian",
        active_prep_time_mins: 15,
        passive_cook_time_mins: parseInt(item.prepTime) || 30, // Fallback if missing
        
        ingredients: (option.ingredients || []).map(ing => ({
          name: ing.name,
          quantity: ing.amount,
          unit: ing.unit,
          is_pantry_staple: ["salt", "turmeric", "oil", "water"].includes(ing.name.toLowerCase()),
          state_requirement: "Raw" // Default for seeding
        })),

        prep_actions: generatePrepActions(option.ingredients || []),
        
        // Additional metadata from original dataset
        is_vegetarian: item.isVegetarian || false,
        is_light: item.isLight || false,
        calories: item.calories || 0
      };

      try {
        await setDoc(doc(collection(db, 'recipes'), docId), firestoreDoc);
        console.log(`✅ Uploaded: ${firestoreDoc.name}`);
        count++;
      } catch (error) {
        console.error(`❌ Error uploading ${firestoreDoc.name}:`, error);
      }
    }
  }

  console.log(`\n🎉 Successfully seeded ${count} distinct recipe documents into Firestore!`);
  process.exit(0);
}

seedDatabase().catch(console.error);
