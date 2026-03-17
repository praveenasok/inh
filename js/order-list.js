document.addEventListener('DOMContentLoaded', () => {
    
    // Default columns as requested
    const defaultColumns = [
        "Order Date", "Order Status", "Delivered Date", "Order Number", 
        "Client Name", "Contact", "Country", "Price List", "Length", 
        "Product", "Product Type", "Style", "Color", "Comment", 
        "Quantity", "Currency", "Rate", "Amount", "Exchange Rate", 
        "Base Amount", "Assigned To", "Sales Person"
    ];

    // LocalStorage keys
    const DB_KEY = 'inhOrderListDB';
    const RATIO_MIXER_DB_KEY = 'hairRatioDB';

    // State
    let db = {
        columns: [...defaultColumns],
        rows: Array(50).fill({})
    };

    // Load Price Lists from Ratio Mixer DB
    let availablePriceLists = [];
    try {
        const ratioData = localStorage.getItem(RATIO_MIXER_DB_KEY);
        if (ratioData) {
            const parsed = JSON.parse(ratioData);
            if (parsed && parsed.priceLists) {
                availablePriceLists = parsed.priceLists.map(pl => pl.name);
            }
        }
    } catch (e) {
        console.error("Failed to load Ratio Mixer price lists", e);
    }

    // Load from local storage
    try {
        const savedData = localStorage.getItem(DB_KEY);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.columns) db.columns = parsed.columns;
            if (parsed.rows && parsed.rows.length > 0) {
                // Pad minimum 50 rows
                db.rows = parsed.rows;
                if (db.rows.length < 50) {
                    db.rows = [...db.rows, ...Array(50 - db.rows.length).fill({})];
                }
            }
        }
    } catch (e) {
        console.warn("Could not load from DB, starting fresh", e);
    }

    const tableHeaderRow = document.getElementById('table-header-row');
    const tableBody = document.getElementById('table-body');
    const datalistContainer = document.getElementById('datalist-container');
    const statusText = document.getElementById('status-text');

    // DOM Builders
    function renderTable() {
        tableHeaderRow.innerHTML = '';
        tableBody.innerHTML = '';

        // Render Header
        const numTh = document.createElement('th');
        numTh.className = 'row-number';
        numTh.textContent = '#';
        tableHeaderRow.appendChild(numTh);

        db.columns.forEach((col, cIdx) => {
            const th = document.createElement('th');
            th.textContent = col;
            tableHeaderRow.appendChild(th);
        });

        // Render Body
        db.rows.forEach((rowObj, rIdx) => {
            const tr = document.createElement('tr');
            
            // Row Number Col
            const tdNum = document.createElement('td');
            tdNum.className = 'row-number';
            tdNum.textContent = rIdx + 1;
            tr.appendChild(tdNum);

            // Data Cols
            db.columns.forEach((col) => {
                const td = document.createElement('td');
                const inp = document.createElement('input');
                inp.type = col.includes('Date') ? 'date' : (col === 'Quantity' || col === 'Rate' || col.includes('Amount') || col === 'Exchange Rate') ? 'number' : 'text';
                
                // Allow floating point for numbers
                if (inp.type === 'number') inp.step = "any";

                // Safe attribute name for ID routing
                const safeCol = col.replace(/[^a-zA-Z0-9]/g, '');
                
                // Connect datalist
                if (col === 'Price List') {
                    // special datalist from Ratio Mixer
                    inp.setAttribute('list', 'list-PriceList');
                } else if (inp.type === 'text') {
                    inp.setAttribute('list', 'list-' + safeCol);
                }

                inp.value = rowObj[col] || '';
                inp.dataset.row = rIdx;
                inp.dataset.col = col;
                
                // Save logic
                inp.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (!db.rows[rIdx]) db.rows[rIdx] = {};
                    db.rows[rIdx][col] = val;
                    
                    // Auto calculate amount if Rate/Quantity
                    if (['Rate', 'Quantity'].includes(col)) {
                        const qty = parseFloat(db.rows[rIdx]['Quantity']) || 0;
                        const rate = parseFloat(db.rows[rIdx]['Rate']) || 0;
                        if (qty && rate) {
                            db.rows[rIdx]['Amount'] = (qty * rate).toFixed(2);
                            // sync UI
                            const amtInput = tr.querySelector(`input[data-col="Amount"]`);
                            if (amtInput) amtInput.value = db.rows[rIdx]['Amount'];
                        }
                    }

                    // Auto base amount if Amount/ExRate
                    if (['Amount', 'Exchange Rate'].includes(col) || ['Rate', 'Quantity'].includes(col)) {
                        const amt = parseFloat(db.rows[rIdx]['Amount']) || 0;
                        const ex = parseFloat(db.rows[rIdx]['Exchange Rate']) || 1;
                        if (amt) {
                            db.rows[rIdx]['Base Amount'] = (amt / ex).toFixed(2);
                            const baseAmtInput = tr.querySelector(`input[data-col="Base Amount"]`);
                            if (baseAmtInput) baseAmtInput.value = db.rows[rIdx]['Base Amount'];
                        }
                    }

                    saveDB();
                });

                // Update datalists ONLY when cell focus is lost/changed.
                // If we do this on every keystroke, we accidentally destroy 
                // the browser's native dropdown popup while the user is typing!
                inp.addEventListener('change', () => {
                    updateDataLists();
                });

                // Double clicking should ideally pop open the native datalist
                inp.addEventListener('dblclick', (e) => {
                    if (e.target.value === '') {
                        e.target.value = ' '; // tiny hack to prod datalist
                        e.target.value = '';
                    }
                });

                // Wrap in a div to support fill handles
                const wrapper = document.createElement('div');
                wrapper.className = 'cell-wrapper';
                wrapper.appendChild(inp);

                // Add Drag Fill Handle
                const handle = document.createElement('div');
                handle.className = 'fill-handle';
                handle.dataset.col = col;
                handle.dataset.row = rIdx;
                wrapper.appendChild(handle);
                
                td.appendChild(wrapper);
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });

        updateDataLists();
    }

    function updateDataLists() {
        datalistContainer.innerHTML = '';
        
        db.columns.forEach(col => {
            // Price List is handled separately
            if (col === 'Price List') return;

            const safeCol = col.replace(/[^a-zA-Z0-9]/g, '');
            const datalist = document.createElement('datalist');
            datalist.id = 'list-' + safeCol;
            
            // Gather unique values
            const uniqueVals = new Set();
            db.rows.forEach(r => {
                if (r[col] && typeof r[col] === 'string' && r[col].trim() !== '') {
                    uniqueVals.add(r[col].trim());
                }
            });

            Array.from(uniqueVals).sort().forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                datalist.appendChild(opt);
            });

            datalistContainer.appendChild(datalist);
        });

        // Price List unique datalist
        const plList = document.getElementById('list-PriceList');
        if (plList) {
            plList.innerHTML = '';
            availablePriceLists.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl;
                plList.appendChild(opt);
            });
        }
    }

    function saveDB() {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        showStatus('Saved.', 'text-green-600');
    }

    let statusTimeout;
    function showStatus(text, colorClass = 'text-slate-500') {
        statusText.textContent = text;
        statusText.className = colorClass;
        clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
            statusText.textContent = 'Ready.';
            statusText.className = 'text-slate-500';
        }, 3000);
    }

    document.getElementById('addColBtn').addEventListener('click', () => {
        const newCol = prompt("Enter new column name:");
        if (newCol && newCol.trim()) {
            db.columns.push(newCol.trim());
            saveDB();
            renderTable();
        }
    });

    document.getElementById('addRowBtn').addEventListener('click', () => {
        db.rows.push(...Array(10).fill({}));
        saveDB();
        renderTable();
        setTimeout(() => {
            document.querySelector('.spreadsheet-container').scrollTop = document.querySelector('.spreadsheet-container').scrollHeight;
        }, 100);
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        // filter out completely empty rows
        const validRows = db.rows.filter(r => Object.keys(r).length > 0 && Object.values(r).some(v => v));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Headers
        csvContent += db.columns.join(',') + "\n";
        
        // Rows
        validRows.forEach(row => {
            let rowArray = db.columns.map(col => {
                let cellData = row[col] || '';
                // basic escaping 
                return `"${String(cellData).replace(/"/g, '""')}"`;
            });
            csvContent += rowArray.join(',') + "\n";
        });

        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "InstaQuote_Orders.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Initial render
    renderTable();

    // --- CELL TRACKING STATE ---
    let isSelectingCells = false;
    let selectionStart = null; 
    let selectionEnd = null;

    function clearSelection() {
        document.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
    }

    function renderSelection() {
        clearSelection();
        if (!selectionStart || !selectionEnd) return;
        
        const minRow = Math.min(selectionStart.row, selectionEnd.row);
        const maxRow = Math.max(selectionStart.row, selectionEnd.row);
        const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
        const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const colName = db.columns[c];
                const inp = tableBody.querySelector(`input[data-row="${r}"][data-col="${colName}"]`);
                if (inp) inp.classList.add('selected-cell');
            }
        }
    }

    function isMultiCell() {
        if (!selectionStart || !selectionEnd) return false;
        return (selectionStart.row !== selectionEnd.row) || (selectionStart.colIndex !== selectionEnd.colIndex);
    }

    // --- SPREADSHEET SHORTCUTS & FEATURES ---
    
    // Support fill down (Ctrl + D), Copy/Paste TSV (Ctrl+C / Ctrl+V overlap), and Multi-Delete
    tableBody.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target.tagName !== 'INPUT') return;

        // MULTI-DELETE
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (isMultiCell()) {
                e.preventDefault();
                const minRow = Math.min(selectionStart.row, selectionEnd.row);
                const maxRow = Math.max(selectionStart.row, selectionEnd.row);
                const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
                const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);
                
                for (let r = minRow; r <= maxRow; r++) {
                    if (!db.rows[r]) continue;
                    for (let c = minCol; c <= maxCol; c++) {
                        const colName = db.columns[c];
                        db.rows[r][colName] = '';
                        const inp = tableBody.querySelector(`input[data-row="${r}"][data-col="${colName}"]`);
                        if (inp) {
                            inp.value = '';
                            inp.dispatchEvent(new Event('input', { bubbles: true })); 
                        }
                    }
                }
                saveDB();
                return;
            }
        }

        // CTRL+C (MULTI-COPY TSV)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            if (isMultiCell()) {
                e.preventDefault();
                const minRow = Math.min(selectionStart.row, selectionEnd.row);
                const maxRow = Math.max(selectionStart.row, selectionEnd.row);
                const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
                const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);
                
                let tsv = [];
                for (let r = minRow; r <= maxRow; r++) {
                    let rowData = [];
                    for (let c = minCol; c <= maxCol; c++) {
                        const colName = db.columns[c];
                        const val = db.rows[r] ? (db.rows[r][colName] || '') : '';
                        rowData.push(val);
                    }
                    tsv.push(rowData.join('\t'));
                }
                navigator.clipboard.writeText(tsv.join('\n'));
                showStatus(`Copied ${tsv.length} rows to clipboard!`, 'text-green-600');
                return;
            }
        }

        // Ctrl + D (Fill Down)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const rIdx = parseInt(target.dataset.row);
            const col = target.dataset.col;
            if (rIdx > 0) {
                target.value = db.rows[rIdx - 1][col] || '';
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        
        // Navigation with Arrow Keys
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusCell(parseInt(target.dataset.row) - 1, target.dataset.col);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            focusCell(parseInt(target.dataset.row) + 1, target.dataset.col);
        }
    });

    tableBody.addEventListener('paste', (e) => {
        const target = e.target;
        if (target.tagName !== 'INPUT') return;
        
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        
        // Let standard copy/paste happen if no tabs or newlines
        if (!pasteData.includes('\t') && !pasteData.includes('\n')) return;
        
        e.preventDefault();
        
        const rows = pasteData.split(/\r?\n/).filter(r => r.length > 0);
        
        // Find anchor
        let startRowIdx = parseInt(target.dataset.row);
        let startColIdx = db.columns.indexOf(target.dataset.col);
        
        if (selectionStart && selectionEnd) {
            startRowIdx = Math.min(selectionStart.row, selectionEnd.row);
            startColIdx = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
        }
        
        if (startColIdx === -1) return;

        rows.forEach((rowStr, i) => {
            const rIdx = startRowIdx + i;
            if (!db.rows[rIdx]) db.rows.push({});
            
            const cells = rowStr.split('\t');
            cells.forEach((cellVal, j) => {
                const cIdx = startColIdx + j;
                if (cIdx < db.columns.length) {
                    const col = db.columns[cIdx];
                    db.rows[rIdx][col] = cellVal;
                    
                    const input = tableBody.querySelector(`input[data-row="${rIdx}"][data-col="${col}"]`);
                    if (input) {
                        input.value = cellVal;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        });
        saveDB();
    });

    // Helper to focus
    function focusCell(rIdx, colName) {
        const nextInput = tableBody.querySelector(`input[data-row="${rIdx}"][data-col="${colName}"]`);
        if (nextInput) nextInput.focus();
    }

    // --- DRAG TO FILL ---
    let isDraggingFill = false;
    let dragSourceValue = "";
    let dragSourceCol = null;

    tableBody.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('fill-handle')) {
            isDraggingFill = true;
            dragSourceCol = e.target.dataset.col;
            const dragSourceRow = parseInt(e.target.dataset.row);
            
            const sourceInput = tableBody.querySelector(`input[data-row="${dragSourceRow}"][data-col="${dragSourceCol}"]`);
            dragSourceValue = sourceInput ? sourceInput.value : "";
            e.preventDefault(); // Prevent text selection
            return;
        }

        // MULTI-CELL HIGHLIGHT SELECTION START
        if (e.target.tagName === 'INPUT') {
            const rIdx = parseInt(e.target.dataset.row);
            const colName = e.target.dataset.col;
            const cIdx = db.columns.indexOf(colName);
            
            if (e.shiftKey && selectionStart) {
                // Shift-click range selection
                selectionEnd = { row: rIdx, colIndex: cIdx };
                renderSelection();
                e.preventDefault(); 
            } else {
                // Start a new selection sequence
                clearSelection();
                selectionStart = { row: rIdx, colIndex: cIdx };
                selectionEnd = { row: rIdx, colIndex: cIdx };
                isSelectingCells = true;
                e.target.classList.add('selected-cell');
            }
        }
    });

    tableBody.addEventListener('mouseover', (e) => {
        // Handle Cell Highlighting Drag
        if (isSelectingCells && e.target.tagName === 'INPUT') {
            const rIdx = parseInt(e.target.dataset.row);
            const colName = e.target.dataset.col;
            const cIdx = db.columns.indexOf(colName);
            
            if (selectionEnd.row !== rIdx || selectionEnd.colIndex !== cIdx) {
                selectionEnd = { row: rIdx, colIndex: cIdx };
                renderSelection();
            }
        }

        // Handle Auto-Fill Drag
        if (isDraggingFill) {
            const target = e.target;
            if (target.tagName === 'INPUT' && target.dataset.col === dragSourceCol) {
                if (target.value !== dragSourceValue) {
                    target.value = dragSourceValue;
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else if (target.classList.contains('cell-wrapper') || target.tagName === 'TD') {
                 // Try to locate inner input if hovered near boundaries
                 const internalInput = target.querySelector('input');
                 if (internalInput && internalInput.dataset.col === dragSourceCol) {
                     if (internalInput.value !== dragSourceValue) {
                         internalInput.value = dragSourceValue;
                         internalInput.dispatchEvent(new Event('input', { bubbles: true }));
                     }
                 }
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingFill) {
            isDraggingFill = false;
            saveDB();
        }
        if (isSelectingCells) {
            isSelectingCells = false;
        }
    });

});
