# Hair Process Calculator - WordPress Plugin

A comprehensive WordPress plugin for calculating hair processing formulations including cuticle removal, permanent straightening, and bleaching processes.

## Features

- **Cuticle Removal Calculator**: Calculate precise amounts of chemicals needed for cuticle removal processes
- **Permanent Straightening Calculator**: Determine thioglycolic acid formulations for hair straightening
- **Bleaching Calculator**: Complete 3-step bleaching process with mordanting, bleaching, and neutralization
- **Light Theme Design**: Clean, professional light theme with warm cream and brown color palette
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Copy to Clipboard**: Easy copying of calculated formulations
- **WordPress Integration**: Simple shortcode implementation
- **Customizable**: Multiple shortcode parameters for flexibility

## Installation

### Method 1: Manual Installation

1. Download all plugin files:
   - `hair-process-calculator.php`
   - `hair-calculator-styles.css`
   - `hair-calculator-script.js`
   - `README.md`

2. Create a new folder called `hair-process-calculator` in your WordPress plugins directory:
   ```
   /wp-content/plugins/hair-process-calculator/
   ```

3. Upload all files to this folder:
   ```
   /wp-content/plugins/hair-process-calculator/hair-process-calculator.php
   /wp-content/plugins/hair-process-calculator/hair-calculator-styles.css
   /wp-content/plugins/hair-process-calculator/hair-calculator-script.js
   /wp-content/plugins/hair-process-calculator/README.md
   ```

4. Go to your WordPress admin dashboard
5. Navigate to **Plugins > Installed Plugins**
6. Find "Hair Process Calculator" and click **Activate**

### Method 2: ZIP Installation

1. Create a ZIP file containing all plugin files
2. Go to **Plugins > Add New** in your WordPress admin
3. Click **Upload Plugin**
4. Choose your ZIP file and click **Install Now**
5. Click **Activate Plugin**

## Usage

### Basic Shortcode

To display the calculator on any page or post, simply add:

```
[hair_calculator]
```

### Shortcode Parameters

Customize the calculator behavior with these parameters:

#### `default_tab`
Set which calculator tab is active by default.
- **Options**: `cuticle`, `thioglycolate`, `mordant`
- **Default**: `cuticle`

#### `show_footer`
Show or hide the plugin footer.
- **Options**: `true`, `false`
- **Default**: `true`

### Examples

```
[hair_calculator default_tab="thioglycolate"]
```
Starts with the Permanent Straightening calculator active.

```
[hair_calculator show_footer="false"]
```
Hides the footer section.

```
[hair_calculator default_tab="mordant" show_footer="false"]
```
Starts with the Bleaching calculator and hides the footer.

## Calculator Details

### Cuticle Removal Calculator
- **Input**: Hair weight (grams), Process percentage (1-100%)
- **Output**: Calcium Hypochlorite, Sulfuric Acid, Process water, Ammonium Hydroxide, Neutralization water
- **Process**: 20 min acid bath → Wash 3× → 45 min neutralization → Wash 3×

### Permanent Straightening Calculator
- **Input**: Hair weight (grams), Bath volume per 100g (mL)
- **Output**: Total solution volume, Thioglycolic acid (TGA), 25% Ammonia water, DI water
- **Process**: 20-30 min treatment → Wash 3× → 5-10 min neutralization → Wash 3×

### Bleaching Calculator
- **Input**: Hair weight (grams)
- **Output**: Three-step process with precise chemical amounts
- **Steps**:
  1. **Mordanting**: Ferrous Sulphate, Citric Acid, Sodium Chloride, Water, Ammonium Hydroxide
  2. **Bleaching**: Hydrogen Peroxide 50%, Water, Ammonium Persulfate, Potassium Persulfate, Sodium Carbonate, Sodium Silicate, Sodium Stannate, EDTA
  3. **Neutralization**: Water, Oxalic Acid, Citric Acid, Sodium Bisulfite

## Safety Information

⚠️ **Important Safety Notes**:
- Always wear mask and eye protection
- Use plastic vessels only
- Follow all local safety regulations
- Ensure proper ventilation
- Have emergency procedures in place

## Technical Requirements

- **WordPress**: 5.0 or higher
- **PHP**: 7.4 or higher
- **jQuery**: Included with WordPress
- **Modern Browser**: Chrome, Firefox, Safari, Edge

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Calculator Not Displaying
1. Ensure the plugin is activated
2. Check that you're using the correct shortcode: `[hair_calculator]`
3. Verify all plugin files are uploaded correctly

### Styling Issues
1. Check for theme conflicts
2. Ensure `hair-calculator-styles.css` is uploaded
3. Clear any caching plugins

### JavaScript Not Working
1. Check browser console for errors
2. Ensure jQuery is loaded
3. Verify `hair-calculator-script.js` is uploaded
4. Check for JavaScript conflicts with other plugins

### Copy Function Not Working
1. Ensure you're using HTTPS (required for modern clipboard API)
2. Check browser permissions
3. Try the fallback copy method (should work automatically)

## Customization

### Design

The calculator features a clean, professional light theme:

- **Background**: Warm cream tones (#f7f4f0, #ffffff) for a comfortable viewing experience
- **Text**: Rich brown (#3c2415) for excellent readability
- **Accents**: Saddle brown (#8b4513) for professional highlighting
- **Shadows**: Subtle brown-tinted shadows for depth and elegance

### Customization
You can override the plugin styles by adding custom CSS to your theme:

```css
.hair-calculator {
    /* Your custom styles here */
}

.hair-calculator .btn {
    /* Custom button styles */
}

/* Custom colors */
 .hair-calculator {
     --accent: #your-primary-color;
     --bg: #your-background-color;
     --ink: #your-text-color;
 }
```

### Color Scheme
The plugin uses CSS custom properties (variables) that you can override:

```css
.hair-calculator {
    --bg: #ffffff;           /* Background color */
    --fg: #1a1a1a;           /* Text color */
    --muted: #6b7280;        /* Muted text */
    --border: #e5e7eb;       /* Border color */
    --accent: #3b82f6;       /* Accent color */
    --accent-hover: #2563eb; /* Accent hover */
    --panel: #f9fafb;        /* Panel background */
    --shadow: rgba(0, 0, 0, 0.1); /* Shadow */
}
```

## Support

For support and questions:
- **Website**: [https://www.indiannaturalhair.com](https://www.indiannaturalhair.com)
- **Email**: Contact through the website

## License

This plugin is licensed under the GPL v2 or later.

## Changelog

### Version 1.0.0
- Initial release
- Cuticle Removal Calculator
- Permanent Straightening Calculator
- Bleaching Calculator (3-step process)
- Responsive design
- Copy to clipboard functionality
- WordPress shortcode integration
- Admin settings page

## Credits

Developed by **IND Natural Hair**
- Website: [https://www.indiannaturalhair.com](https://www.indiannaturalhair.com)
- Specialized in natural hair care and processing techniques

---

**Note**: This calculator is for professional use. Always follow proper safety protocols and local regulations when working with chemical processes.