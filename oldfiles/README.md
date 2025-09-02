# Price List Generator - Indian Natural Hair

A professional, responsive web application for generating shareable price lists with real-time currency conversion, cascading product selection, and image export capabilities.

## Features

### 🌍 Multi-Currency Support
- **Base Currency**: INR (Indian Rupee)
- **Supported Currencies**: USD, EUR, GBP, AUD, SAR, NAIRA, AED
- **Live Exchange Rates**: Fetches real-time rates with manual refresh option
- **Offline Fallback**: Cached rates for offline functionality
- **Precision**: 2-decimal currency conversion with proper symbols

### 🔄 Smart Cascading Dropdowns
- **Category → Product → Density → Color** selection flow
- **Progressive Enabling**: Dropdowns unlock as selections are made
- **Dynamic Filtering**: Options filter based on previous selections
- **Real-time Pricing**: Shows current price for exact combination
- **Validation**: Prevents invalid combinations

### 📊 KG Mode Support
- **Automatic Detection**: Shows "List in KG" checkbox for eligible categories
- **Price Multiplication**: Multiplies prices by 10 when KG mode is enabled
- **Visual Indication**: Displays "KG Mode" in preview header

### 🖼️ Professional Image Generation
- **Canvas Export**: High-DPI PNG generation (2x resolution)
- **Brand Elements**: 
  - Left-aligned logo on every image
  - Category-specific header stamps:
    - "Genius Weaves" → geniusstamps.png
    - "Wigs/Closures/Toppers" → lacestamps.png
    - "Tapes" → tapesstamps.png
    - "Tips" → tipsstamps.png
    - Others → generalstamps.png
- **Dynamic Header**: "Product - Density - Colors" format
- **Organized Table**: Clean product rows with converted prices
- **Professional Footer**: Company address and contact information

### 📱 Modern UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Clean Interface**: Professional sidebar + main preview layout
- **Real-time Preview**: Live canvas updates as selections change
- **Accessibility**: Proper labels, keyboard navigation, ARIA attributes
- **State Persistence**: Saves selections and items in localStorage

### 🚀 Sharing & Export
- **Preview Mode**: Real-time canvas preview
- **Download PNG**: High-quality image export
- **Web Share API**: Native sharing when supported
- **Fallback**: Automatic download when sharing unavailable

## Technical Implementation

### Architecture
- **Single Page Application**: One HTML file with inline CSS/JS
- **No Build Tools**: Direct browser execution
- **Vanilla JavaScript**: No framework dependencies
- **Tailwind CSS**: CDN-based styling

### Data Structure
- **JSON Data Source**: ProductDataJson280225.json
- **Exchange Rate API**: Real-time currency conversion
- **Local Storage**: State persistence and rate caching
- **Canvas API**: High-quality image generation

### Error Handling
- **Graceful Degradation**: Fallback rates for API failures
- **Image Loading**: Error handling for missing assets
- **Validation**: Prevents invalid product combinations
- **User Feedback**: Clear error messages and loading states

## Usage Instructions

### Getting Started
1. **Open the Application**: Navigate to `index.html` in your browser
2. **Select Currency**: Choose your preferred currency from the dropdown
3. **Refresh Rates**: Click "Refresh Exchange Rates" for latest conversion rates

### Creating a Price List
1. **Select Category**: Choose from available product categories
2. **Choose Product**: Select specific product (dropdown enables automatically)
3. **Pick Density**: Choose density option (enables after product selection)
4. **Select Color**: Choose color variant (enables after density selection)
5. **KG Mode**: Check "List in KG" if available and desired
6. **Add Item**: Click "Add to List" to include in your price list
7. **Repeat**: Add multiple items as needed

### Generating & Sharing
1. **Preview**: Real-time preview updates automatically
2. **Download**: Click "Download PNG" for high-quality image
3. **Share**: Use "Share" button for native sharing (or download fallback)
4. **Clear**: Use "Clear List" to start over

## File Structure

```
inh2/
├── index.html                    # Main application file
├── ProductDataJson280225.json     # Product data source
├── README.md                      # This documentation
└── inages/                        # Image assets
    ├── logo.png                   # Company logo
    ├── geniusstamps.png          # Genius Weaves stamp
    ├── lacestamps.png            # Wigs/Closures/Toppers stamp
    ├── tapesstamps.png           # Tapes stamp
    ├── tipsstamps.png            # Tips stamp
    ├── generalstamps.png         # General category stamp
    ├── madewithbadge.png         # Additional badge
    └── template.png              # Template image
```

## Browser Compatibility

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Required Features**: Canvas API, Fetch API, Local Storage
- **Optional Features**: Web Share API (graceful fallback)

## Customization

### Adding New Currencies
1. Update `currencySymbols` object with new currency symbol
2. Add currency option to the select dropdown
3. Ensure exchange rate API supports the currency

### Modifying Category Stamps
1. Add new stamp image to `/inages/` directory
2. Update `getCategoryStamp()` function with new mapping logic

### Styling Changes
1. Modify Tailwind classes in HTML
2. Add custom CSS in the `<style>` section
3. Update canvas styling in the preview generation code

## Performance Considerations

- **Image Optimization**: Use optimized PNG files for faster loading
- **Rate Limiting**: Exchange rate API calls are manual to avoid limits
- **Local Caching**: Rates and selections cached for offline use
- **Canvas Efficiency**: High-DPI rendering with optimized drawing operations

## Security Notes

- **CORS**: Images must be served from same origin or with proper CORS headers
- **API Keys**: Exchange rate API is public (consider rate limits for production)
- **Local Storage**: No sensitive data stored locally
- **Input Validation**: All user inputs are validated before processing

## Troubleshooting

### Common Issues

**Images Not Loading**
- Ensure all image files are in the `/inages/` directory
- Check file permissions and paths
- Verify images are accessible via HTTP server

**Exchange Rates Not Updating**
- Check internet connection
- Verify API endpoint is accessible
- Use cached rates as fallback

**Canvas Export Issues**
- Ensure browser supports Canvas API
- Check for CORS issues with images
- Verify sufficient memory for high-DPI rendering

**Dropdown Not Populating**
- Verify JSON data file is accessible
- Check browser console for JavaScript errors
- Ensure data structure matches expected format

## Development

### Local Development
```bash
# Start local server
python3 -m http.server 8000

# Or use Node.js
npx serve .

# Access at http://localhost:8000
```

### Testing
- Test all currency conversions
- Verify cascading dropdown behavior
- Test image generation and export
- Check responsive design on various devices
- Validate KG mode functionality

## License

This project is created for Indian Natural Hair company. All rights reserved.

## Support

For technical support or feature requests, please contact the development team.

---

**Built with ❤️ for Indian Natural Hair**
*Professional price list generation made simple*