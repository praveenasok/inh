function downloadQuoteAsImage() {
    try {
        const quoteElement = document.getElementById('quote-table-container');
        if (!quoteElement) {
            return;
        }
        
        html2canvas(quoteElement).then(canvas => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quote-image.png';
            a.click();
            URL.revokeObjectURL(url);
        }).catch(error => {
        });
    } catch (error) {
    }
}
