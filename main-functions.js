// Main Functions for Price List Generator
// This file contains all the core functionality for the application



// Additional functions for quote image download
function downloadQuoteAsImage() {
    try {
        const quoteElement = document.getElementById('quote-table-container');
        if (!quoteElement) {
            alert('Quote table not found!');
            return;
        }
        
        html2canvas(quoteElement).then(canvas => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quote-image.png';
            a.click();
            URL.revokeObjectURL(url);
            alert('Quote image downloaded!');
        }).catch(error => {
            console.error('Error generating image:', error);
            alert('Error generating image. Please try again.');
        });
    } catch (error) {
        console.error('Error in downloadQuoteAsImage:', error);
        alert('Error downloading image. Please try again.');
    }
}

// End of main-functions.js
