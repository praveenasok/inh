// Firebase Data Population Script
// This script populates Firebase with sample colors and styles data for the Quote Maker application

const admin = require('firebase-admin');
const path = require('path');

class FirebaseDataPopulator {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Check if Firebase is already initialized
            if (admin.apps.length > 0) {
                console.log('🔄 Using existing Firebase app');
                this.db = admin.firestore();
                this.isInitialized = true;
                return true;
            }

            // Initialize Firebase Admin SDK
            const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
            console.log('📁 Loading service account from:', serviceAccountPath);
            
            const serviceAccount = require(serviceAccountPath);
            console.log('🔑 Service account loaded, project:', serviceAccount.project_id);
            
            const app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });

            this.db = admin.firestore(app);
            this.isInitialized = true;
            console.log('✅ Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return false;
        }
    }

    async populateColors() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        console.log('🌈 Populating colors collection...');

        const colors = [
            // Natural Colors
            { name: 'Natural Black', code: '#1B1B1B', category: 'Natural', description: 'Deep natural black color' },
            { name: 'Off Black', code: '#2C2C2C', category: 'Natural', description: 'Slightly softer than natural black' },
            { name: 'Darkest Brown', code: '#3C2415', category: 'Natural', description: 'Very dark brown, almost black' },
            { name: 'Dark Brown', code: '#4A2C17', category: 'Natural', description: 'Rich dark brown' },
            { name: 'Medium Brown', code: '#6B4423', category: 'Natural', description: 'Classic medium brown' },
            { name: 'Light Brown', code: '#8B5A2B', category: 'Natural', description: 'Warm light brown' },
            { name: 'Dark Blonde', code: '#A67C52', category: 'Natural', description: 'Deep blonde with brown undertones' },
            { name: 'Medium Blonde', code: '#C19A6B', category: 'Natural', description: 'Classic medium blonde' },
            { name: 'Light Blonde', code: '#D4B896', category: 'Natural', description: 'Light golden blonde' },
            { name: 'Platinum Blonde', code: '#F5F5DC', category: 'Natural', description: 'Very light platinum blonde' },
            
            // Auburn/Red Colors
            { name: 'Auburn', code: '#A52A2A', category: 'Auburn', description: 'Rich reddish-brown' },
            { name: 'Dark Auburn', code: '#8B2635', category: 'Auburn', description: 'Deep auburn with red highlights' },
            { name: 'Light Auburn', code: '#CC5500', category: 'Auburn', description: 'Bright auburn color' },
            { name: 'Copper Red', code: '#B87333', category: 'Auburn', description: 'Warm copper red' },
            { name: 'Burgundy', code: '#800020', category: 'Auburn', description: 'Deep wine red' },
            
            // Fashion Colors
            { name: 'Ash Blonde', code: '#B8B5A6', category: 'Fashion', description: 'Cool-toned ash blonde' },
            { name: 'Honey Blonde', code: '#DAA520', category: 'Fashion', description: 'Warm honey-colored blonde' },
            { name: 'Strawberry Blonde', code: '#FF9361', category: 'Fashion', description: 'Blonde with red undertones' },
            { name: 'Silver Gray', code: '#C0C0C0', category: 'Fashion', description: 'Elegant silver gray' },
            { name: 'Salt and Pepper', code: '#808080', category: 'Fashion', description: 'Mixed gray and dark' }
        ];

        const batch = this.db.batch();
        const colorsCollection = this.db.collection('colors');

        // Clear existing colors
        console.log('🧹 Clearing existing colors...');
        const existingColors = await colorsCollection.get();
        existingColors.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Add new colors
        console.log('➕ Adding new colors...');
        colors.forEach((color, index) => {
            const docRef = colorsCollection.doc(`color_${index + 1}`);
            batch.set(docRef, {
                ...color,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`✅ Added ${colors.length} colors to Firebase`);
        return colors.length;
    }

    async populateStyles() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        console.log('💇 Populating styles collection...');

        const styles = [
            // Straight Styles
            { name: 'Straight', category: 'Straight', description: 'Classic straight hair', texture: 'Smooth and sleek' },
            { name: 'Silky Straight', category: 'Straight', description: 'Ultra-smooth silky straight', texture: 'Very fine and smooth' },
            { name: 'Yaki Straight', category: 'Straight', description: 'Textured straight mimicking relaxed hair', texture: 'Slightly textured' },
            
            // Wavy Styles
            { name: 'Body Wave', category: 'Wavy', description: 'Loose, natural-looking waves', texture: 'Soft waves' },
            { name: 'Loose Wave', category: 'Wavy', description: 'Gentle, flowing waves', texture: 'Relaxed wave pattern' },
            { name: 'Beach Wave', category: 'Wavy', description: 'Casual, tousled beach waves', texture: 'Natural wave texture' },
            { name: 'Water Wave', category: 'Wavy', description: 'Defined water-like wave pattern', texture: 'Consistent wave pattern' },
            { name: 'Ocean Wave', category: 'Wavy', description: 'Deep, flowing ocean-inspired waves', texture: 'Deep wave pattern' },
            
            // Curly Styles
            { name: 'Deep Wave', category: 'Curly', description: 'Deep, defined wave pattern', texture: 'Pronounced waves' },
            { name: 'Curly', category: 'Curly', description: 'Natural curly texture', texture: 'Spiral curls' },
            { name: 'Deep Curly', category: 'Curly', description: 'Tight, defined curls', texture: 'Tight curl pattern' },
            { name: 'Jerry Curl', category: 'Curly', description: 'Retro-style tight curls', texture: 'Processed curls' },
            { name: 'Spiral Curl', category: 'Curly', description: 'Defined spiral curl pattern', texture: 'Uniform spirals' },
            
            // Kinky/Coily Styles
            { name: 'Kinky Straight', category: 'Kinky', description: 'Straightened kinky texture', texture: 'Coarse straight' },
            { name: 'Kinky Curly', category: 'Kinky', description: 'Natural kinky curly texture', texture: 'Tight coils' },
            { name: 'Afro Kinky', category: 'Kinky', description: 'Natural afro texture', texture: 'Very tight coils' }
        ];

        const batch = this.db.batch();
        const stylesCollection = this.db.collection('styles');

        // Clear existing styles
        console.log('🧹 Clearing existing styles...');
        const existingStyles = await stylesCollection.get();
        existingStyles.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Add new styles
        console.log('➕ Adding new styles...');
        styles.forEach((style, index) => {
            const docRef = stylesCollection.doc(`style_${index + 1}`);
            batch.set(docRef, {
                ...style,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`✅ Added ${styles.length} styles to Firebase`);
        return styles.length;
    }

    async populateAllData() {
        try {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize Firebase');
            }
            
            console.log('🚀 Starting Firebase data population...');
            
            const colorsCount = await this.populateColors();
            const stylesCount = await this.populateStyles();
            
            console.log('🎉 Data population completed successfully!');
            console.log(`📊 Summary: ${colorsCount} colors, ${stylesCount} styles added`);
            
            return { colorsCount, stylesCount };
        } catch (error) {
            console.error('❌ Data population failed:', error.message);
            throw error;
        }
    }

    async verifyData() {
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize Firebase');
            }
        }

        console.log('🔍 Verifying populated data...');

        const colorsSnapshot = await this.db.collection('colors').get();
        const stylesSnapshot = await this.db.collection('styles').get();

        console.log(`📊 Verification Results:`);
        console.log(`   Colors: ${colorsSnapshot.size} documents`);
        console.log(`   Styles: ${stylesSnapshot.size} documents`);

        // Show sample data
        if (colorsSnapshot.size > 0) {
            const firstColor = colorsSnapshot.docs[0].data();
            console.log(`   Sample color: ${firstColor.name} (${firstColor.category})`);
        }

        if (stylesSnapshot.size > 0) {
            const firstStyle = stylesSnapshot.docs[0].data();
            console.log(`   Sample style: ${firstStyle.name} (${firstStyle.category})`);
        }

        return {
            colors: colorsSnapshot.size,
            styles: stylesSnapshot.size
        };
    }
}

// Main execution
async function main() {
    const populator = new FirebaseDataPopulator();
    
    try {
        // Populate data
        await populator.populateAllData();
        
        // Verify the data was added correctly
        await populator.verifyData();
        
        console.log('✅ All operations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other scripts
module.exports = FirebaseDataPopulator;

// Run if called directly
if (require.main === module) {
    main();
}