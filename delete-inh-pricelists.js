const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function initializeAdmin() {
  const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error('Missing service-account-key.json in project root.');
  }
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  return admin.firestore();
}

async function deleteCollectionRecursively(db, collectionName, { dryRun = false } = {}) {
  const snapshot = await db.collection(collectionName).get();
  const totalDocs = snapshot.size;
  let deletedDocs = 0;

  if (dryRun) {
    return { totalDocs, deletedDocs: 0, message: 'Dry run: no deletions performed.' };
  }

  for (const doc of snapshot.docs) {
    await admin.firestore().recursiveDelete(doc.ref);
    deletedDocs++;
    if (deletedDocs % 50 === 0) {
      console.log(`Deleted ${deletedDocs}/${totalDocs} documents...`);
    }
  }

  return { totalDocs, deletedDocs, message: `Deleted ${deletedDocs} documents (including subcollections).` };
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dryRun');
    const force = args.includes('--force') || args.includes('--yes');

    // Support passing collection via --collection=name or first positional arg
    let collectionName = 'inh_pricelists';
    const collectionArg = args.find(a => a.startsWith('--collection='));
    if (collectionArg) {
      collectionName = collectionArg.split('=')[1] || collectionName;
    } else {
      const positional = args.filter(a => !a.startsWith('--'));
      if (positional.length > 0 && positional[0]) {
        collectionName = positional[0];
      }
    }

    const db = await initializeAdmin();

    console.log(`Preparing to ${dryRun ? 'simulate deletion' : 'delete'} for collection: ${collectionName}`);
    const result = await deleteCollectionRecursively(db, collectionName, { dryRun });
    console.log(JSON.stringify({ collectionName, ...result }, null, 2));

    if (!dryRun && !force) {
      console.error('Refusing to proceed without --force flag. Use --dryRun to preview.');
      process.exit(1);
    }

    if (!dryRun && result.deletedDocs < result.totalDocs) {
      console.warn('Warning: Some documents may remain if new ones were added concurrently. Re-run if necessary.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Deletion failed:', err.message);
    process.exit(1);
  }
}

main();