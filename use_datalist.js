const fs = require('fs');
let html = fs.readFileSync('delegated-orders.html', 'utf8');

// 1. We need to define the datalists globally once, e.g., in initOrderEntry or setupMasterGrid, or statically in HTML.
// Statically in HTML is best, but since some are dynamic (Price List), we can generate them dynamically in JS.
const initDatalists = `
    function initDatalists() {
      if(document.getElementById('dl-country')) return;
      const createDL = (id, opts) => {
        const dl = document.createElement('datalist');
        dl.id = id;
        opts.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          dl.appendChild(opt);
        });
        document.body.appendChild(dl);
      };
      createDL('dl-country', OE_COUNTRIES);
      createDL('dl-currency', OE_CURRENCIES);
      createDL('dl-unit', OE_UNITS);
      createDL('dl-length', OE_LENGTHS);
      createDL('dl-pricelist', getDynamicPriceLists());
    }`;

// Insert initDatalists before initOrderEntry
html = html.replace('function initOrderEntry() {', initDatalists + '\\n\\n    function initOrderEntry() {');

// 2. Call initDatalists in setupMasterGrid
html = html.replace('function setupMasterGrid() {', 'function setupMasterGrid() {\\n      initDatalists();');

// 3. Update sgAppendRowDOM to use inputs with lists
const oldSelectLogic = `        if (field === 'Country' || field === 'Currency' || field === 'Unit' || field === 'Price List' || field === 'Length') {
          el = document.createElement('select');
          el.className = 'w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none min-w-[60px]';
          let options = [];
          if (field === 'Country') options = OE_COUNTRIES;
          if (field === 'Currency') options = OE_CURRENCIES;
          if (field === 'Unit') options = OE_UNITS;
          if (field === 'Length') options = OE_LENGTHS;
          if (field === 'Price List') options = priceLists;

          el.add(new Option('', ''));
          options.forEach(opt => el.add(new Option(opt, opt, false, val === opt)));
        } else if (field === 'Amount') {`;

const newSelectLogic = `        if (field === 'Country' || field === 'Currency' || field === 'Unit' || field === 'Price List' || field === 'Length') {
          el = document.createElement('input');
          el.type = 'text';
          el.className = 'w-full h-full p-3 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 min-w-[80px]';
          if (field === 'Country') el.setAttribute('list', 'dl-country');
          if (field === 'Currency') el.setAttribute('list', 'dl-currency');
          if (field === 'Unit') el.setAttribute('list', 'dl-unit');
          if (field === 'Length') el.setAttribute('list', 'dl-length');
          if (field === 'Price List') el.setAttribute('list', 'dl-pricelist');
          el.value = val;
        } else if (field === 'Amount') {`;

html = html.replace(oldSelectLogic, newSelectLogic);

fs.writeFileSync('delegated-orders.html', html);
console.log("Datalist implemented.");
