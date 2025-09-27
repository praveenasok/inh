window.LANGUAGE_CONFIG = {
  locale: 'en-US',
  fallbackLocale: 'en-US',
  
  supportedLocales: [
    'en-US',
    'hi-IN',
    'es-ES',
    'fr-FR',
    'de-DE',
    'it-IT',
    'pt-BR',
    'ru-RU',
    'ja-JP',
    'ko-KR',
    'zh-CN',
    'ar-SA'
  ],
  
  translations: {
    'en-US': {
      'app.title': 'Indian Natural Hair',
      'nav.home': 'Home',
      'nav.products': 'Products',
      'nav.quotes': 'Quotes',
      'nav.admin': 'Admin',
      'nav.sync': 'Sync',
      'product.name': 'Product Name',
      'product.category': 'Category',
      'product.density': 'Density',
      'product.length': 'Length',
      'product.price': 'Price',
      'quote.create': 'Create Quote',
      'quote.edit': 'Edit Quote',
      'quote.save': 'Save Quote',
      'quote.delete': 'Delete Quote',
      'quote.convert': 'Convert to Order',
      'client.name': 'Client Name',
      'client.company': 'Company',
      'client.email': 'Email',
      'client.phone': 'Phone',
      'order.create': 'Create Order',
      'order.save': 'Save Order',
      'order.total': 'Total Amount',
      'sync.manual': 'Manual Sync',
      'sync.auto': 'Auto Sync',
      'sync.status': 'Sync Status',
      'admin.users': 'Users',
      'admin.settings': 'Settings',
      'admin.reports': 'Reports',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.warning': 'Warning',
      'common.info': 'Information'
    },
    
    'hi-IN': {
      'app.title': 'इंडियन नेचुरल हेयर',
      'nav.home': 'होम',
      'nav.products': 'उत्पाद',
      'nav.quotes': 'कोटेशन',
      'nav.admin': 'एडमिन',
      'nav.sync': 'सिंक',
      'product.name': 'उत्पाद का नाम',
      'product.category': 'श्रेणी',
      'product.density': 'घनत्व',
      'product.length': 'लंबाई',
      'product.price': 'मूल्य',
      'quote.create': 'कोटेशन बनाएं',
      'quote.edit': 'कोटेशन संपादित करें',
      'quote.save': 'कोटेशन सेव करें',
      'quote.delete': 'कोटेशन हटाएं',
      'quote.convert': 'ऑर्डर में बदलें',
      'client.name': 'ग्राहक का नाम',
      'client.company': 'कंपनी',
      'client.email': 'ईमेल',
      'client.phone': 'फोन',
      'order.create': 'ऑर्डर बनाएं',
      'order.save': 'ऑर्डर सेव करें',
      'order.total': 'कुल राशि',
      'sync.manual': 'मैन्युअल सिंक',
      'sync.auto': 'ऑटो सिंक',
      'sync.status': 'सिंक स्थिति',
      'admin.users': 'उपयोगकर्ता',
      'admin.settings': 'सेटिंग्स',
      'admin.reports': 'रिपोर्ट्स',
      'common.save': 'सेव करें',
      'common.cancel': 'रद्द करें',
      'common.delete': 'हटाएं',
      'common.edit': 'संपादित करें',
      'common.add': 'जोड़ें',
      'common.search': 'खोजें',
      'common.filter': 'फिल्टर',
      'common.loading': 'लोड हो रहा है...',
      'common.error': 'त्रुटि',
      'common.success': 'सफलता',
      'common.warning': 'चेतावनी',
      'common.info': 'जानकारी'
    }
  },
  
  dateFormats: {
    'en-US': 'MM/DD/YYYY',
    'hi-IN': 'DD/MM/YYYY',
    'es-ES': 'DD/MM/YYYY',
    'fr-FR': 'DD/MM/YYYY',
    'de-DE': 'DD.MM.YYYY',
    'it-IT': 'DD/MM/YYYY',
    'pt-BR': 'DD/MM/YYYY',
    'ru-RU': 'DD.MM.YYYY',
    'ja-JP': 'YYYY/MM/DD',
    'ko-KR': 'YYYY.MM.DD',
    'zh-CN': 'YYYY/MM/DD',
    'ar-SA': 'DD/MM/YYYY'
  },
  
  currencyFormats: {
    'en-US': { symbol: '$', position: 'before' },
    'hi-IN': { symbol: '₹', position: 'before' },
    'es-ES': { symbol: '€', position: 'after' },
    'fr-FR': { symbol: '€', position: 'after' },
    'de-DE': { symbol: '€', position: 'after' },
    'it-IT': { symbol: '€', position: 'after' },
    'pt-BR': { symbol: 'R$', position: 'before' },
    'ru-RU': { symbol: '₽', position: 'after' },
    'ja-JP': { symbol: '¥', position: 'before' },
    'ko-KR': { symbol: '₩', position: 'before' },
    'zh-CN': { symbol: '¥', position: 'before' },
    'ar-SA': { symbol: 'ر.س', position: 'after' }
  },
  
  formatDate: function(date, locale = this.locale) {
    try {
      const format = this.dateFormats[locale] || this.dateFormats[this.fallbackLocale];
      const d = new Date(date);
      
      if (isNaN(d.getTime())) {
        return date;
      }
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
    } catch (error) {
      return date;
    }
  },
  
  formatTime: function(date, locale = this.locale) {
    try {
      const d = new Date(date);
      
      if (isNaN(d.getTime())) {
        return date;
      }
      
      return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale === 'en-US'
      });
    } catch (error) {
      return date;
    }
  },
  
  formatCurrency: function(amount, locale = this.locale) {
    try {
      const format = this.currencyFormats[locale] || this.currencyFormats[this.fallbackLocale];
      const formattedAmount = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
      
      if (format.position === 'before') {
        return `${format.symbol}${formattedAmount}`;
      } else {
        return `${formattedAmount} ${format.symbol}`;
      }
    } catch (error) {
      return amount;
    }
  },
  
  formatNumber: function(number, locale = this.locale) {
    try {
      return new Intl.NumberFormat(locale).format(number);
    } catch (error) {
      return number;
    }
  },
  
  translate: function(key, locale = this.locale) {
    const translations = this.translations[locale] || this.translations[this.fallbackLocale];
    return translations[key] || key;
  },
  
  setLocale: function(locale) {
    if (this.supportedLocales.includes(locale)) {
      this.locale = locale;
      document.documentElement.lang = locale;
      return true;
    }
    return false;
  },
  
  detectBrowserLocale: function() {
    const browserLocale = navigator.language || navigator.userLanguage;
    const supportedLocale = this.supportedLocales.find(locale => 
      locale.startsWith(browserLocale.split('-')[0])
    );
    return supportedLocale || this.fallbackLocale;
  },
  
  init: function() {
    const savedLocale = localStorage.getItem('language-preference');
    const browserLocale = this.detectBrowserLocale();
    const targetLocale = savedLocale || browserLocale;
    
    if (this.setLocale(targetLocale)) {
    } else {
    }
    
    localStorage.setItem('language-preference', this.locale);
  }
};

if (typeof window !== 'undefined') {
  window.LANGUAGE_CONFIG.init();
}