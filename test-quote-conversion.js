const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

console.log('🧪 Testing Quote-to-Order Conversion...');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testQuoteConversion() {
  try {
    console.log('\n1️⃣ Checking existing quotes...');
    const quotesSnapshot = await db.collection('quotes').get();
    console.log(`Found ${quotesSnapshot.size} quotes in database`);
    
    if (quotesSnapshot.size === 0) {
      console.log('❌ No quotes found to convert. Please create a quote first.');
      return;
    }
    
    // Get the first quote for testing
    const firstQuote = quotesSnapshot.docs[0];
    const quoteData = firstQuote.data();
    const quoteId = firstQuote.id;
    
    console.log(`\n2️⃣ Selected quote for conversion:`);
    console.log(`   Quote ID: ${quoteId}`);
    console.log(`   Client: ${quoteData.clientName || quoteData.customerName || 'Unknown'}`);
    console.log(`   Total: ${quoteData.currency || 'INR'} ${quoteData.total || quoteData.totalAmount || 0}`);
    
    // Check if quote is already converted
    if (quoteData.status === 'converted_to_order') {
      console.log('⚠️  This quote has already been converted to an order.');
      console.log(`   Order ID: ${quoteData.convertedToOrderId}`);
      return;
    }
    
    console.log('\n3️⃣ Converting quote to order...');
    
    // Generate order number
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    const orderNumber = `ORD-${dateStr}-${timeStr}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Create order data from quote
    const orderData = {
      ...quoteData,
      originalQuoteId: quoteId,
      orderNumber: orderNumber,
      status: 'pending',
      orderType: 'converted_from_quote',
      orderDate: new Date().toISOString(),
      orderSource: 'test_conversion',
      priority: 'normal'
    };
    
    // Remove quote-specific fields
    delete orderData.quoteId;
    delete orderData.quoteNumber;
    
    // Save the order
    const orderRef = await db.collection('orders').add({
      ...orderData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      googleSheetSynced: false
    });
    
    console.log(`✅ Order created successfully!`);
    console.log(`   Order ID: ${orderRef.id}`);
    console.log(`   Order Number: ${orderNumber}`);
    
    // Update quote status
    await db.collection('quotes').doc(quoteId).update({
      status: 'converted_to_order',
      convertedToOrderId: orderRef.id,
      convertedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Quote status updated to 'converted_to_order'`);
    
    console.log('\n4️⃣ Verifying conversion...');
    
    // Check orders count
    const ordersSnapshot = await db.collection('orders').get();
    console.log(`📊 Total orders in database: ${ordersSnapshot.size}`);
    
    // Get the created order
    const createdOrder = await db.collection('orders').doc(orderRef.id).get();
    const createdOrderData = createdOrder.data();
    
    console.log(`\n✅ Conversion Test SUCCESSFUL!`);
    console.log(`   Quote ${quoteId} → Order ${orderRef.id}`);
    console.log(`   Order Number: ${createdOrderData.orderNumber}`);
    console.log(`   Client: ${createdOrderData.clientName || createdOrderData.customerName || 'Unknown'}`);
    console.log(`   Total: ${createdOrderData.currency || 'INR'} ${createdOrderData.total || createdOrderData.totalAmount || 0}`);
    console.log(`   Status: ${createdOrderData.status}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testQuoteConversion().then(() => {
  console.log('\n🏁 Test completed.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});