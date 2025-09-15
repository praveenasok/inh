const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('📦 DISPLAYING ORDERS FROM DATABASE');
console.log('=' .repeat(50));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function displayOrders() {
  try {
    const ordersSnapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    
    if (ordersSnapshot.size === 0) {
      console.log('📭 No orders found in the database.');
      return;
    }
    
    console.log(`📊 Total Orders: ${ordersSnapshot.size}`);
    console.log('');
    
    ordersSnapshot.forEach((doc, index) => {
      const order = doc.data();
      const orderNumber = index + 1;
      
      console.log(`🔸 ORDER #${orderNumber}`);
      console.log(`   Order ID: ${doc.id}`);
      console.log(`   Order Number: ${order.orderNumber || 'Not assigned'}`);
      console.log(`   Status: ${order.status || 'Unknown'}`);
      console.log(`   Order Type: ${order.orderType || 'Standard'}`);
      console.log('');
      
      // Client Information
      console.log(`   👤 CLIENT INFORMATION:`);
      console.log(`      Name: ${order.clientName || order.customerName || 'Not specified'}`);
      console.log(`      Contact: ${order.clientContact || 'Not specified'}`);
      console.log(`      Salesperson: ${order.salesman || order.salesperson || 'Not assigned'}`);
      console.log('');
      
      // Financial Information
      console.log(`   💰 FINANCIAL DETAILS:`);
      console.log(`      Currency: ${order.currency || 'INR'}`);
      console.log(`      Subtotal: ${order.subtotal || 'Not calculated'}`);
      console.log(`      Discount: ${order.discount ? (typeof order.discount === 'object' ? `${order.discount.value} (${order.discount.type})` : order.discount) : 'None'}`);
      console.log(`      Tax: ${order.tax ? (typeof order.tax === 'object' ? `${order.tax.rate}%` : order.tax) : 'None'}`);
      console.log(`      Shipping: ${order.shipping ? (typeof order.shipping === 'object' ? order.shipping.cost : order.shipping) : 'Not specified'}`);
      console.log(`      Total: ${order.total || order.totalAmount || 'Not calculated'}`);
      console.log('');
      
      // Items Information
      if (order.items && Array.isArray(order.items)) {
        console.log(`   📋 ORDER ITEMS (${order.items.length} items):`);
        order.items.forEach((item, itemIndex) => {
          console.log(`      ${itemIndex + 1}. ${item.name || item.description || 'Unnamed item'}`);
          console.log(`         Quantity: ${item.quantity || 1}`);
          console.log(`         Unit Price: ${order.currency || 'INR'} ${item.price || item.unitPrice || 0}`);
          console.log(`         Line Total: ${order.currency || 'INR'} ${item.total || (item.price * item.quantity) || 0}`);
          if (item.product) console.log(`         Product: ${item.product}`);
          if (item.category) console.log(`         Category: ${item.category}`);
          if (item.length) console.log(`         Length: ${item.length}`);
          if (item.color) console.log(`         Color: ${item.color}`);
          console.log('');
        });
      } else {
        console.log(`   📋 ORDER ITEMS: No items found`);
        console.log('');
      }
      
      // Order Source & Conversion Info
      if (order.originalQuoteId) {
        console.log(`   🔄 CONVERSION INFO:`);
        console.log(`      Original Quote ID: ${order.originalQuoteId}`);
        console.log(`      Order Source: ${order.orderSource || 'Quote conversion'}`);
        console.log('');
      }
      
      // Timestamps
      console.log(`   📅 TIMESTAMPS:`);
      if (order.orderDate) {
        console.log(`      Order Date: ${new Date(order.orderDate).toLocaleString()}`);
      }
      if (order.createdAt) {
        const createdAt = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        console.log(`      Created: ${createdAt.toLocaleString()}`);
      }
      if (order.updatedAt) {
        const updatedAt = order.updatedAt.toDate ? order.updatedAt.toDate() : new Date(order.updatedAt);
        console.log(`      Updated: ${updatedAt.toLocaleString()}`);
      }
      console.log('');
      
      // Google Sheets Sync Status
      console.log(`   📊 SYNC STATUS:`);
      console.log(`      Google Sheets: ${order.googleSheetSynced ? '✅ Synced' : '⏳ Pending'}`);
      if (order.googleSheetSyncedAt) {
        const syncedAt = order.googleSheetSyncedAt.toDate ? order.googleSheetSyncedAt.toDate() : new Date(order.googleSheetSyncedAt);
        console.log(`      Synced At: ${syncedAt.toLocaleString()}`);
      }
      console.log('');
      
      // Notes
      if (order.notes) {
        console.log(`   📝 NOTES:`);
        console.log(`      ${order.notes}`);
        console.log('');
      }
      
      console.log('─'.repeat(50));
      console.log('');
    });
    
    console.log('✅ Order display complete!');
    
  } catch (error) {
    console.error('❌ Error displaying orders:', error.message);
    console.error('Error details:', error);
  }
}

// Run the display
displayOrders().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Display failed:', error);
  process.exit(1);
});