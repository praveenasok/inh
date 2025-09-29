const GoogleSheetsService = require('./google-sheets-service');

async function extractCountsFromSheets() {

    try {
        // Initialize Google Sheets service
        const googleSheetsService = new GoogleSheetsService();
        await googleSheetsService.initialize();

        
        // Get salesmen data
        const salesmenData = await googleSheetsService.fetchSalesmanData(googleSheetsService.spreadsheetId);
        const salesmenCount = salesmenData.length;
        
        salesmenData.forEach((salesman, index) => {
        });
        
        
        // Get products data (from pricelists sheet)
        const productsData = await googleSheetsService.fetchProductData(googleSheetsService.spreadsheetId);
        
        // Extract unique price list names
        const priceListNames = new Set();
        const priceListField = 'Price List Name'; // Exact field name from the data
        
        productsData.forEach(product => {
            if (product[priceListField] && product[priceListField].trim()) {
                priceListNames.add(product[priceListField].trim());
            }
        });
        
        const uniquePriceListCount = priceListNames.size;
        const priceListArray = Array.from(priceListNames).sort();
        
        priceListArray.forEach((priceList, index) => {
            // Count how many products use this price list
            const productCount = productsData.filter(p => p[priceListField] === priceList).length;
        });
        
        
        // Additional verification
        
        return {
            salesmenCount,
            priceListCount: uniquePriceListCount,
            priceListNames: priceListArray,
            totalProducts: productsData.length,
            salesmenData,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        throw error;
    }
}

// Run the extraction if this script is executed directly
if (require.main === module) {
    extractCountsFromSheets()
        .then(result => {
            process.exit(0);
        })
        .catch(error => {
            process.exit(1);
        });
}

module.exports = { extractCountsFromSheets };