// Unified product image mapping used across pages
(function() {
  function toLower(str) {
    return (str || '').toString().trim().toLowerCase();
  }

  // Category-level feature image mapping (optional utility)
  function getCategoryFeatureImages(category) {
    const categoryFeatureMap = {
      'Bulk': ['cuticle.png', 'color.png', 'measure.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'Weaves': ['cuticle.png', 'color.png', 'measure.png', 'durable.png', 'noshedding.png', 'stitch.png'],
      'Wigs': ['transparentlace.png', 'plucked.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png'],
      'Toppers': ['plucked.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'Closures': ['transparentlace.png', 'plucked.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png'],
      'Tapes': ['tapes.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'Tips': ['tips.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'Genius': ['genius.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'Genius Weaves': ['genius.png', 'cuticle.png', 'color.png', 'durable.png', 'noshedding.png', 'cut.png'],
      'DIY': ['diy.png', 'cuticle.png', 'color.png', 'measure.png', 'durable.png', 'cut.png'],
      'ClipOn': ['cuticle.png', 'color.png', 'measure.png', 'durable.png', 'noshedding.png', 'stitch.png']
    };
    const images = categoryFeatureMap[category] || [];
    return images.map(img => {
      if (img === 'genius.png') return 'images/Products/Genius.png';
      return `images/category-images/${category}/${img}`;
    });
  }

  // Category header/badge image mapping (stamps)
  function getCategoryImage(category) {
    const map = {
      'Tips': 'images/tipsstamps.png',
      'Tapes': 'images/tapesstamps.png',
      'Genius Weaves': 'images/geniusstamps.png',
      'Closures': 'images/lacestamps.png',
      'Wigs': 'images/generalstamps.png',
      'Weaves': 'images/generalstamps.png',
      'Bulk': 'images/generalstamps.png',
      'ClipOn': 'images/generalstamps.png',
      'DIY': 'images/generalstamps.png',
      'Toppers': 'images/generalstamps.png'
    };
    return map[category] || 'images/generalstamps.png';
  }

  // Product image mapping based on category/product/density
  function getProductImagePath(category, product, density) {
    const categoryLower = toLower(category);
    const productLower = toLower(product);
    const densityLower = toLower(density);

    // Direct synonym handling for specific product names
    // Map both correct and common misspelling to Genius image
    if (
      productLower === 'genius weft' ||
      productLower === 'genuis weft' ||
      (productLower.includes('genius') && productLower.includes('weft'))
    ) {
      return 'images/Products/Genius.png';
    }

    // Map “Clutch Bun(s)” variants to ClutchBun image
    if (
      productLower === 'clutch bun' ||
      productLower === 'clutch buns' ||
      (productLower.includes('clutch') && productLower.includes('bun'))
    ) {
      return 'images/Products/ClutchBun.png';
    }

    // Map “Wig-SilkTopper” and variants to TopperWig image
    if (
      productLower === 'wig-silktopper' ||
      productLower === 'wig silktopper' ||
      productLower === 'silktopper wig' ||
      productLower === 'topper wig' ||
      (productLower.includes('wig') && productLower.includes('topper')) ||
      (productLower.includes('wig') && productLower.includes('silk') && productLower.includes('topper'))
    ) {
      return 'images/Products/TopperWig.png';
    }

    // Weaves - Weft variants
    // Super Double Drawn → Weaves-SDD.png
    if (
      productLower === 'weaves - weft - super double drawn' ||
      (
        productLower.includes('weaves') &&
        productLower.includes('weft') &&
        productLower.includes('super') &&
        productLower.includes('double') &&
        productLower.includes('drawn')
      )
    ) {
      return 'images/Products/Weaves-SDD.png';
    }

    // Double Drawn → Weaves-DD.png (exclude super double)
    if (
      productLower === 'weaves - weft - double drawn' ||
      (
        productLower.includes('weaves') &&
        productLower.includes('weft') &&
        productLower.includes('double') &&
        productLower.includes('drawn') &&
        !productLower.includes('super')
      )
    ) {
      return 'images/Products/Weaves-DD.png';
    }

    // Single Drawn → Weaves-SD.png
    if (
      productLower === 'weaves - weft - single drawn' ||
      (
        productLower.includes('weaves') &&
        productLower.includes('weft') &&
        productLower.includes('single') &&
        productLower.includes('drawn')
      )
    ) {
      return 'images/Products/Weaves-SD.png';
    }

    // TIPSU → UTIPS.png (aliases U-Tips, UTips)
    if (
      productLower === 'tipsu' ||
      productLower === 'utips' ||
      productLower.includes('u-tips') ||
      productLower.includes('u tips')
    ) {
      return 'images/Products/UTIPS.png';
    }

    // TIPSFLAT → FlatTips.png (aliases Flat Tips)
    if (
      productLower === 'tipsflat' ||
      productLower.includes('flat tips') ||
      (productLower.includes('flat') && productLower.includes('tips'))
    ) {
      return 'images/Products/FlatTips.png';
    }

    const imageMap = {
      // Weaves
      'weaves': {
        'weaves': {
          'single drawn': 'images/Products/Weaves-SD.png',
          'double drawn': 'images/Products/Weaves-DD.png',
          'super double drawn': 'images/Products/Weaves-SDD.png'
        }
      },
      // Genius Weaves
      'genius weaves': {
        'genius weaves': 'images/Products/Genius.png',
        // Alias entries for clarity
        'genius weft': 'images/Products/Genius.png',
        'genuis weft': 'images/Products/Genius.png'
      },
      // DIY
      'diy': {
        'bangs': 'images/Products/Bangs.png',
        'curtain bangs': 'images/Products/Bangs.png',
        'curly faux buns': 'images/Products/CurlyBun.png',
        'bun20': 'images/Products/BUN.png',
        'bun30': 'images/Products/BUN.png',
        'flatclip ponytail': 'images/Products/FLATCLIPPONYTAIL.png',
        'highlights': 'images/Products/Highlights.png',
        'frontline-13x1': 'images/Products/Frontline.png',
        'frontline-2x1': 'images/Products/Frontline.png',
        'frontline-5x1': 'images/Products/Frontline.png',
        'single clip cover patch': 'images/Products/CoverPatch.png',
        'clutch bun': 'images/Products/ClutchBun.png'
      },
      // Closures
      'closures': {
        'closure': 'images/Products/Closure.png',
        'frontal': 'images/Products/Frontal.png',
        'frontal-13x4': 'images/Products/Frontal.png',
        'frontal-13x6': 'images/Products/Frontal.png',
        'closure-5x3': 'images/Products/Closure.png',
        'closure-4x4': 'images/Products/Closure.png',
        'closure-5x5': 'images/Products/Closure.png',
        'closure-6x6': 'images/Products/Closure.png',
        'closure-6x2': 'images/Products/Closure.png'
      },
      // Wigs
      'wigs': {
        'wig-closure5x5': 'images/Products/WIGCLOSURE.png',
        'wig-closure6x2': 'images/Products/WIGCLOSURE.png',
        'wig-dd-closure6x2': 'images/Products/WIGCLOSURE.png',
        'wig-dd-closure5x5': 'images/Products/WIGCLOSURE.png',
        'wig-silktopper': 'images/Products/SILKTOPPER.png',
        'wig-dd-frontal13x4': 'images/Products/WIGFRONTAL.png',
        'wig-dd-frontal13x6': 'images/Products/WIGFRONTAL.png',
        'wig-frontal13x6': 'images/Products/WIGFRONTAL.png',
        'wig-frontal13x4': 'images/Products/WIGFRONTAL.png'
      },
      // Bulk
      'bulk': {
        'bulk': 'images/Products/Bulk.png'
      },
      // Tapes
      'tapes': {
        'tape extension': 'images/Products/Tapes.png'
      },
      // Tips
      'tips': {
        'tips': 'images/Products/ITIPS.png',
        'tipsnano': 'images/Products/Nano.png',
        'tipsy': 'images/Products/YTIPS.png',
        'flat tips': 'images/Products/FlatTips.png',
        'u tips': 'images/Products/UTIPS.png'
      },
      // ClipOn
      'clipon': {
        'clipon classic': 'images/Products/ClipOn.png',
        'clipon seamless': 'images/Products/ClipOn.png',
        'clutch ponytail': 'images/Products/PonyTail.png',
        'halo extensions': 'images/Products/Halo.png',
        'wrap around ponytail': 'images/Products/PonyTail.png'
      },
      // Toppers
      'toppers': {
        'topper': 'images/Products/SILKTOPPER.png'
      }
    };

    if (imageMap[categoryLower] && imageMap[categoryLower][productLower]) {
      const mapping = imageMap[categoryLower][productLower];
      if (typeof mapping === 'object') {
        return mapping[densityLower] || Object.values(mapping)[0] || '';
      }
      return mapping;
    }

    // Density fallback for Weaves
    if (categoryLower === 'weaves' && densityLower) {
      if (densityLower.includes('single drawn')) return 'images/Products/Weaves-SD.png';
      if (densityLower.includes('double drawn')) return 'images/Products/Weaves-DD.png';
      if (densityLower.includes('super double drawn')) return 'images/Products/Weaves-SDD.png';
    }
    return '';
  }

  // Expose under a namespace and as simple globals for convenience
  window.productImageMapping = {
    getProductImagePath,
    getCategoryImage,
    getCategoryFeatureImages
  };
  window.getProductImagePath = window.getProductImagePath || getProductImagePath;
  window.getCategoryImage = window.getCategoryImage || getCategoryImage;
  window.getCategoryFeatureImages = window.getCategoryFeatureImages || getCategoryFeatureImages;
})();