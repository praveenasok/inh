        // Global State
        let rawData = [];
        let currentSort = { column: 'name', dir: 'asc' };
        let db = null;
        
        // Wait for Firebase
        document.addEventListener('DOMContentLoaded', async () => {
            // Wait for Firebase to initialize
            for(let i=0; i<50; i++){
                if(window.firebase && firebase.firestore) break;
                await new Promise(r => setTimeout(r, 100));
            }
            if(!window.firebase || !firebase.firestore){
                alert("Failed to load Firebase.");
                return;
            }
            
            db = firebase.firestore();
            fetchData();
            
            // Search Input listener
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', (e) => {
                const clearBtn = document.getElementById('clearSearch');
                if(e.target.value.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }
                filterTable();
            });
        });

        function toggleAdminPanel() {
            const panel = document.getElementById('adminPanel');
            panel.classList.toggle('hidden');
        }

        // Fetch Data from Firestore
        async function fetchData() {
            try {
                const snapshot = await db.collection('quick_price_list').get();
                rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Sort by name initially
                rawData.sort((a, b) => (a.name||'').localeCompare(b.name||''));
                
                renderTable(rawData);
            } catch(e) {
                console.error("Error fetching data:", e);
                document.getElementById('priceTableBody').innerHTML = `
                    <tr><td colspan="6" class="p-8 text-center text-red-500">Error loading data. ${e.message}</td></tr>
                `;
            }
        }

        // Render Table
        function renderTable(dataToRender) {
            const tbody = document.getElementById('priceTableBody');
            const noResults = document.getElementById('noResults');
            
            if(dataToRender.length === 0) {
                tbody.innerHTML = '';
                noResults.classList.remove('hidden');
                return;
            }
            
            noResults.classList.add('hidden');
            
            let html = '';
            dataToRender.forEach(item => {
                // Ensure values exist
                const rate = parseFloat(item.rate) || 0;
                
                html += `
                    <tr class="table-row-hover bg-white" id="row-${item.id}">
                        <td class="p-4 font-medium text-slate-800">${escapeHtml(item.name || '')}</td>
                        <td class="p-4 text-slate-500">${escapeHtml(item.type || '')}</td>
                        <td class="p-4 text-right font-medium" id="rate-${item.id}" data-rate="${rate}">₹${rate.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td class="p-4 text-slate-500">${escapeHtml(item.unit || '')}</td>
                        <td class="p-4 text-center">
                            <input type="number" min="0" max="100" class="discount-input" placeholder="0" 
                                   oninput="calculateRowPrice('${item.id}')" id="discount-${item.id}">
                        </td>
                        <td class="p-4 text-right bg-green-50/20">
                            <span class="final-price" id="final-${item.id}">₹${rate.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        // Calculate Final Price dynamically
        function calculateRowPrice(id) {
            const rateStr = document.getElementById('rate-' + id).getAttribute('data-rate');
            const rate = parseFloat(rateStr);
            const discountInput = document.getElementById('discount-' + id).value;
            const discount = parseFloat(discountInput) || 0;
            
            const finalPriceEl = document.getElementById('final-' + id);
            
            if(discount > 0) {
                const finalRate = rate - (rate * (discount / 100));
                finalPriceEl.innerHTML = '₹' + finalRate.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
                finalPriceEl.classList.add('discount-applied');
                
                // Remove animation class after it plays to allow replay
                setTimeout(() => {
                    finalPriceEl.classList.remove('discount-applied');
                    finalPriceEl.style.color = '#ef4444'; // Keep it red to indicate discount
                }, 500);
            } else {
                finalPriceEl.innerHTML = '₹' + rate.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
                finalPriceEl.style.color = ''; // Reset to default green
            }
        }

        // Filtering
        function filterTable() {
            const query = document.getElementById('searchInput').value.toLowerCase().trim();
            if(!query) {
                renderTable(rawData);
                return;
            }
            
            // Multi-term search (like "innomax highlight")
            const terms = query.split(' ');
            
            const filtered = rawData.filter(item => {
                const searchable = ((item.name || '') + ' ' + (item.type || '')).toLowerCase();
                return terms.every(term => searchable.includes(term));
            });
            
            renderTable(filtered);
        }

        // Sorting
        function sortTable(column) {
            if (currentSort.column === column) {
                currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.dir = 'asc';
            }
            
            const sorted = [...rawData].sort((a, b) => {
                let valA = a[column];
                let valB = b[column];
                
                if (column === 'rate') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                    return currentSort.dir === 'asc' ? valA - valB : valB - valA;
                } else {
                    valA = (valA || '').toString().toLowerCase();
                    valB = (valB || '').toString().toLowerCase();
                    return currentSort.dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
            });
            
            // If there's an active filter, re-apply it after sorting
            const query = document.getElementById('searchInput').value;
            if(query) {
                rawData = sorted; // Keep the sorted state in rawData
                filterTable();
            } else {
                rawData = sorted;
                renderTable(rawData);
            }
        }

        // --- Admin Functions ---

        async function handleExcelImport() {
            const fileInput = document.getElementById('excelFile');
            const file = fileInput.files[0];
            if (!file) {
                alert("Please select a file first.");
                return;
            }

            const btn = document.getElementById('importBtn');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            btn.disabled = true;

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON array of objects
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                
                if(json.length === 0) {
                    throw new Error("The Excel file is empty.");
                }

                // Delete old data (batch limits to 500, we'll do simple loops for now)
                const snapshot = await db.collection('quick_price_list').get();
                const batch = db.batch();
                
                let deleteCount = 0;
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                    deleteCount++;
                    if(deleteCount === 490) {
                        console.warn("Approaching batch limit for deletes, proceeding anyway...");
                    }
                });
                
                if (deleteCount > 0) {
                    await batch.commit();
                }

                // Add new data
                const addBatch = db.batch();
                let addedCount = 0;
                for (const row of json) {
                    // Try to map common column names
                    const name = row['Product Name'] || row['Name'] || row['Product'] || row['PRODUCT'] || '';
                    const type = row['Product Type'] || row['Type'] || row['TYPE'] || '';
                    const rate = row['Rate'] || row['Rate per unit'] || row['Price'] || row['RATE'] || 0;
                    const unit = row['Unit'] || row['UNIT'] || 'Kg';

                    if(!name && !type) continue; // Skip empty rows

                    const newRef = db.collection('quick_price_list').doc();
                    addBatch.set(newRef, {
                        name: name.toString(),
                        type: type.toString(),
                        rate: parseFloat(rate) || 0,
                        unit: unit.toString(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    addedCount++;
                    
                    if(addedCount >= 490) {
                        await addBatch.commit();
                        break; // Simple implementation limit
                    }
                }
                
                if (addedCount > 0 && addedCount < 490) {
                    await addBatch.commit();
                }

                alert(`Successfully imported ${addedCount} products!`);
                fileInput.value = '';
                await fetchData(); // Refresh table

            } catch (error) {
                console.error(error);
                alert("Error importing file: " + error.message);
            } finally {
                btn.innerHTML = 'Upload';
                btn.disabled = false;
            }
        }

        async function addManualItem() {
            const name = document.getElementById('addName').value.trim();
            const type = document.getElementById('addType').value.trim();
            const rate = parseFloat(document.getElementById('addRate').value) || 0;
            const unit = document.getElementById('addUnit').value.trim() || 'Kg';

            if(!name) {
                alert("Product Name is required.");
                return;
            }

            try {
                await db.collection('quick_price_list').add({
                    name, type, rate, unit,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                document.getElementById('addName').value = '';
                document.getElementById('addType').value = '';
                document.getElementById('addRate').value = '';
                
                fetchData(); // Refresh table
                
            } catch(e) {
                alert("Error adding item: " + e.message);
            }
        }

        async function clearAllData() {
            if(confirm("Are you SURE you want to delete all price list data? This cannot be undone.")) {
                try {
                    const snapshot = await db.collection('quick_price_list').get();
                    const batch = db.batch();
                    snapshot.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    alert("Database cleared.");
                    fetchData();
                } catch(e) {
                    alert("Error clearing data: " + e.message);
                }
            }
        }

        // --- OCR Functions ---

        let ocrParsedData = [];

        async function handleImageOCR() {
            const fileInput = document.getElementById('imageFile');
            const file = fileInput.files[0];
            if (!file) {
                alert("Please select an image file first.");
                return;
            }

            // Show progress overlay
            const overlay = document.getElementById('ocrProgressOverlay');
            const statusText = document.getElementById('ocrStatusText');
            const progressBar = document.getElementById('ocrProgressBar');
            overlay.classList.remove('hidden');
            
            try {
                // Initialize Tesseract
                const worker = await Tesseract.createWorker({
                    logger: m => {
                        if(m.status === 'recognizing text') {
                            const pct = Math.round(m.progress * 100);
                            statusText.innerText = `Scanning... ${pct}%`;
                            progressBar.style.width = `${pct}%`;
                        } else {
                            statusText.innerText = m.status;
                        }
                    }
                });
                
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                
                const { data: { text } } = await worker.recognize(file);
                await worker.terminate();

                parseOcrText(text);
                
            } catch (error) {
                console.error(error);
                alert("Error during OCR: " + error.message);
            } finally {
                overlay.classList.add('hidden');
                fileInput.value = '';
            }
        }

        function parseOcrText(rawText) {
            ocrParsedData = [];
            const lines = rawText.split('\n');
            
            // Basic heuristic: look for lines ending with a number (or a number near the end)
            // Example: "Highlight 18 inch 175" or "Bone Straight 22 450"
            for(let line of lines) {
                line = line.trim();
                if(!line) continue;

                // Match ending number (with optional currency symbols or decimals)
                // e.g. "Product Name 123.45"
                const match = line.match(/^(.*?)\s+[\$₹£€]?\s*([\d,]+(?:\.\d+)?)\s*$/);
                
                if(match && match[1].trim().length > 2) {
                    const name = match[1].trim().replace(/[^a-zA-Z0-9\s\.\-]/g, ''); // Clean basic weird chars
                    const rateStr = match[2].replace(/,/g, '');
                    const rate = parseFloat(rateStr);
                    
                    if(name && !isNaN(rate)) {
                        ocrParsedData.push({
                            name: name,
                            rate: rate,
                            id: 'ocr_' + Math.random().toString(36).substr(2, 9)
                        });
                    }
                }
            }
            
            if(ocrParsedData.length === 0) {
                alert("Could not automatically detect any prices in this image. The image might be too blurry or the format is not 'Product Name [Space] Price'.");
                return;
            }
            
            renderOcrPreview();
            document.getElementById('ocrPreviewModal').classList.remove('hidden');
        }

        function renderOcrPreview() {
            const tbody = document.getElementById('ocrPreviewBody');
            let html = '';
            ocrParsedData.forEach((item, index) => {
                html += `
                    <tr id="ocr-row-${item.id}" class="hover:bg-slate-50 transition-colors">
                        <td class="p-2 border border-slate-200">
                            <input type="text" class="w-full border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1" 
                                   value="${escapeHtml(item.name)}" 
                                   onchange="updateOcrItem('${item.id}', 'name', this.value)">
                        </td>
                        <td class="p-2 border border-slate-200">
                            <input type="number" class="w-full border-0 bg-transparent focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1" 
                                   value="${item.rate}" 
                                   onchange="updateOcrItem('${item.id}', 'rate', this.value)">
                        </td>
                        <td class="p-2 border border-slate-200 text-center">
                            <button onclick="removeOcrRow('${item.id}')" class="text-slate-400 hover:text-red-500">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        function updateOcrItem(id, field, value) {
            const item = ocrParsedData.find(i => i.id === id);
            if(item) {
                item[field] = field === 'rate' ? (parseFloat(value) || 0) : value;
            }
        }

        function removeOcrRow(id) {
            ocrParsedData = ocrParsedData.filter(i => i.id !== id);
            renderOcrPreview();
            if(ocrParsedData.length === 0) {
                closeOcrPreview();
            }
        }

        function closeOcrPreview() {
            document.getElementById('ocrPreviewModal').classList.add('hidden');
            ocrParsedData = [];
        }

        async function saveOcrData() {
            const btn = document.querySelector('#ocrPreviewModal .btn-primary');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            try {
                const addBatch = db.batch();
                let addedCount = 0;
                
                for (const item of ocrParsedData) {
                    if(!item.name) continue;
                    
                    const newRef = db.collection('quick_price_list').doc();
                    addBatch.set(newRef, {
                        name: item.name.toString(),
                        type: 'Imported via OCR',
                        rate: parseFloat(item.rate) || 0,
                        unit: 'Kg',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    addedCount++;
                    
                    if(addedCount >= 490) {
                        await addBatch.commit();
                        break; 
                    }
                }
                
                if (addedCount > 0 && addedCount < 490) {
                    await addBatch.commit();
                }

                alert(`Successfully imported ${addedCount} products from the image!`);
                closeOcrPreview();
                await fetchData(); // Refresh table

            } catch(e) {
                console.error(e);
                alert("Error saving OCR data: " + e.message);
            } finally {
                btn.innerHTML = 'Save to Database';
                btn.disabled = false;
            }
        }

        // Utility
        function escapeHtml(unsafe) {
            return (unsafe||'').toString()
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
