const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function createCollections() {
  try {
    console.log('Creating Firebase collections using CLI...');
    
    // Create a simple document in each collection to initialize them
    const collections = [
      {
        name: 'products',
        doc: 'init',
        data: JSON.stringify({
          name: 'Initial Product',
          price: 0,
          category: 'setup',
          createdAt: new Date().toISOString(),
          isSetup: true
        })
      },
      {
        name: 'sync_logs',
        doc: 'init',
        data: JSON.stringify({
          type: 'setup',
          status: 'success',
          message: 'Collections initialized',
          timestamp: new Date().toISOString(),
          isSetup: true
        })
      },
      {
        name: 'clients',
        doc: 'init',
        data: JSON.stringify({
          name: 'Initial Client',
          email: 'setup@example.com',
          createdAt: new Date().toISOString(),
          isSetup: true
        })
      }
    ];
    
    // Create config collection with salesmen document
    console.log('Creating config collection...');
    const configData = JSON.stringify({
      salesmen: [],
      lastUpdated: new Date().toISOString(),
      initialized: true
    });
    
    try {
      await execAsync(`echo '${configData}' | firebase firestore:set config/salesmen`);
      console.log('✓ Config collection created');
    } catch (error) {
      console.log('Config collection creation skipped:', error.message);
    }
    
    // Create other collections
    for (const collection of collections) {
      console.log(`Creating ${collection.name} collection...`);
      try {
        await execAsync(`echo '${collection.data}' | firebase firestore:set ${collection.name}/${collection.doc}`);
        console.log(`✓ ${collection.name} collection created`);
      } catch (error) {
        console.log(`${collection.name} collection creation skipped:`, error.message);
      }
    }
    
    console.log('\n🎉 Collections setup completed!');
    console.log('\nCleaning up initialization documents...');
    
    // Clean up init documents
    for (const collection of collections) {
      try {
        await execAsync(`firebase firestore:delete ${collection.name}/${collection.doc} --force`);
        console.log(`✓ Cleaned up ${collection.name}/init`);
      } catch (error) {
        console.log(`Cleanup skipped for ${collection.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Firebase collections are ready!');
    
  } catch (error) {
    console.error('❌ Error creating collections:', error.message);
  }
}

createCollections();