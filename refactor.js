const fs = require('fs');

let code = fs.readFileSync('inh-ratio-mix/script.js', 'utf8');

// 1. Setup FINISHED_LENGTHS arrays
code = code.replace(
    /const FINISHED_LENGTHS = \[.*?\];/,
    "const EVEN_FINISHED_LENGTHS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];\n    const ALL_FINISHED_LENGTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];\n    let ACTIVE_FINISHED_LENGTHS = [...EVEN_FINISHED_LENGTHS];"
);

// 2. Change dynamic application of active lengths
code = code.replace(
    /let newLengths = Array\.from\(activeRawSet\)\.sort\(\(a,b\) => a - b\);\s+if \(newLengths\.length === 0\) \{\s+newLengths = EVEN_RAW_LENGTHS;\s+\}\s+const changed = ACTIVE_RAW_LENGTHS\.length !== newLengths\.length \|\|\s+ACTIVE_RAW_LENGTHS\.some\(\(val, i\) => val !== newLengths\[i\]\);\s+if \(changed\) \{\s+ACTIVE_RAW_LENGTHS = newLengths;\s+initTable\(\);\s+refreshTableInputs\(\);\s+\}/,
    `let newLengths = Array.from(activeRawSet).sort((a,b) => a - b);
        if (newLengths.length === 0) newLengths = EVEN_RAW_LENGTHS;

        let hasOdd = newLengths.some(l => l % 2 !== 0);
        let newFinished = hasOdd ? ALL_FINISHED_LENGTHS : EVEN_FINISHED_LENGTHS;

        const rawChanged = ACTIVE_RAW_LENGTHS.length !== newLengths.length || ACTIVE_RAW_LENGTHS.some((val, i) => val !== newLengths[i]);
        const finChanged = ACTIVE_FINISHED_LENGTHS.length !== newFinished.length || ACTIVE_FINISHED_LENGTHS.some((val, i) => val !== newFinished[i]);

        if (rawChanged || finChanged) {
            ACTIVE_RAW_LENGTHS = newLengths;
            ACTIVE_FINISHED_LENGTHS = newFinished;
            initTable();
            refreshTableInputs();
        }`
);

// 3. Provide migration function inside loadRatioConfig
const loadRatioRegex = /appState\.matrix = JSON\.parse\(JSON\.stringify\(data\.matrix \|\| \{\}\)\); \/\/ Deep copy/;
const migrationSnippet = `appState.matrix = JSON.parse(JSON.stringify(data.matrix || {}));
            // MIGRATION: Convert legacy indexes 0, 1... to lengths 4, 6...
            Object.keys(appState.matrix).forEach(key => {
                if (parseInt(key) < 20) { // Legacy idx
                    const lenKey = EVEN_FINISHED_LENGTHS[parseInt(key)];
                    if (lenKey) {
                        appState.matrix[lenKey] = appState.matrix[key];
                        delete appState.matrix[key];
                    }
                }
            });
            if (data.customPrices) {
                appState.customPrices = {};
                Object.keys(data.customPrices).forEach(key => {
                    const lenKey = parseInt(key) < 20 ? EVEN_FINISHED_LENGTHS[parseInt(key)] : key;
                    if(lenKey) appState.customPrices[lenKey] = data.customPrices[key];
                });
            }
            if (data.individualMargins) {
                appState.individualMargins = {};
                Object.keys(data.individualMargins).forEach(key => {
                    const lenKey = parseInt(key) < 20 ? EVEN_FINISHED_LENGTHS[parseInt(key)] : key;
                    if(lenKey) appState.individualMargins[lenKey] = data.individualMargins[key];
                });
            }
`;
code = code.replace(loadRatioRegex, migrationSnippet);

// Replace ALL FINISHED_LENGTHS.forEach occurrences
// We will replace 'cIdx', 'colIdx', 'colIndex', 'idx' with 'len' to standardize.
code = code.replace(/FINISHED_LENGTHS/g, "ACTIVE_FINISHED_LENGTHS");

fs.writeFileSync('inh-ratio-mix/script.js', code, 'utf8');
console.log('Script patched base structural definitions.');
