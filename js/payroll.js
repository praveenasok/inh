/**
 * Payroll Module Logic
 * Handles Employees, Salary, and Attendance pages.
 */

window.payrollApp = (function() {
    let currentEmployees = [];
    let currentDepartments = [];
    let currentAttendanceRecords = [];
    let currentAttendanceMonthYear = "";
    let currentHolidays = [];
    let currentLeavePlans = [];

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseContactNumbers(str) {
        if (!str) return { contact: '', emergency: '' };
        const parts = str.split(',');
        let contact = parts[0] ? parts[0].replace(/Emergency:/i, '').trim() : '';
        let emergency = '';
        if (parts[1]) {
            emergency = parts[1].replace(/Emergency:/i, '').trim();
        } else {
            const match = str.match(/Emergency:\s*([\d\+\-\s\(\)]+)/i);
            if (match) {
                emergency = match[1].trim();
                contact = str.replace(match[0], '').replace(/,\s*$/, '').trim();
            }
        }
        return { contact, emergency };
    }
    
    // Check if Firebase is ready
    function waitForFirebaseDB(callback) {
        if (window.firebaseDB && window.firebaseDB.isAvailable()) {
            callback();
        } else {
            // Check periodically
            let checks = 0;
            const interval = setInterval(() => {
                if (window.firebaseDB && window.firebaseDB.isAvailable()) {
                    clearInterval(interval);
                    callback();
                }
                if (checks++ > 20) { // 10 seconds max
                    clearInterval(interval);
                    console.error("FirebaseDB not available.");
                }
            }, 500);
        }
    }

    // --- Common Functions ---
    async function fetchEmployees() {
        try {
            currentEmployees = await window.firebaseDB.getEmployees();
            return currentEmployees;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    // --- Employee Details Page ---
    function initEmployeePage() {
        waitForFirebaseDB(() => {
            loadDepartments().then(() => {
                loadEmployees();
            });
        });
    }

    // Global helpers for dropdown UI behavior
    window.expandStatusOptions = function(select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value) {
                select.options[i].text = select.options[i].title;
            }
        }
    };
    
    window.collapseStatusOptions = function(select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value) {
                select.options[i].text = select.options[i].value;
            }
        }
    };

    window.updateRowSummary = function(empId) {
        const row = document.getElementById(`row-${empId}`);
        if (!row) return;
        
        const selects = row.querySelectorAll('select.status-badge');
        let countP = 0, countA = 0, countL = 0, countHD = 0;
        
        selects.forEach(s => {
            const val = s.value;
            if (val === 'P') countP++;
            else if (val === 'A') countA++;
            else if (val === 'L') countL++;
            else if (val === 'HD') countHD++;
        });
        
        const totalAbsences = countA + countL + (0.5 * countHD);
        const presentDays = countP + (0.5 * countHD);
        const paidLeaves = Math.min(totalAbsences, 1.5);
        const unpaidLeaves = Math.max(0, totalAbsences - 1.5);
        
        const pCell = row.querySelector('.summary-p');
        const aCell = row.querySelector('.summary-a');
        const plCell = row.querySelector('.summary-pl');
        const ulCell = row.querySelector('.summary-ul');
        
        if(pCell) pCell.innerText = presentDays;
        if(aCell) aCell.innerText = countA;
        if(plCell) plCell.innerText = paidLeaves;
        if(ulCell) ulCell.innerText = unpaidLeaves;

        // Update Mobile card elements if they exist in DOM
        const mP = document.getElementById(`m-summary-p-${empId}`);
        const mA = document.getElementById(`m-summary-a-${empId}`);
        const mPl = document.getElementById(`m-summary-pl-${empId}`);
        const mUl = document.getElementById(`m-summary-ul-${empId}`);
        
        if (mP) mP.innerText = presentDays;
        if (mA) mA.innerText = countA;
        if (mPl) mPl.innerText = paidLeaves;
        if (mUl) mUl.innerText = unpaidLeaves;
    };

    async function loadEmployees() {
        const tbody = document.getElementById('employeeTableBody');
        const mCards = document.getElementById('employeeMobileCards');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">Loading employees...</td></tr>';
        if (mCards) mCards.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">Loading employees...</div>';
        
        await fetchEmployees();
        
        populateEmployeeDeptFilter();
        renderFilteredEmployees();
    }

    function populateEmployeeDeptFilter() {
        const select = document.getElementById('employeeDeptFilter');
        if (!select) return;
        
        const currentVal = select.value;
        select.innerHTML = '<option value="">All Departments</option>';
        currentDepartments.forEach(dept => {
            select.innerHTML += `<option value="${escapeHTML(dept)}">${escapeHTML(dept)}</option>`;
        });
        select.value = currentVal;
    }

    function filterEmployees() {
        renderFilteredEmployees();
    }

    function renderFilteredEmployees() {
        const tbody = document.getElementById('employeeTableBody');
        const mCards = document.getElementById('employeeMobileCards');
        if (!tbody) return;
        
        const showInactive = document.getElementById('showInactiveToggle')?.checked || false;
        const searchQuery = document.getElementById('employeeSearchInput')?.value.toLowerCase().trim() || "";
        const deptFilter = document.getElementById('employeeDeptFilter')?.value || "";
        
        let filtered = showInactive ? currentEmployees : currentEmployees.filter(emp => emp.status !== 'Inactive');
        
        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(emp => {
                const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.shortName || ''}`.toLowerCase();
                const job = (emp.jobProfile || '').toLowerCase();
                const dept = (emp.department || '').toLowerCase();
                return name.includes(searchQuery) || job.includes(searchQuery) || dept.includes(searchQuery);
            });
        }
        
        // Filter by department
        if (deptFilter) {
            filtered = filtered.filter(emp => emp.department === deptFilter);
        }
        
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">No employees found matching criteria.</td></tr>`;
            if (mCards) mCards.innerHTML = `<div class="text-center text-sm text-gray-500 py-4">No employees found matching criteria.</div>`;
            return;
        }
        
        // Render Desktop Table
        tbody.innerHTML = filtered.map(emp => {
            let contact = emp.contactNumber || '';
            let emergency = emp.emergencyNumber || '';
            
            if (!contact && !emergency && emp.contactNumbers) {
                const parsed = parseContactNumbers(emp.contactNumbers);
                contact = parsed.contact;
                emergency = parsed.emergency;
            }
            
            let contactHTML = '';
            if (contact) {
                contactHTML += `<a href="tel:${escapeHTML(contact)}" class="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium" title="Call Contact"><i class="fas fa-phone-alt mr-1 text-[10px]"></i>${escapeHTML(contact)}</a>`;
            }
            if (emergency) {
                if (contactHTML) contactHTML += '<br>';
                contactHTML += `<a href="tel:${escapeHTML(emergency)}" class="inline-flex items-center text-red-600 hover:text-red-800 transition-colors font-medium mt-0.5" title="Call Emergency"><i class="fas fa-ambulance mr-1 text-[10px]"></i>${escapeHTML(emergency)}</a>`;
            }
            if (!contactHTML) {
                contactHTML = '<span class="text-gray-400 font-medium italic">No Contact</span>';
            }

            return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${emp.empId || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 mr-4">
                            ${emp.photoUrl ? `<img class="h-10 w-10 rounded-full object-cover object-top cursor-pointer hover:opacity-80" src="${emp.photoUrl}" alt="" onclick="window.openImagePreviewModal(this.src)">` : `<div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center"><i class="fas fa-user text-gray-400"></i></div>`}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-gray-900 flex items-center">
                                ${emp.shortName ? emp.shortName : (emp.firstName + ' ' + emp.lastName)}
                                ${emp.status === 'Inactive' ? `<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${emp.separationType === 'Long Leave' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-red-100 text-red-800 border border-red-200'}" title="End Date: ${emp.endDate || 'N/A'}\nDue Amount: ${emp.dueAmount || 0}">${emp.separationType || 'Inactive'}</span>` : ''}
                            </div>
                            <div class="text-xs text-gray-500">${emp.emailId || ''}</div>
                            ${(emp.holidayChoice1Date || emp.holidayChoice2Date) ? `
                                <div class="mt-1 flex flex-wrap gap-1 text-[10px]">
                                    ${emp.holidayChoice1Date ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200" title="${escapeHTML(emp.holidayChoice1Occasion || 'Holiday 1')}"><i class="fas fa-star mr-1 text-[9px]"></i>${escapeHTML(emp.holidayChoice1Date)}${emp.holidayChoice1Occasion ? ` (${escapeHTML(emp.holidayChoice1Occasion)})` : ''}</span>` : ''}
                                    ${emp.holidayChoice2Date ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200" title="${escapeHTML(emp.holidayChoice2Occasion || 'Holiday 2')}"><i class="fas fa-star mr-1 text-[9px]"></i>${escapeHTML(emp.holidayChoice2Date)}${emp.holidayChoice2Occasion ? ` (${escapeHTML(emp.holidayChoice2Occasion)})` : ''}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${contactHTML}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="font-medium text-gray-900">${escapeHTML(emp.jobProfile || '')}</div>
                    ${emp.department ? `<div class="text-xs text-gray-400 font-semibold mt-0.5">${escapeHTML(emp.department)}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.joiningDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.baseSalary}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="window.payrollApp.openFaceEnrollModal('${emp.id}')" class="text-blue-600 hover:text-blue-900 mr-3" title="Enroll Face"><i class="fas fa-camera"></i></button>
                    <button onclick="window.payrollApp.editEmployee('${emp.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3" title="Edit"><i class="fas fa-edit"></i></button>
                    ${emp.status !== 'Inactive' ? 
                        `<button onclick="window.payrollApp.toggleEmployeeStatus('${emp.id}', 'Inactive')" class="text-red-600 hover:text-red-900 mr-3" title="Deactivate"><i class="fas fa-user-times"></i></button>` : 
                        `<button onclick="window.payrollApp.toggleEmployeeStatus('${emp.id}', 'Active')" class="text-green-600 hover:text-green-900 mr-3" title="Activate"><i class="fas fa-user-check"></i></button>`
                    }
                </td>
            </tr>
            `;
        }).join('');

        // Render Mobile Cards
        if (mCards) {
            mCards.innerHTML = filtered.map(emp => {
                let contact = emp.contactNumber || '';
                let emergency = emp.emergencyNumber || '';
                
                if (!contact && !emergency && emp.contactNumbers) {
                    const parsed = parseContactNumbers(emp.contactNumbers);
                    contact = parsed.contact;
                    emergency = parsed.emergency;
                }
                
                return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                    <!-- Top Row: Photo, Name, ID, Edit -->
                    <div class="flex items-center gap-3">
                        <div class="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                            ${emp.photoUrl ? `<img class="h-12 w-12 object-cover object-top cursor-pointer hover:opacity-80" src="${emp.photoUrl}" alt="" onclick="window.openImagePreviewModal(this.src)">` : `<div class="h-12 w-12 bg-gray-100 flex items-center justify-center text-gray-400"><i class="fas fa-user"></i></div>`}
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-gray-900 truncate text-sm">${escapeHTML(emp.shortName ? emp.shortName : (emp.firstName + ' ' + emp.lastName))}</h4>
                                ${emp.status === 'Inactive' ? `<span class="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${emp.separationType === 'Long Leave' ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-red-100 text-red-800 border border-red-200'}">${escapeHTML(emp.separationType || 'Inactive')}</span>` : ''}
                            </div>
                            <p class="text-xs text-gray-400 font-bold mt-0.5">${escapeHTML(emp.empId || '')}</p>
                            ${(emp.holidayChoice1Date || emp.holidayChoice2Date) ? `
                                <div class="mt-1 flex flex-wrap gap-1 text-[9px]">
                                    ${emp.holidayChoice1Date ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200" title="${escapeHTML(emp.holidayChoice1Occasion || 'Holiday 1')}"><i class="fas fa-star mr-1"></i>${escapeHTML(emp.holidayChoice1Date)}${emp.holidayChoice1Occasion ? ` (${escapeHTML(emp.holidayChoice1Occasion)})` : ''}</span>` : ''}
                                    ${emp.holidayChoice2Date ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200" title="${escapeHTML(emp.holidayChoice2Occasion || 'Holiday 2')}"><i class="fas fa-star mr-1"></i>${escapeHTML(emp.holidayChoice2Date)}${emp.holidayChoice2Occasion ? ` (${escapeHTML(emp.holidayChoice2Occasion)})` : ''}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <button onclick="window.payrollApp.openFaceEnrollModal('${emp.id}')" class="text-blue-600 hover:text-blue-900 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center" title="Enroll Face">
                            <i class="fas fa-camera"></i>
                        </button>
                        <button onclick="window.payrollApp.editEmployee('${emp.id}')" class="text-indigo-600 hover:text-indigo-900 p-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${emp.status !== 'Inactive' ? 
                            `<button onclick="window.payrollApp.toggleEmployeeStatus('${emp.id}', 'Inactive')" class="text-red-600 hover:text-red-900 p-2.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center" title="Deactivate">
                                <i class="fas fa-user-times"></i>
                            </button>` : 
                            `<button onclick="window.payrollApp.toggleEmployeeStatus('${emp.id}', 'Active')" class="text-green-600 hover:text-green-900 p-2.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-center" title="Activate">
                                <i class="fas fa-user-check"></i>
                            </button>`
                        }
                    </div>
                    
                    <!-- Info Section: Profile & Department, Joining, Salary -->
                    <div class="grid grid-cols-2 gap-3 text-[11px] border-t border-b border-gray-50 py-2.5">
                        <div>
                            <span class="text-gray-400 block font-medium">Job Profile</span>
                            <span class="font-semibold text-gray-800 block">${escapeHTML(emp.jobProfile || 'N/A')}</span>
                            ${emp.department ? `<span class="text-xs text-gray-400 block font-medium mt-0.5">${escapeHTML(emp.department)}</span>` : ''}
                        </div>
                        <div>
                            <span class="text-gray-400 block font-medium">Salary & Joining</span>
                            <span class="font-semibold text-gray-800 block">₹${escapeHTML(String(emp.baseSalary || 0))}</span>
                            <span class="text-gray-400 block font-medium mt-0.5">${escapeHTML(emp.joiningDate || 'N/A')}</span>
                        </div>
                    </div>
                    
                    <!-- Bottom Row: Call Buttons -->
                    <div class="grid grid-cols-2 gap-2 mt-1">
                        ${contact ? `
                            <a href="tel:${escapeHTML(contact)}" class="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-semibold transition-colors border border-green-100">
                                <i class="fas fa-phone-alt"></i> Call
                            </a>
                        ` : `
                            <button disabled class="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 text-gray-400 rounded-lg text-xs font-semibold border border-gray-100 cursor-not-allowed">
                                <i class="fas fa-phone-slash"></i> No Number
                            </button>
                        `}
                        
                        ${emergency ? `
                            <a href="tel:${escapeHTML(emergency)}" class="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors border border-red-100">
                                <i class="fas fa-ambulance"></i> Emergency
                            </a>
                        ` : `
                            <button disabled class="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 text-gray-400 rounded-lg text-xs font-semibold border border-gray-100 cursor-not-allowed">
                                <i class="fas fa-ambulance"></i> No Emergency
                            </button>
                        `}
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    function toggleInactiveEmployees() {
        loadEmployees();
    }

    async function handleEmployeeSubmit(event) {
        event.preventDefault();
        const btn = document.getElementById('saveEmployeeBtn');
        btn.disabled = true;
        btn.innerText = 'Saving...';
        
        try {
            const id = document.getElementById('employeeId').value;
            // Handle Profile Picture upload
            const profileFile = document.getElementById('profilePicture')?.files[0] || document.getElementById('profilePictureCamera')?.files[0];
            let photoUrl = id ? (currentEmployees.find(e => e.id === id)?.photoUrl || '') : '';
            
            if (profileFile) {
                const progressDiv = document.getElementById('profilePicUploadProgress');
                if (progressDiv) progressDiv.classList.remove('hidden');
                
                const storage = firebase.storage();
                const storageRef = storage.ref(`profile_pictures/${Date.now()}_${profileFile.name}`);
                await storageRef.put(profileFile);
                photoUrl = await storageRef.getDownloadURL();
                
                if (progressDiv) progressDiv.classList.add('hidden');
            }

            // Handle ID Documents uploads if any
            const filesGallery = document.getElementById('idDocuments')?.files || [];
            const filesCamera = document.getElementById('idDocumentsCamera')?.files || [];
            const files = [...filesGallery, ...filesCamera];
            let documentUrls = [];
            
            if (files.length > 0) {
                const progressDiv = document.getElementById('uploadProgress');
                progressDiv.classList.remove('hidden');
                
                const storage = firebase.storage();
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const storageRef = storage.ref(`payroll_documents/${Date.now()}_${file.name}`);
                    await storageRef.put(file);
                    const url = await storageRef.getDownloadURL();
                    documentUrls.push({ name: file.name, url: url });
                }
                progressDiv.classList.add('hidden');
            }

            // Also keep existing documents if editing
            // Note: A more complex implementation would render existing docs and allow deleting them.
            // For now, we will just append new uploads if editing.

            // Handle UPI QR Code upload
            const upiQRFile = document.getElementById('upiQRCode')?.files[0] || document.getElementById('upiQRCodeCamera')?.files[0];
            let upiQRCodeUrl = id ? (currentEmployees.find(e => e.id === id)?.upiQRCodeUrl || '') : '';
            
            if (upiQRFile) {
                const progressDiv = document.getElementById('upiQRUploadProgress');
                if (progressDiv) progressDiv.classList.remove('hidden');
                
                const storage = firebase.storage();
                const storageRef = storage.ref(`upi_qrcodes/${Date.now()}_${upiQRFile.name}`);
                await storageRef.put(upiQRFile);
                upiQRCodeUrl = await storageRef.getDownloadURL();
                
                if (progressDiv) progressDiv.classList.add('hidden');
            }

            const contactNumber = document.getElementById('contactNumber').value.trim();
            const emergencyNumber = document.getElementById('emergencyNumber').value.trim();
            const contactNumbers = contactNumber + (emergencyNumber ? `, Emergency: ${emergencyNumber}` : '');

            const empData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                shortName: document.getElementById('shortName') ? document.getElementById('shortName').value : '',
                contactNumber: contactNumber,
                emergencyNumber: emergencyNumber,
                contactNumbers: contactNumbers,
                emailId: document.getElementById('emailId').value,
                spouseName: document.getElementById('spouseName').value,
                parentsNames: document.getElementById('parentsNames').value,
                permanentAddress: document.getElementById('permanentAddress').value,
                correspondenceAddress: document.getElementById('correspondenceAddress').value,
                jobProfile: document.getElementById('jobProfile').value,
                department: document.getElementById('department').value || '',
                joiningDate: document.getElementById('joiningDate').value,
                baseSalary: parseFloat(document.getElementById('baseSalary').value) || 0,
                status: document.getElementById('status').value,
                separationType: document.getElementById('separationType').value || '',
                endDate: document.getElementById('endDate').value || '',
                dueAmount: parseFloat(document.getElementById('dueAmount').value) || 0,
                bankAccountName: document.getElementById('bankAccountName').value.trim(),
                bankAccountNumber: document.getElementById('bankAccountNumber').value.trim(),
                bankName: document.getElementById('bankName').value.trim(),
                bankAddress: document.getElementById('bankAddress').value.trim(),
                bankIfscCode: document.getElementById('bankIfscCode').value.trim(),
                upiId: document.getElementById('upiId').value.trim(),
                upiQRCodeUrl: upiQRCodeUrl,
                holidayChoice1Date: document.getElementById('holidayChoice1Date').value || '',
                holidayChoice1Occasion: document.getElementById('holidayChoice1Occasion').value.trim() || '',
                holidayChoice2Date: document.getElementById('holidayChoice2Date').value || '',
                holidayChoice2Occasion: document.getElementById('holidayChoice2Occasion').value.trim() || '',
                photoUrl: photoUrl
            };

            // Only update documents if new ones are uploaded, otherwise keep existing
            if (documentUrls.length > 0) {
                // If editing, try to merge with existing
                if (id) {
                    const existingEmp = currentEmployees.find(e => e.id === id);
                    const existingDocs = existingEmp?.documents || [];
                    empData.documents = [...existingDocs, ...documentUrls];
                } else {
                    empData.documents = documentUrls;
                }
            }

            // Generate custom empId if new
            if (!id && empData.joiningDate) {
                const dateParts = empData.joiningDate.split('-'); // YYYY-MM-DD
                if (dateParts.length === 3) {
                    const dateStr = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`; // DDMMYYYY
                    const prefix = `INH-${dateStr}-`;
                    
                    // find max sequence
                    const similarEmps = currentEmployees.filter(e => e.empId && e.empId.startsWith(prefix));
                    let maxSeq = 0;
                    similarEmps.forEach(e => {
                        const seqStr = e.empId.replace(prefix, '');
                        const seq = parseInt(seqStr);
                        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                    });
                    
                    empData.empId = `${prefix}${maxSeq + 1}`;
                }
            }

            if (id) {
                await window.firebaseDB.updateEmployee(id, empData);
            } else {
                await window.firebaseDB.saveEmployee(empData);
            }
            
            closeEmployeeModal();
            loadEmployees();
            
        } catch (e) {
            console.error(e);
            alert("Error saving employee: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Employee';
        }
    }

    async function deleteEmployeeFromModal() {
        const id = document.getElementById('employeeId').value;
        if (!id) return;
        if (confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
            try {
                const db = window.firebaseDB.db || firebase.firestore();
                await db.collection('employees').doc(id).delete();
                closeEmployeeModal();
                loadEmployees();
            } catch (error) {
                console.error("Error deleting employee:", error);
                alert("Error deleting employee: " + error.message);
            }
        }
    }

    async function toggleEmployeeStatus(id, newStatus) {
        if (!id) return;
        const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
        if (confirm(`Are you sure you want to ${action} this employee?`)) {
            try {
                const db = window.firebaseDB.db || firebase.firestore();
                let updateData = { status: newStatus };
                if (newStatus === 'Inactive') {
                    updateData.separationType = 'No Information';
                    updateData.endDate = new Date().toISOString().split('T')[0];
                } else {
                    updateData.separationType = firebase.firestore.FieldValue.delete();
                    updateData.endDate = firebase.firestore.FieldValue.delete();
                    updateData.dueAmount = firebase.firestore.FieldValue.delete();
                }
                await db.collection('employees').doc(id).update(updateData);
                loadEmployees();
            } catch (error) {
                console.error(`Error ${action}ing employee:`, error);
                alert(`Error ${action}ing employee: ` + error.message);
            }
        }
    }

    function editEmployee(id) {
        const emp = currentEmployees.find(e => e.id === id);
        if (!emp) return;
        
        document.getElementById('employeeId').value = emp.id;
        document.getElementById('firstName').value = emp.firstName || '';
        document.getElementById('lastName').value = emp.lastName || '';
        if (document.getElementById('shortName')) document.getElementById('shortName').value = emp.shortName || '';
        
        let contact = emp.contactNumber || '';
        let emergency = emp.emergencyNumber || '';
        if (!contact && !emergency && emp.contactNumbers) {
            const parsed = parseContactNumbers(emp.contactNumbers);
            contact = parsed.contact;
            emergency = parsed.emergency;
        }
        document.getElementById('contactNumber').value = contact;
        document.getElementById('emergencyNumber').value = emergency;
        
        document.getElementById('emailId').value = emp.emailId || '';
        document.getElementById('spouseName').value = emp.spouseName || '';
        document.getElementById('parentsNames').value = emp.parentsNames || '';
        document.getElementById('permanentAddress').value = emp.permanentAddress || '';
        document.getElementById('correspondenceAddress').value = emp.correspondenceAddress || '';
        document.getElementById('jobProfile').value = emp.jobProfile || '';
        document.getElementById('department').value = emp.department || '';
        document.getElementById('joiningDate').value = emp.joiningDate || '';
        document.getElementById('baseSalary').value = emp.baseSalary || '';
        document.getElementById('status').value = emp.status || 'Active';
        
        // Populate and toggle separation section
        document.getElementById('separationType').value = emp.separationType || '';
        document.getElementById('endDate').value = emp.endDate || '';
        document.getElementById('dueAmount').value = (emp.dueAmount !== undefined && emp.dueAmount !== null) ? emp.dueAmount : '';
        if (typeof window.toggleSeparationSection === 'function') {
            window.toggleSeparationSection();
        }
        
        // Show existing documents
        const docsDiv = document.getElementById('existingDocuments');
        if (emp.documents && emp.documents.length > 0) {
            docsDiv.innerHTML = emp.documents.map(doc => {
                const isPdf = doc.url.toLowerCase().includes('.pdf');
                if (isPdf) {
                    return `
                    <a href="${doc.url}" target="_blank" class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 mb-2 mr-2">
                        <i class="fas fa-file-pdf mr-1"></i> ${doc.name}
                    </a>`;
                } else {
                    return `
                    <div class="relative group inline-block mr-2 mb-2">
                        <a href="${doc.url}" target="_blank" class="block w-24 h-24 border rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-50">
                            <img src="${doc.url}" alt="${doc.name}" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'flex items-center justify-center w-full h-full text-gray-400\\'><i class=\\'fas fa-file fa-2x\\'></i></div>'">
                        </a>
                        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] p-1 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            ${doc.name}
                        </div>
                    </div>`;
                }
            }).join('');
        } else {
            docsDiv.innerHTML = '';
        }
        
        // Show existing photo
        const photoDiv = document.getElementById('existingPhoto');
        if (emp.photoUrl) {
            photoDiv.innerHTML = `<img src="${emp.photoUrl}" alt="Profile" class="w-full h-full object-cover object-top" onerror="this.outerHTML='<div class=\\'flex items-center justify-center w-full h-full bg-gray-100 text-gray-400\\'><i class=\\'fas fa-user\\'></i></div>'">`;
        } else {
            photoDiv.innerHTML = `<div class="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400"><i class="fas fa-user"></i></div>`;
        }
        
        document.getElementById('bankAccountName').value = emp.bankAccountName || '';
        document.getElementById('bankAccountNumber').value = emp.bankAccountNumber || '';
        document.getElementById('bankName').value = emp.bankName || '';
        document.getElementById('bankAddress').value = emp.bankAddress || '';
        document.getElementById('bankIfscCode').value = emp.bankIfscCode || '';
        document.getElementById('upiId').value = emp.upiId || '';
        document.getElementById('holidayChoice1Date').value = emp.holidayChoice1Date || '';
        document.getElementById('holidayChoice1Occasion').value = emp.holidayChoice1Occasion || '';
        document.getElementById('holidayChoice2Date').value = emp.holidayChoice2Date || '';
        document.getElementById('holidayChoice2Occasion').value = emp.holidayChoice2Occasion || '';

        const upiQrDiv = document.getElementById('existingUPIQRCode');
        if (upiQrDiv) {
            if (emp.upiQRCodeUrl) {
                upiQrDiv.innerHTML = `
                <div class="relative group inline-block mr-2 mb-2">
                    <a href="${emp.upiQRCodeUrl}" target="_blank" class="block w-24 h-24 border rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-50">
                        <img src="${emp.upiQRCodeUrl}" alt="UPI QR" class="w-full h-full object-cover">
                    </a>
                </div>`;
            } else {
                upiQrDiv.innerHTML = '';
            }
        }

        document.getElementById('modalTitle').innerText = 'Edit Employee';
        const deleteBtn = document.getElementById('deleteEmployeeBtn');
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        loadEmployeeModalHolidays();
        document.getElementById('employeeModal').classList.remove('hidden');
    }

    function closeEmployeeModal() {
        document.getElementById('employeeForm').reset();
        document.getElementById('employeeId').value = '';
        document.getElementById('existingDocuments').innerHTML = '';
        document.getElementById('existingPhoto').innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400"><i class="fas fa-user"></i></div>';
        
        if (document.getElementById('idDocsName')) document.getElementById('idDocsName').innerText = '';
        if (document.getElementById('upiQRName')) document.getElementById('upiQRName').innerText = '';
        if (document.getElementById('profilePicName')) document.getElementById('profilePicName').innerText = '';
        
        if (document.getElementById('bankAccountName')) document.getElementById('bankAccountName').value = '';
        if (document.getElementById('bankAccountNumber')) document.getElementById('bankAccountNumber').value = '';
        if (document.getElementById('bankName')) document.getElementById('bankName').value = '';
        if (document.getElementById('bankAddress')) document.getElementById('bankAddress').value = '';
        if (document.getElementById('bankIfscCode')) document.getElementById('bankIfscCode').value = '';
        if (document.getElementById('upiId')) document.getElementById('upiId').value = '';
        if (document.getElementById('holidayChoice1Date')) document.getElementById('holidayChoice1Date').value = '';
        if (document.getElementById('holidayChoice1Occasion')) document.getElementById('holidayChoice1Occasion').value = '';
        if (document.getElementById('holidayChoice2Date')) document.getElementById('holidayChoice2Date').value = '';
        if (document.getElementById('holidayChoice2Occasion')) document.getElementById('holidayChoice2Occasion').value = '';
        const upiQrDiv = document.getElementById('existingUPIQRCode');
        if (upiQrDiv) upiQrDiv.innerHTML = '';
        
        document.getElementById('modalTitle').innerText = 'Add New Employee';
        document.getElementById('employeeModal').classList.add('hidden');
        if (document.getElementById('department')) {
            document.getElementById('department').value = '';
        }
        if (document.getElementById('separationSection')) {
            document.getElementById('separationSection').classList.add('hidden');
        }
    }

    // --- Department management functions ---
    async function loadDepartments() {
        try {
            currentDepartments = await window.firebaseDB.getDepartments();
            currentDepartments.sort((a, b) => a.localeCompare(b));
            
            const select = document.getElementById('department');
            if (select) {
                const currentVal = select.value;
                select.innerHTML = '<option value="">Select Department</option>';
                currentDepartments.forEach(dept => {
                    select.innerHTML += `<option value="${escapeHTML(dept)}">${escapeHTML(dept)}</option>`;
                });
                select.value = currentVal;
            }
        } catch (e) {
            console.error("Failed to load departments:", e);
        }
    }

    async function openManageDepartmentsModal() {
        await loadDepartments();
        renderManageDepartmentsList();
        const modal = document.getElementById('departmentModal');
        if (modal) modal.classList.remove('hidden');
    }

    function closeManageDepartmentsModal() {
        const modal = document.getElementById('departmentModal');
        if (modal) modal.classList.add('hidden');
        hideDeptError();
        const input = document.getElementById('newDepartmentName');
        if (input) input.value = '';
    }

    async function addDepartment() {
        const input = document.getElementById('newDepartmentName');
        if (!input) return;
        
        const newName = input.value.trim();
        if (!newName) {
            showDeptError("Department name cannot be empty.");
            return;
        }
        
        if (currentDepartments.some(d => d.toLowerCase() === newName.toLowerCase())) {
            showDeptError("A department with this name already exists.");
            return;
        }
        
        hideDeptError();
        
        try {
            currentDepartments.push(newName);
            await window.firebaseDB.saveDepartments(currentDepartments);
            
            input.value = '';
            
            await loadDepartments();
            renderManageDepartmentsList();
            
            const select = document.getElementById('department');
            if (select) {
                select.value = newName;
            }
        } catch (e) {
            console.error("Error adding department:", e);
            showDeptError("Error saving: " + e.message);
        }
    }

    function renderManageDepartmentsList() {
        const listContainer = document.getElementById('manageDepartmentsList');
        if (!listContainer) return;
        
        if (currentDepartments.length === 0) {
            listContainer.innerHTML = '<div class="text-sm text-gray-500 py-4 text-center">No departments added yet.</div>';
            return;
        }
        
        listContainer.innerHTML = currentDepartments.map((dept, index) => `
            <div class="flex items-center gap-2 py-2.5">
                <input type="text" value="${escapeHTML(dept)}" 
                    class="flex-grow rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-1.5 border text-sm bg-white" 
                    id="dept-input-${index}" 
                    data-oldval="${escapeHTML(dept)}"
                    onkeydown="if(event.key === 'Enter') this.blur();"
                    onblur="window.payrollApp.saveDepartmentName(${index})">
                <button onclick="window.payrollApp.deleteDepartment(${index})" class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete Department">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
    }

    async function saveDepartmentName(index) {
        const input = document.getElementById(`dept-input-${index}`);
        if (!input) return;
        
        const oldName = input.getAttribute('data-oldval');
        const newName = input.value.trim();
        
        if (!newName) {
            alert("Department name cannot be empty.");
            input.value = oldName;
            return;
        }
        
        if (oldName === newName) return;
        
        if (currentDepartments.some((d, idx) => d.toLowerCase() === newName.toLowerCase() && idx !== index)) {
            alert("A department with this name already exists.");
            input.value = oldName;
            return;
        }
        
        try {
            currentDepartments[index] = newName;
            await window.firebaseDB.saveDepartments(currentDepartments);
            input.setAttribute('data-oldval', newName);
            
            let updateCount = 0;
            const matchingEmployees = currentEmployees.filter(emp => emp.department === oldName);
            
            if (matchingEmployees.length > 0) {
                const db = window.firebaseDB.db || firebase.firestore();
                const batch = db.batch();
                
                matchingEmployees.forEach(emp => {
                    const docRef = db.collection('employees').doc(emp.id);
                    batch.update(docRef, { 
                        department: newName,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    emp.department = newName;
                });
                
                await batch.commit();
                updateCount = matchingEmployees.length;
            }
            
            await loadDepartments();
            renderManageDepartmentsList();
            loadEmployees();
            
            console.log(`Department updated from "${oldName}" to "${newName}". Updated ${updateCount} employee(s).`);
        } catch (e) {
            console.error("Error updating department name:", e);
            alert("Error updating department: " + e.message);
            input.value = oldName;
        }
    }

    async function deleteDepartment(index) {
        const nameToDelete = currentDepartments[index];
        if (!confirm(`Are you sure you want to delete the department "${nameToDelete}"? This will clear this department from all assigned employees.`)) {
            return;
        }
        
        try {
            currentDepartments.splice(index, 1);
            await window.firebaseDB.saveDepartments(currentDepartments);
            
            let updateCount = 0;
            const matchingEmployees = currentEmployees.filter(emp => emp.department === nameToDelete);
            
            if (matchingEmployees.length > 0) {
                const db = window.firebaseDB.db || firebase.firestore();
                const batch = db.batch();
                
                matchingEmployees.forEach(emp => {
                    const docRef = db.collection('employees').doc(emp.id);
                    batch.update(docRef, { 
                        department: "",
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    emp.department = "";
                });
                
                await batch.commit();
                updateCount = matchingEmployees.length;
            }
            
            await loadDepartments();
            renderManageDepartmentsList();
            loadEmployees();
            
            console.log(`Department "${nameToDelete}" deleted. Cleared from ${updateCount} employee(s).`);
        } catch (e) {
            console.error("Error deleting department:", e);
            alert("Error deleting department: " + e.message);
        }
    }

    function showDeptError(msg) {
        const errDiv = document.getElementById('deptErrorMsg');
        if (errDiv) {
            errDiv.innerText = msg;
            errDiv.classList.remove('hidden');
        }
    }

    function hideDeptError() {
        const errDiv = document.getElementById('deptErrorMsg');
        if (errDiv) {
            errDiv.classList.add('hidden');
        }
    }

    window.copyAddress = function() {
        if (document.getElementById('sameAsPermanent').checked) {
            document.getElementById('correspondenceAddress').value = document.getElementById('permanentAddress').value;
        }
    };


    // --- Salary Page ---
    function initSalaryPage() {
        waitForFirebaseDB(() => {
            const today = new Date();
            const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('salaryMonth').value = monthStr;
            loadSalaryGrid();
        });
    }

    async function loadSalaryGrid() {
        const tbody = document.getElementById('salaryGridBody');
        const monthInput = document.getElementById('salaryMonth');
        if (!tbody || !monthInput) return;
        
        const monthStr = monthInput.value; // YYYY-MM
        if (!monthStr) return;
        
        tbody.innerHTML = '<tr><td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">Loading records...</td></tr>';
        
        try {
            // Fetch employees if not loaded
            if (currentEmployees.length === 0) {
                await fetchEmployees();
            }
            
            // Get salary records for this month
            const db = window.firebaseDB.db || firebase.firestore();
            const snapshot = await db.collection('salary_records').where('month', '==', monthStr).get();
            
            const salaryMap = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                salaryMap[data.employeeId] = data;
            });
            
            // Fetch attendance to calculate unpaid leaves
            const attendanceRecords = await window.firebaseDB.getAttendance(null, { month: monthStr });
            const attendanceMap = {};
            attendanceRecords.forEach(r => {
                if (!attendanceMap[r.employeeId]) attendanceMap[r.employeeId] = [];
                attendanceMap[r.employeeId].push(r);
            });
            
            const [year, month] = monthStr.split('-');
            const daysInMonth = new Date(year, parseInt(month), 0).getDate();
            
            const activeEmployees = currentEmployees.filter(e => e.status !== 'Inactive');
            
            if (activeEmployees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="px-6 py-4 text-center text-sm text-gray-500">No active employees found.</td></tr>';
                const mCards = document.getElementById('salaryMobileCards');
                if (mCards) mCards.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">No active employees found.</div>';
                return;
            }
            
            const rowsHTML = [];
            const cardsHTML = [];

            activeEmployees.forEach((emp, index) => {
                const rec = salaryMap[emp.id] || {};
                const empName = emp.shortName ? emp.shortName : `${emp.firstName} ${emp.lastName}`;
                const baseSal = emp.baseSalary ? parseFloat(emp.baseSalary) : 0;
                
                // Calculate Unpaid Leaves and Overtime
                let countA = 0, countL = 0, countHD = 0, countQD = 0;
                let totalOvertimeMins = 0;
                const empAttendance = attendanceMap[emp.id] || [];
                empAttendance.forEach(r => {
                    const status = typeof r === 'string' ? r : r.status;
                    if (status === 'A') countA++;
                    else if (status === 'L') countL++;
                    else if (status === 'HD') countHD++;
                    else if (status === 'QD') countQD++;
                    
                    if (typeof r === 'object' && r.overtimeMinutes) {
                        totalOvertimeMins += r.overtimeMinutes;
                    }
                });
                
                const totalAbsences = countA + countL + (0.5 * countHD) + (0.75 * countQD);
                const unpaidLeaves = Math.max(0, totalAbsences - 1.5);
                
                // Calculate Auto-Deductions based on Unpaid Leaves
                let autoDeduction = (baseSal / daysInMonth) * unpaidLeaves;
                autoDeduction = Math.round(autoDeduction * 100) / 100;
                
                // Calculate Overtime Amount
                let overtimeAmount = 0;
                if (totalOvertimeMins > 0) {
                    const hourlyRate = baseSal / daysInMonth / 9; // assuming 9 hours workday
                    const overtimeHours = totalOvertimeMins / 60;
                    overtimeAmount = hourlyRate * 2 * overtimeHours;
                    overtimeAmount = Math.round(overtimeAmount * 100) / 100;
                }
                
                // Existing manual overtime overrides autoOvertime (if we want to support manual edit)
                if (rec.overtime !== undefined && rec.overtime !== null && rec.overtime !== "") {
                    overtimeAmount = parseFloat(rec.overtime);
                }
                
                // Existing manual deduction overrides autoDeduction
                let deductions = autoDeduction;
                if (rec.deductions !== undefined && rec.deductions !== null && rec.deductions !== "") {
                    const savedDed = parseFloat(rec.deductions);
                    if (savedDed !== 0 || autoDeduction === 0) {
                        deductions = savedDed;
                    }
                }
                
                let advance = rec.advance !== undefined && rec.advance !== null && rec.advance !== "" ? parseFloat(rec.advance) : 0;
                
                // Attendance Bonus (500 if zero leaves/A/L/HD/QD/CO, only when attendance is marked)
                const hasDisqualifyingLeave = empAttendance.some(r => {
                    const status = typeof r === 'string' ? r : r.status;
                    return ['A', 'L', 'HD', 'QD', 'CO'].includes(status);
                });
                const attBonus = (empAttendance.length > 0 && !hasDisqualifyingLeave) ? 500 : 0;
                
                // Other (manual) Bonus
                let otherBonus = 0;
                if (rec.bonus !== undefined && rec.bonus !== null && rec.bonus !== "") {
                    otherBonus = parseFloat(rec.bonus);
                }
                
                // Manual Amount Paid
                let amountPaid = rec.amountPaid !== undefined && rec.amountPaid !== null && rec.amountPaid !== "" ? parseFloat(rec.amountPaid) : 0;
                let amountPaidVal = rec.amountPaid !== undefined && rec.amountPaid !== null ? rec.amountPaid : '';

                // Auto Amount To Be Paid (Balance) = Base Salary + Attendance Bonus + Other Bonus + Overtime - Advance - Deductions - Amount Paid
                let amountToBePaid = (baseSal + attBonus + otherBonus + overtimeAmount - advance - deductions - amountPaid);
                amountToBePaid = Math.round(amountToBePaid * 100) / 100;
                
                rowsHTML.push(`
                <tr id="salary-row-${emp.id}" class="hover:bg-gray-50" data-basesalary="${baseSal}">
                    <td class="sticky-col col-sl-no px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r bg-gray-50">${index + 1}</td>
                    <td class="sticky-col col-emp-id px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r font-bold">${emp.empId || ''}</td>
                    <td class="sticky-col col-emp-name px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-b border-r">
                        ${empName} <span class="text-xs text-gray-500 font-normal block">UL: ${unpaidLeaves}</span>
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 border-b border-r">${baseSal}</td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors" value="${amountToBePaid}" readonly data-field="amountToBePaid" onclick="window.payrollApp.showPaymentOptions('${emp.id}')" title="Click to view payment options">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 font-semibold text-green-700" value="${amountPaidVal}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="amountPaid">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500" value="${advance !== 0 ? advance : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="advance">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1 text-sm text-red-600 focus:ring-blue-500 focus:border-blue-500" value="${deductions !== 0 ? deductions : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="deductions">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1 text-sm text-blue-600 focus:ring-blue-500 focus:border-blue-500 font-semibold" value="${overtimeAmount !== 0 ? overtimeAmount : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="overtime" placeholder="0.00">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" class="w-full rounded border-gray-300 bg-gray-50 px-2 py-1 text-sm text-green-600 font-semibold" value="${attBonus !== 0 ? attBonus : ''}" readonly data-field="attBonus" placeholder="">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b border-r">
                        <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1 text-sm text-green-600 focus:ring-blue-500 focus:border-blue-500 font-semibold" value="${otherBonus !== 0 ? otherBonus : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="bonus" placeholder="0.00">
                    </td>
                    <td class="px-2 py-2 whitespace-nowrap border-b">
                        <input type="text" class="w-full rounded border-gray-300 px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500" value="${rec.notes || ''}" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="notes" placeholder="Notes...">
                        ${unpaidLeaves > 0 ? `<div class="text-xs text-orange-600 mt-1" title="A: ${countA}, L: ${countL}, HD: ${countHD}, QD: ${countQD}">${unpaidLeaves} Unpaid Leave(s) = ${autoDeduction}</div>` : ''}
                        ${attBonus > 0 ? `<div class="text-xs text-green-600 mt-1">Attendance Bonus: 500</div>` : ''}
                        ${totalOvertimeMins > 0 ? `<div class="text-xs text-blue-600 mt-1">OT: ${(totalOvertimeMins / 60).toFixed(1)} hrs</div>` : ''}
                    </td>
                </tr>
                `);

                cardsHTML.push(`
                <div id="salary-card-${emp.id}" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3" data-basesalary="${baseSal}">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                            ${emp.photoUrl ? `<img class="h-10 w-10 object-cover object-top" src="${emp.photoUrl}" alt="">` : `<div class="h-10 w-10 bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">${index + 1}</div>`}
                        </div>
                        <div class="flex-grow min-w-0">
                            <h4 class="font-bold text-gray-900 truncate text-sm">${escapeHTML(empName)}</h4>
                            <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">${escapeHTML(emp.empId || '')}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-orange-600 font-semibold block">UL: ${unpaidLeaves}</span>
                            ${unpaidLeaves > 0 ? `<span class="text-[9px] text-orange-400 block font-bold">-₹${autoDeduction}</span>` : ''}
                            ${attBonus > 0 ? `<span class="text-xs text-green-600 font-semibold block">Bonus: ₹500</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 text-xs border-t border-gray-50 pt-3">
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Base Salary</span>
                            <span class="font-bold text-gray-700 text-sm block mt-1">₹${baseSal}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Amount To Be Paid</span>
                            <input type="number" step="0.01" readonly class="w-full rounded bg-gray-100 border-gray-200 px-2 py-1.5 font-bold text-gray-700 text-xs mt-1 border cursor-pointer hover:bg-gray-200 transition-colors" value="${amountToBePaid}" data-field="amountToBePaid" onclick="window.payrollApp.showPaymentOptions('${emp.id}')" title="Click to view payment options">
                        </div>
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Amount Paid</span>
                            <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1.5 font-bold text-green-700 text-xs mt-1 border" value="${amountPaidVal}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="amountPaid">
                        </div>
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Advance</span>
                            <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1.5 text-xs mt-1 border" value="${advance !== 0 ? advance : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="advance">
                        </div>
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Deductions</span>
                            <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1.5 text-red-600 text-xs mt-1 border" value="${deductions !== 0 ? deductions : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="deductions">
                        </div>
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Overtime</span>
                            <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1.5 text-blue-600 text-xs mt-1 border" value="${overtimeAmount !== 0 ? overtimeAmount : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="overtime">
                        </div>
                        ${attBonus > 0 ? `
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Att. Bonus</span>
                            <input type="number" readonly class="w-full rounded bg-green-50 border-green-200 px-2 py-1.5 font-bold text-green-700 text-xs mt-1 border" value="500" data-field="attBonus">
                        </div>
                        ` : ''}
                        <div>
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Other Bonus</span>
                            <input type="number" step="0.01" class="w-full rounded border-gray-300 px-2 py-1.5 text-green-600 text-xs mt-1 border font-semibold" value="${otherBonus !== 0 ? otherBonus : ''}" oninput="window.payrollApp.recalcRow('${emp.id}')" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="bonus" placeholder="0.00">
                        </div>
                        <div class="col-span-2">
                            <span class="text-gray-400 block font-semibold text-[10px] uppercase">Notes</span>
                            <input type="text" class="w-full rounded border-gray-300 px-2 py-1.5 text-xs mt-1 border" value="${escapeHTML(rec.notes || '')}" onchange="window.payrollApp.updateMonthlySalary('${emp.id}')" data-field="notes" placeholder="Notes...">
                        </div>
                    </div>
                </div>
                `);
            });

            tbody.innerHTML = rowsHTML.join('');
            const mCards = document.getElementById('salaryMobileCards');
            if (mCards) {
                mCards.innerHTML = cardsHTML.join('');
            }
            updateSalaryHeaders();
            
        } catch (e) {
            console.error(e);
            let errMsg = "Unknown error";
            if (e && e.message) errMsg = e.message;
            else if (typeof e === 'string') errMsg = e;
            
            let stackTrace = "No stack trace";
            if (e && e.stack) stackTrace = e.stack.substring(0, 500);

            tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-left text-sm text-red-500 font-mono" style="white-space: pre-wrap; word-break: break-all;">
Error loading records.
Message: ${errMsg}
Stack: ${stackTrace}
            </td></tr>`;
        }
    }
    
    function updateSalaryHeaders() {
        let totalAmountToBePaid = 0;
        let totalDeductionsAdvance = 0;
        
        const tbody = document.getElementById('salaryGridBody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr[id^="salary-row-"]');
        rows.forEach(row => {
            const amountToBePaidInput = row.querySelector('[data-field="amountToBePaid"]');
            const advanceInput = row.querySelector('[data-field="advance"]');
            const deductionsInput = row.querySelector('[data-field="deductions"]');
            
            if (amountToBePaidInput) totalAmountToBePaid += parseFloat(amountToBePaidInput.value) || 0;
            let rowAdvance = 0;
            let rowDeductions = 0;
            if (advanceInput) rowAdvance = parseFloat(advanceInput.value) || 0;
            if (deductionsInput) rowDeductions = parseFloat(deductionsInput.value) || 0;
            
            totalDeductionsAdvance += (rowAdvance + rowDeductions);
        });
        
        const headerAmount = document.getElementById('headerTotalAmount');
        const headerDeductions = document.getElementById('headerDeductionsAdvance');
        
        if (headerAmount) headerAmount.innerText = '₹' + totalAmountToBePaid.toFixed(2);
        if (headerDeductions) headerDeductions.innerText = '₹' + totalDeductionsAdvance.toFixed(2);
    }

    async function resetAllDeductions() {
        if (!confirm("This will reset all deductions to the auto-calculated amount based on unpaid leaves. Any manual deductions will be overwritten. Proceed?")) return;
        
        const btn = document.getElementById('btn-sync-deductions');
        if (btn) btn.innerText = "Syncing...";

        const monthStr = document.getElementById('salaryMonth').value;
        const [year, month] = monthStr.split('-');
        const daysInMonth = new Date(year, parseInt(month), 0).getDate();
        
        // Fetch current attendance map
        const attendanceRecords = await window.firebaseDB.getAttendance(null, { month: monthStr });
        const attendanceMap = {};
        attendanceRecords.forEach(r => {
            if (!attendanceMap[r.employeeId]) attendanceMap[r.employeeId] = [];
            attendanceMap[r.employeeId].push(r.status);
        });

        const activeEmployees = currentEmployees.filter(e => e.status !== 'Inactive');
        let batchPromises = [];
        
        for (const emp of activeEmployees) {
            const baseSal = emp.baseSalary ? parseFloat(emp.baseSalary) : 0;
            let countA = 0, countL = 0, countHD = 0;
            const empAttendance = attendanceMap[emp.id] || [];
            empAttendance.forEach(status => {
                if (status === 'A') countA++;
                else if (status === 'L') countL++;
                else if (status === 'HD') countHD++;
            });
            const totalAbsences = countA + countL + (0.5 * countHD);
            const unpaidLeaves = Math.max(0, totalAbsences - 1.5);
            let autoDeduction = (baseSal / daysInMonth) * unpaidLeaves;
            autoDeduction = Math.round(autoDeduction * 100) / 100;

            const docId = `${emp.id}_${monthStr}`;
            const db = window.firebaseDB.db || firebase.firestore();
            
            // We only need to overwrite the 'deductions' field with autoDeduction
            batchPromises.push(db.collection('salary_records').doc(docId).set({
                deductions: autoDeduction === 0 ? "" : autoDeduction
            }, { merge: true }));
        }

        await Promise.all(batchPromises);
        if (btn) btn.innerText = "Sync Deductions";
        renderSalaryRecords();
    }

    function recalcRow(employeeId) {
        const row = document.getElementById(`salary-row-${employeeId}`);
        const card = document.getElementById(`salary-card-${employeeId}`);
        
        [row, card].forEach(container => {
            if (!container) return;
            const baseSal = parseFloat(container.getAttribute('data-basesalary')) || 0;
            const advanceInput = container.querySelector('[data-field="advance"]');
            const dedInput = container.querySelector('[data-field="deductions"]');
            const bonusInput = container.querySelector('[data-field="bonus"]');
            const amountPaidInput = container.querySelector('[data-field="amountPaid"]');
            const amountToBePaidInput = container.querySelector('[data-field="amountToBePaid"]');
            
            let advance = parseFloat(advanceInput.value) || 0;
            let deductions = parseFloat(dedInput.value) || 0;
            
            const overtimeInput = container.querySelector('[data-field="overtime"]');
            let overtime = overtimeInput ? (parseFloat(overtimeInput.value) || 0) : 0;
            
            const attBonusEl = container.querySelector('[data-field="attBonus"]');
            let attBonus = attBonusEl ? (parseFloat(attBonusEl.value) || 0) : 0;
            let otherBonus = parseFloat(bonusInput.value) || 0;
            let amountPaid = parseFloat(amountPaidInput.value) || 0;
            
            let amountToBePaid = baseSal + attBonus + otherBonus + overtime - advance - deductions - amountPaid;
            amountToBePaid = Math.round(amountToBePaid * 100) / 100;
            
            if (amountToBePaidInput) {
                amountToBePaidInput.value = amountToBePaid;
            }
        });
        
        // Sync values between layouts if both exist
        if (row && card) {
            const activeEl = document.activeElement;
            const isCardActive = card.contains(activeEl);
            const source = isCardActive ? card : row;
            const target = isCardActive ? row : card;
            
            const syncFields = ['advance', 'deductions', 'overtime', 'bonus', 'amountToBePaid', 'amountPaid', 'notes'];
            syncFields.forEach(field => {
                const srcEl = source.querySelector(`[data-field="${field}"]`);
                const tgtEl = target.querySelector(`[data-field="${field}"]`);
                if (srcEl && tgtEl && activeEl !== tgtEl) {
                    tgtEl.value = srcEl.value;
                }
            });
        }
        updateSalaryHeaders();
    }

    async function updateMonthlySalary(employeeId) {
        const monthStr = document.getElementById('salaryMonth').value;
        if (!monthStr) return;
        
        const row = document.getElementById(`salary-row-${employeeId}`);
        const card = document.getElementById(`salary-card-${employeeId}`);
        
        // Sync first from whichever was edited
        const activeEl = document.activeElement;
        const isCardActive = card && card.contains(activeEl);
        const source = isCardActive ? card : (row || card);
        const target = isCardActive ? row : card;
        
        if (!source) return;
        
        if (source && target) {
            const syncFields = ['advance', 'deductions', 'overtime', 'bonus', 'amountToBePaid', 'amountPaid', 'notes'];
            syncFields.forEach(field => {
                const srcEl = source.querySelector(`[data-field="${field}"]`);
                const tgtEl = target.querySelector(`[data-field="${field}"]`);
                if (srcEl && tgtEl) {
                    tgtEl.value = srcEl.value;
                }
            });
        }
        
        const amountInput = source.querySelector('[data-field="amountPaid"]');
        const amountToBePaidInput = source.querySelector('[data-field="amountToBePaid"]');
        const advanceInput = source.querySelector('[data-field="advance"]');
        const dedInput = source.querySelector('[data-field="deductions"]');
        const overtimeInput = source.querySelector('[data-field="overtime"]');
        const bonusInput = source.querySelector('[data-field="bonus"]');
        const notesInput = source.querySelector('[data-field="notes"]');
        
        let amount = parseFloat(amountInput.value);
        let amountToBePaid = amountToBePaidInput ? parseFloat(amountToBePaidInput.value) : null;
        let advance = parseFloat(advanceInput.value);
        let deductions = parseFloat(dedInput.value);
        let overtime = overtimeInput ? parseFloat(overtimeInput.value) : null;
        let bonus = parseFloat(bonusInput.value);
        
        const salaryData = {
            employeeId: employeeId,
            month: monthStr,
            amountPaid: isNaN(amount) ? null : amount,
            amountToBePaid: isNaN(amountToBePaid) ? null : amountToBePaid,
            advance: isNaN(advance) ? null : advance,
            deductions: isNaN(deductions) ? null : deductions,
            overtime: isNaN(overtime) ? null : overtime,
            bonus: isNaN(bonus) ? null : bonus,
            notes: notesInput.value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const statusMsg = document.getElementById('salaryStatusMsg');
        statusMsg.innerText = "Saving...";
        statusMsg.style.opacity = "1";
        
        try {
            const db = window.firebaseDB.db || firebase.firestore();
            await db.collection('salary_records').doc(`${monthStr}_${employeeId}`).set(salaryData, { merge: true });
            
            statusMsg.innerText = "Saved successfully.";
            setTimeout(() => { 
                if(statusMsg.innerText === "Saved successfully.") {
                    statusMsg.style.opacity = "0"; 
                }
            }, 2000);
        } catch (e) {
            console.error(e);
            statusMsg.innerText = "Error saving.";
            alert("Error saving: " + e.message);
        }
    }

    async function saveAllSalaries() {
        const monthStr = document.getElementById('salaryMonth').value;
        if (!monthStr) return;
        
        const activeEmployees = currentEmployees.filter(e => e.status !== 'Inactive');
        if (activeEmployees.length === 0) return;
        
        const statusMsg = document.getElementById('salaryStatusMsg');
        statusMsg.innerText = "Saving all salaries...";
        statusMsg.style.opacity = "1";
        
        try {
            const db = window.firebaseDB.db || firebase.firestore();
            const batch = db.batch();
            
            for (const emp of activeEmployees) {
                const row = document.getElementById(`salary-row-${emp.id}`);
                const card = document.getElementById(`salary-card-${emp.id}`);
                const container = row || card;
                if (!container) continue;
                
                const amountInput = container.querySelector('[data-field="amountPaid"]');
                const amountToBePaidInput = container.querySelector('[data-field="amountToBePaid"]');
                const advanceInput = container.querySelector('[data-field="advance"]');
                const dedInput = container.querySelector('[data-field="deductions"]');
                const bonusInput = container.querySelector('[data-field="bonus"]');
                const notesInput = container.querySelector('[data-field="notes"]');
                
                let amount = parseFloat(amountInput.value);
                let amountToBePaid = amountToBePaidInput ? parseFloat(amountToBePaidInput.value) : null;
                let advance = parseFloat(advanceInput.value);
                let deductions = parseFloat(dedInput.value);
                let bonus = parseFloat(bonusInput.value);
                
                const salaryData = {
                    employeeId: emp.id,
                    month: monthStr,
                    amountPaid: isNaN(amount) ? null : amount,
                    amountToBePaid: isNaN(amountToBePaid) ? null : amountToBePaid,
                    advance: isNaN(advance) ? null : advance,
                    deductions: isNaN(deductions) ? null : deductions,
                    bonus: isNaN(bonus) ? null : bonus,
                    notes: notesInput.value || '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = db.collection('salary_records').doc(`${monthStr}_${emp.id}`);
                batch.set(docRef, salaryData, { merge: true });
            }
            
            await batch.commit();
            statusMsg.innerText = "All salaries saved successfully.";
            setTimeout(() => { 
                if(statusMsg.innerText === "All salaries saved successfully.") {
                    statusMsg.style.opacity = "0"; 
                }
            }, 3000);
        } catch (e) {
            console.error(e);
            statusMsg.innerText = "Error saving all.";
            alert("Error saving all salaries: " + e.message);
        }
    }


    // --- Attendance Page (Monthly Grid) ---
    function initAttendancePage() {
        waitForFirebaseDB(async () => {
            await fetchEmployees();
            
            const monthSelect = document.getElementById('attendanceMonth');
            const yearSelect = document.getElementById('attendanceYear');
            
            if (monthSelect && yearSelect) {
                // Populate year select
                const currentYear = new Date().getFullYear();
                yearSelect.innerHTML = '';
                for (let i = currentYear - 2; i <= currentYear + 1; i++) {
                    yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
                }
                
                // Set default to current month/year
                const now = new Date();
                monthSelect.value = String(now.getMonth() + 1).padStart(2, '0');
                yearSelect.value = String(now.getFullYear());
                
                loadAttendanceForMonth();
            }
        });
    }

    async function loadAttendanceForMonth() {
        const month = document.getElementById('attendanceMonth').value;
        const year = document.getElementById('attendanceYear').value;
        const thead = document.getElementById('attendanceGridHead');
        const tbody = document.getElementById('attendanceGridBody');
        const statusMsg = document.getElementById('attendanceStatusMsg');
        
        if (!month || !year || !thead || !tbody) return;
        
        const monthYearStr = `${year}-${month}`; // YYYY-MM format
        
        statusMsg.innerText = "Loading...";
        statusMsg.style.opacity = "1";
        
        // Calculate days in the month
        const daysInMonth = new Date(year, parseInt(month), 0).getDate();
        
        // Build headers
        let headerRow1 = `<tr>
            <th rowspan="2" class="sticky-col col-sl-no px-2 py-2 text-xs font-semibold text-gray-700 uppercase bg-gray-200">Sl. No.</th>
            <th rowspan="2" class="sticky-col col-emp-id px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-200">Emp. ID</th>
            <th rowspan="2" class="sticky-col col-emp-name px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-200 border-r border-gray-300">Emp. Name</th>`;
            
        let headerRow2 = `<tr>`;
            
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, parseInt(month) - 1, d);
            const dayOfWeek = dateObj.getDay();
            const isSunday = dayOfWeek === 0;
            const colClass = isSunday ? 'day-col sunday-col text-red-600' : 'day-col text-blue-600';
            
            headerRow1 += `<th class="${isSunday ? 'sunday-col' : 'bg-blue-600 text-white'} px-1 py-1 text-center text-xs font-bold border">${String(d).padStart(2, '0')}</th>`;
            headerRow2 += `<th class="${colClass} px-1 py-1 text-xs font-medium border">${dayNames[dayOfWeek]}</th>`;
        }
        
        headerRow1 += `<th colspan="4" class="px-2 py-1 text-center text-xs font-bold border bg-gray-200">Summary</th></tr>`;
        headerRow2 += `
            <th class="px-2 py-1 text-xs font-bold border bg-green-100 text-green-800" title="Present Days">P</th>
            <th class="px-2 py-1 text-xs font-bold border bg-red-100 text-red-800" title="Absent Days">A</th>
            <th class="px-2 py-1 text-xs font-bold border bg-blue-100 text-blue-800" title="Paid Leaves (Max 1.5)">PL</th>
            <th class="px-2 py-1 text-xs font-bold border bg-orange-100 text-orange-800" title="Unpaid Leaves">UL</th>
        </tr>`;
        thead.innerHTML = headerRow1 + headerRow2;
        
        try {
            // Get records for this month (with local cache optimization)
            let records;
            if (currentAttendanceMonthYear === monthYearStr && currentAttendanceRecords.length > 0) {
                records = currentAttendanceRecords;
            } else {
                records = await window.firebaseDB.getAttendance(null, { month: monthYearStr });
                currentAttendanceRecords = records;
                currentAttendanceMonthYear = monthYearStr;
            }
            
            // Map records by employee and date
            const recordMap = {};
            records.forEach(r => {
                if (!recordMap[r.employeeId]) recordMap[r.employeeId] = {};
                recordMap[r.employeeId][r.date] = r;
            });
            
            // Filter out inactive employees
            const activeEmployees = currentEmployees.filter(e => e.status !== 'Inactive');
            
            if (activeEmployees.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${daysInMonth + 3}" class="px-6 py-4 text-center text-sm text-gray-500">No active employees found.</td></tr>`;
                const mCards = document.getElementById('attendanceMobileCards');
                if (mCards) mCards.innerHTML = '<div class="text-sm text-gray-500 py-4 text-center">No active employees found.</div>';
                statusMsg.innerText = "";
                return;
            }
            
            // Initialize mobile date picker if not set or month/year doesn't match
            const mobileDatePicker = document.getElementById('attendanceMobileDate');
            if (mobileDatePicker) {
                if (!mobileDatePicker.value || !mobileDatePicker.value.startsWith(monthYearStr)) {
                    const now = new Date();
                    const nowYear = now.getFullYear();
                    const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
                    if (parseInt(year) === nowYear && month === nowMonth) {
                        mobileDatePicker.value = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;
                    } else {
                        mobileDatePicker.value = `${year}-${month}-01`;
                    }
                }
            }
            const selectedMobileDateStr = mobileDatePicker?.value || `${year}-${month}-01`;

            let bodyHTML = '';
            
            activeEmployees.forEach((emp, index) => {
                let rowHTML = `<tr id="row-${emp.id}">
                    <td class="sticky-col col-sl-no px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 border bg-white">${index + 1}</td>
                    <td class="sticky-col col-emp-id px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900 border bg-white" title="${emp.empId || emp.id}">${emp.empId || emp.id.substring(0, 8) + '...'}</td>
                    <td class="sticky-col col-emp-name px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900 border bg-white border-r-2 border-r-gray-300">${emp.shortName ? emp.shortName : (emp.firstName + ' ' + emp.lastName)}</td>`;
                
                let countP = 0, countA = 0, countL = 0, countHD = 0;
                
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${monthYearStr}-${String(d).padStart(2, '0')}`;
                    const dateObj = new Date(year, parseInt(month) - 1, d);
                    const isSunday = dateObj.getDay() === 0;
                    
                    let rec = recordMap[emp.id] && recordMap[emp.id][dateStr];
                    let status = rec ? rec.status : undefined;
                    
                    if (status === undefined || status === null) {
                        status = isSunday ? 'WO' : '';
                    }
                    
                    if (status === 'P') countP++;
                    else if (status === 'A') countA++;
                    else if (status === 'L') countL++;
                    else if (status === 'HD') countHD++;
                    else if (status === 'QD') countA += 0.75; // QD adds 0.75 absences
                    
                    let punchHTML = '';
                    if (rec && (rec.punchInTime || rec.punchOutTime)) {
                        punchHTML = `
                            <div class="text-[9px] mt-1 text-center w-full">
                                ${rec.punchInTime ? `<span class="text-green-600 font-bold block leading-tight tracking-tighter">I: ${rec.punchInTime.slice(0,5)}</span>` : ''}
                                ${rec.punchOutTime ? `<span class="text-red-600 font-bold block leading-tight tracking-tighter">O: ${rec.punchOutTime.slice(0,5)}</span>` : ''}
                            </div>
                        `;
                    }
                    
                    rowHTML += `
                        <td class="day-col ${isSunday ? 'sunday-col' : ''} border align-top">
                            <select 
                                onchange="window.payrollApp && window.payrollApp.updateAttendanceStatus('${emp.id}', '${dateStr}', this); if(window.collapseStatusOptions) window.collapseStatusOptions(this); if(window.updateRowSummary) window.updateRowSummary('${emp.id}'); if(window.payrollApp.syncAttendanceSelects) window.payrollApp.syncAttendanceSelects('${emp.id}', '${dateStr}', this.value);"
                                onfocus="if(window.expandStatusOptions) window.expandStatusOptions(this)"
                                onblur="if(window.collapseStatusOptions) window.collapseStatusOptions(this)"
                                class="status-badge status-badge-${status}">
                                <option value="" title="" ${status === '' ? 'selected' : ''}></option>
                                <option value="P" title="Present" ${status === 'P' ? 'selected' : ''}>P</option>
                                <option value="A" title="Absent" ${status === 'A' ? 'selected' : ''}>A</option>
                                <option value="WO" title="Week Off" ${status === 'WO' ? 'selected' : ''}>WO</option>
                                <option value="HD" title="Half Day" ${status === 'HD' ? 'selected' : ''}>HD</option>
                                <option value="QD" title="Quarter Day" ${status === 'QD' ? 'selected' : ''}>QD</option>
                                <option value="L" title="Leave" ${status === 'L' ? 'selected' : ''}>L</option>
                                <option value="H" title="Holiday" ${status === 'H' ? 'selected' : ''}>H</option>
                                <option value="CO" title="Compensatory Off" ${status === 'CO' ? 'selected' : ''}>CO</option>
                            </select>
                            ${punchHTML}
                        </td>
                    `;
                }
                
                const totalAbsences = countA + countL + (0.5 * countHD);
                const presentDays = countP + (0.5 * countHD);
                const paidLeaves = Math.min(totalAbsences, 1.5);
                const unpaidLeaves = Math.max(0, totalAbsences - 1.5);
                
                rowHTML += `
                    <td class="px-2 py-2 text-center text-sm font-semibold border bg-green-50 text-green-700 summary-p">${presentDays}</td>
                    <td class="px-2 py-2 text-center text-sm font-semibold border bg-red-50 text-red-700 summary-a">${countA}</td>
                    <td class="px-2 py-2 text-center text-sm font-semibold border bg-blue-50 text-blue-700 summary-pl">${paidLeaves}</td>
                    <td class="px-2 py-2 text-center text-sm font-semibold border bg-orange-50 text-orange-700 summary-ul">${unpaidLeaves}</td>
                </tr>`;
                bodyHTML += rowHTML;
            });
            
            tbody.innerHTML = bodyHTML;
            
            // Render Mobile Cards View
            const mCards = document.getElementById('attendanceMobileCards');
            if (mCards) {
                mCards.innerHTML = activeEmployees.map((emp, index) => {
                    let mRec = recordMap[emp.id] && recordMap[emp.id][selectedMobileDateStr];
                    let status = mRec ? mRec.status : undefined;
                    if (status === undefined || status === null) {
                        const [mYear, mMonth, mDay] = selectedMobileDateStr.split('-').map(Number);
                        const mDateObj = new Date(mYear, mMonth - 1, mDay);
                        status = mDateObj.getDay() === 0 ? 'WO' : '';
                    }
                    
                    // Count summary
                    let countP = 0, countA = 0, countL = 0, countHD = 0, countQD = 0;
                    for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${monthYearStr}-${String(d).padStart(2, '0')}`;
                        const sRec = recordMap[emp.id] && recordMap[emp.id][dateStr];
                        const stat = sRec ? sRec.status : null;
                        if (stat === 'P') countP++;
                        else if (stat === 'A') countA++;
                        else if (stat === 'L') countL++;
                        else if (stat === 'HD') countHD++;
                        else if (stat === 'QD') countQD++;
                    }
                    
                    const totalAbsences = countA + countL + (0.5 * countHD) + (0.75 * countQD);
                    const presentDays = countP + (0.5 * countHD) + (0.25 * countQD);
                    const paidLeaves = Math.min(totalAbsences, 1.5);
                    const unpaidLeaves = Math.max(0, totalAbsences - 1.5);
                    
                    let mobilePunchHTML = '';
                    if (mRec && (mRec.punchInTime || mRec.punchOutTime)) {
                        mobilePunchHTML = `
                            <div class="text-[9px] mt-1 text-center w-full">
                                ${mRec.punchInTime ? `<span class="text-green-600 font-bold block leading-tight tracking-tighter">I: ${mRec.punchInTime.slice(0,5)}</span>` : ''}
                                ${mRec.punchOutTime ? `<span class="text-red-600 font-bold block leading-tight tracking-tighter">O: ${mRec.punchOutTime.slice(0,5)}</span>` : ''}
                            </div>
                        `;
                    }
                    
                    return `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
                                ${emp.photoUrl ? `<img class="h-10 w-10 object-cover object-top" src="${emp.photoUrl}" alt="">` : `<div class="h-10 w-10 bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">${index + 1}</div>`}
                            </div>
                            <div class="flex-grow min-w-0">
                                <h4 class="font-bold text-gray-900 truncate text-sm">${escapeHTML(emp.shortName ? emp.shortName : (emp.firstName + ' ' + emp.lastName))}</h4>
                                <p class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">${escapeHTML(emp.department || 'No Department')}</p>
                            </div>
                        </div>
                        
                        <div class="flex flex-col gap-2 border-t border-b border-gray-50 py-2.5">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold text-gray-500">Status for ${selectedMobileDateStr.split('-')[2]}/${month}/${year}</span>
                                <select 
                                    onchange="window.payrollApp && window.payrollApp.updateAttendanceStatus('${emp.id}', '${selectedMobileDateStr}', this); if(window.updateRowSummary) window.updateRowSummary('${emp.id}'); if(window.payrollApp.syncAttendanceSelects) window.payrollApp.syncAttendanceSelects('${emp.id}', '${selectedMobileDateStr}', this.value);"
                                    class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-semibold p-1 border status-badge status-badge-${status} bg-white">
                                    <option value="" ${status === '' ? 'selected' : ''}></option>
                                    <option value="P" ${status === 'P' ? 'selected' : ''}>P</option>
                                    <option value="A" ${status === 'A' ? 'selected' : ''}>A</option>
                                    <option value="WO" ${status === 'WO' ? 'selected' : ''}>WO</option>
                                    <option value="HD" ${status === 'HD' ? 'selected' : ''}>HD</option>
                                    <option value="QD" ${status === 'QD' ? 'selected' : ''}>QD</option>
                                    <option value="L" ${status === 'L' ? 'selected' : ''}>L</option>
                                    <option value="H" ${status === 'H' ? 'selected' : ''}>H</option>
                                    <option value="CO" ${status === 'CO' ? 'selected' : ''}>CO</option>
                                </select>
                            </div>
                            ${mobilePunchHTML}
                        </div>
                        
                        <div class="grid grid-cols-4 gap-2 text-center text-[10px] bg-gray-50 p-2 rounded-lg font-bold">
                            <div class="text-green-700">P: <span id="m-summary-p-${emp.id}">${presentDays}</span></div>
                            <div class="text-red-700">A: <span id="m-summary-a-${emp.id}">${countA}</span></div>
                            <div class="text-blue-700">PL: <span id="m-summary-pl-${emp.id}">${paidLeaves}</span></div>
                            <div class="text-orange-700">UL: <span id="m-summary-ul-${emp.id}">${unpaidLeaves}</span></div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
            
            document.getElementById('attendanceSelectedPeriod').innerText = `01/${month}/${year}`;
            statusMsg.innerText = "Data loaded.";
            setTimeout(() => { statusMsg.style.opacity = "0"; }, 2000);
            
        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="${daysInMonth + 3}" class="px-6 py-4 text-center text-sm text-red-500">Error loading attendance.</td></tr>`;
            statusMsg.innerText = "Error loading data.";
        }
    }

    async function updateAttendanceStatus(employeeId, dateStr, selectElement) {
        const statusMsg = document.getElementById('attendanceStatusMsg');
        const newStatus = selectElement.value;
        const monthStr = dateStr.substring(0, 7);
        
        // Update class for styling immediately
        selectElement.className = `status-badge status-badge-${newStatus}`;
        
        statusMsg.innerText = "Saving...";
        statusMsg.style.opacity = "1";
        selectElement.disabled = true;
        
        try {
            await window.firebaseDB.saveAttendance({
                employeeId: employeeId,
                date: dateStr,
                month: monthStr,
                status: newStatus,
                remarks: "Admin Manual Override",
                isManualOverride: true
            });
            statusMsg.innerText = "Saved successfully.";
        } catch (e) {
            console.error(e);
            alert("Error saving attendance: " + e.message);
            statusMsg.innerText = "Error saving.";
        } finally {
            selectElement.disabled = false;
            setTimeout(() => { 
                if(statusMsg.innerText === "Saved successfully.") {
                    statusMsg.style.opacity = "0"; 
                }
            }, 2000);
        }
    }

    function syncAttendanceSelects(employeeId, dateStr, newValue) {
        // Desktop select
        const row = document.getElementById(`row-${employeeId}`);
        const desktopSelect = row ? row.querySelector(`select[onchange*="${dateStr}"]`) : null;
        
        // Mobile select
        const mobileSelect = document.querySelector(`#attendanceMobileCards select[onchange*="${employeeId}"][onchange*="${dateStr}"]`);
        
        if (desktopSelect && desktopSelect.value !== newValue) {
            desktopSelect.value = newValue;
            desktopSelect.className = `status-badge status-badge-${newValue}`;
            if (window.updateRowSummary) window.updateRowSummary(employeeId);
        }
        
        if (mobileSelect && mobileSelect.value !== newValue) {
            mobileSelect.value = newValue;
            mobileSelect.className = `rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-semibold p-1 border status-badge status-badge-${newValue} bg-white`;
            if (window.updateRowSummary) window.updateRowSummary(employeeId);
        }
    }

    function changeMobileAttendanceDate() {
        const picker = document.getElementById('attendanceMobileDate');
        if (!picker || !picker.value) return;
        
        const [yearStr, monthStr, dayStr] = picker.value.split('-');
        
        const mSelect = document.getElementById('attendanceMonth');
        const ySelect = document.getElementById('attendanceYear');
        
        if (mSelect && ySelect) {
            const currentM = mSelect.value;
            const currentY = ySelect.value;
            
            if (currentM !== monthStr || currentY !== yearStr) {
                mSelect.value = monthStr;
                ySelect.value = yearStr;
            }
            loadAttendanceForMonth();
        }
    }

    function showPaymentOptions(employeeId) {
        const emp = currentEmployees.find(e => e.id === employeeId);
        if (!emp) return;
        
        // Find remaining balance from the UI
        const row = document.getElementById(`salary-row-${employeeId}`);
        const card = document.getElementById(`salary-card-${employeeId}`);
        const container = row || card;
        let balance = "₹0.00";
        if (container) {
            const amountToBePaidInput = container.querySelector('[data-field="amountToBePaid"]');
            if (amountToBePaidInput) {
                balance = `₹${parseFloat(amountToBePaidInput.value).toFixed(2)}`;
            }
        }
        
        const empName = emp.shortName ? emp.shortName : `${emp.firstName} ${emp.lastName}`;
        
        document.getElementById('paymentModalEmpName').innerText = empName;
        document.getElementById('paymentModalEmpId').innerText = `ID: ${emp.empId || employeeId}`;
        document.getElementById('paymentModalAmount').innerText = balance;
        
        // Populate Bank details
        document.getElementById('paymentModalAccName').innerText = emp.bankAccountName || '-';
        document.getElementById('paymentModalAccNum').innerText = emp.bankAccountNumber || '-';
        document.getElementById('paymentModalBankName').innerText = emp.bankName || '-';
        document.getElementById('paymentModalIfsc').innerText = emp.bankIfscCode || '-';
        document.getElementById('paymentModalBankAddr').innerText = emp.bankAddress || '-';
        
        // Populate UPI ID
        document.getElementById('paymentModalUpiId').innerText = emp.upiId || '-';
        
        // Populate QR Code
        const qrContainer = document.getElementById('paymentModalQrContainer');
        const qrImg = document.getElementById('paymentModalQrImg');
        if (emp.upiQRCodeUrl) {
            qrImg.src = emp.upiQRCodeUrl;
            qrContainer.classList.remove('hidden');
        } else {
            qrImg.src = '';
            qrContainer.classList.add('hidden');
        }
        
    }

    // --- Holidays Page & Management Logic ---
    async function initHolidaysPage() {
        const tbody = document.getElementById('holidaysTableBody');
        const mCards = document.getElementById('holidaysMobileCards');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">Loading holidays...</td></tr>';
        if (mCards) mCards.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">Loading holidays...</div>';

        const statusMsg = document.getElementById('holidayStatusMsg');
        if (statusMsg) {
            statusMsg.innerText = "Loading official holidays...";
            statusMsg.style.opacity = "1";
        }

        try {
            if (currentEmployees.length === 0) {
                await fetchEmployees();
            }
            await fetchHolidays();
            renderHolidaysTable();
            renderChosenHolidaysList();
            if (statusMsg) statusMsg.style.opacity = "0";
        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-red-500">Error loading holidays.</td></tr>';
            if (statusMsg) {
                statusMsg.innerText = "Error loading holidays.";
                statusMsg.style.opacity = "1";
            }
        }
    }

    async function fetchHolidays() {
        const db = window.firebaseDB.db || firebase.firestore();
        const snapshot = await db.collection('official_holidays').orderBy('date', 'asc').get();
        
        let holidays = [];
        snapshot.forEach(doc => {
            holidays.push({ id: doc.id, ...doc.data() });
        });

        // Auto-seed default holidays if collection is empty
        if (holidays.length === 0) {
            const defaultHolidays = [
                { date: '2026-01-26', occasion: 'Republic Day' },
                { date: '2026-03-04', occasion: 'Holi' },
                { date: '2026-08-15', occasion: 'Independence Day' },
                { date: '2026-10-02', occasion: 'Gandhi Jayanti' },
                { date: '2026-11-09', occasion: 'Vishwakarma Day' }
            ];

            const batch = db.batch();
            defaultHolidays.forEach(h => {
                const docRef = db.collection('official_holidays').doc();
                batch.set(docRef, h);
            });
            await batch.commit();

            // Re-fetch
            const freshSnapshot = await db.collection('official_holidays').orderBy('date', 'asc').get();
            holidays = [];
            freshSnapshot.forEach(doc => {
                holidays.push({ id: doc.id, ...doc.data() });
            });
        }

        // Self-correct 2026 Holi date if it was seeded as March 3rd
        let correctedAny = false;
        for (const h of holidays) {
            if (h.occasion === 'Holi' && h.date === '2026-03-03') {
                h.date = '2026-03-04';
                await db.collection('official_holidays').doc(h.id).update({ date: '2026-03-04' });
                correctedAny = true;
            }
        }
        if (correctedAny) {
            holidays.sort((a, b) => a.date.localeCompare(b.date));
        }

        currentHolidays = holidays;
    }

    function renderHolidaysTable() {
        const tbody = document.getElementById('holidaysTableBody');
        const mCards = document.getElementById('holidaysMobileCards');
        if (!tbody) return;

        if (currentHolidays.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">No holidays defined.</td></tr>';
            if (mCards) mCards.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">No holidays defined.</div>';
            return;
        }

        // Render Desktop Table
        tbody.innerHTML = currentHolidays.map((h, index) => {
            const formattedDate = formatDateString(h.date);
            return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${escapeHTML(h.occasion)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="window.payrollApp.editHoliday('${h.id}')" class="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold"><i class="fas fa-edit mr-1"></i>Edit</button>
                    <button onclick="window.payrollApp.deleteHoliday('${h.id}')" class="text-red-600 hover:text-red-900 font-semibold"><i class="fas fa-trash-alt mr-1"></i>Delete</button>
                </td>
            </tr>
            `;
        }).join('');

        // Render Mobile Cards
        if (mCards) {
            mCards.innerHTML = currentHolidays.map((h, index) => {
                const formattedDate = formatDateString(h.date);
                return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center gap-3">
                    <div class="min-w-0">
                        <h4 class="font-bold text-gray-900 text-sm">${escapeHTML(h.occasion)}</h4>
                        <p class="text-xs text-gray-500 font-semibold mt-1"><i class="fas fa-calendar-day text-blue-500 mr-1.5"></i>${formattedDate}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.payrollApp.editHoliday('${h.id}')" class="text-indigo-600 hover:text-indigo-900 p-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center text-xs font-semibold">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.payrollApp.deleteHoliday('${h.id}')" class="text-red-600 hover:text-red-900 p-2.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center text-xs font-semibold">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    function renderChosenHolidaysList() {
        const tbody = document.getElementById('chosenHolidaysTableBody');
        const mCards = document.getElementById('chosenHolidaysMobileCards');
        if (!tbody) return;

        // Group employee holiday choices by date
        const groupedChoices = {};
        
        // Official holiday dates list (to exclude)
        const officialDates = currentHolidays.map(h => h.date);

        currentEmployees.forEach(emp => {
            if (emp.status === 'Inactive') return; // Only show active employees
            
            const empName = emp.shortName ? emp.shortName : `${emp.firstName} ${emp.lastName}`;

            // Check choice 1
            if (emp.holidayChoice1Date) {
                const date = emp.holidayChoice1Date;
                if (!officialDates.includes(date)) {
                    if (!groupedChoices[date]) {
                        groupedChoices[date] = {
                            occasion: emp.holidayChoice1Occasion || 'Holiday of Choice',
                            employees: []
                        };
                    }
                    if (!groupedChoices[date].employees.includes(empName)) {
                        groupedChoices[date].employees.push(empName);
                    }
                }
            }

            // Check choice 2
            if (emp.holidayChoice2Date) {
                const date = emp.holidayChoice2Date;
                if (!officialDates.includes(date)) {
                    if (!groupedChoices[date]) {
                        groupedChoices[date] = {
                            occasion: emp.holidayChoice2Occasion || 'Holiday of Choice',
                            employees: []
                        };
                    }
                    if (!groupedChoices[date].employees.includes(empName)) {
                        groupedChoices[date].employees.push(empName);
                    }
                }
            }
        });

        // Convert grouped object to sorted array by date
        const sortedDates = Object.keys(groupedChoices).sort();

        if (sortedDates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-sm text-gray-500">No employees have chosen other custom holidays.</td></tr>';
            if (mCards) mCards.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">No employees have chosen other custom holidays.</div>';
            return;
        }

        // Render Desktop Table
        tbody.innerHTML = sortedDates.map(date => {
            const info = groupedChoices[date];
            const formattedDate = formatDateString(date);
            const employeeBadges = info.employees.map(name => 
                `<span class="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold mr-1.5 mb-1.5 border border-indigo-100"><i class="fas fa-user mr-1 text-[10px]"></i>${escapeHTML(name)}</span>`
            ).join('');
            
            return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${escapeHTML(info.occasion)}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    <div class="flex flex-wrap">${employeeBadges}</div>
                </td>
            </tr>
            `;
        }).join('');

        // Render Mobile Cards
        if (mCards) {
            mCards.innerHTML = sortedDates.map(date => {
                const info = groupedChoices[date];
                const formattedDate = formatDateString(date);
                const employeeBadges = info.employees.map(name => 
                    `<span class="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold mr-1.5 mb-1 border border-indigo-100"><i class="fas fa-user mr-1 text-[10px]"></i>${escapeHTML(name)}</span>`
                ).join('');
                
                return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2.5">
                    <div class="flex justify-between items-start gap-2">
                        <h4 class="font-bold text-gray-900 text-sm">${escapeHTML(info.occasion)}</h4>
                        <span class="text-[10px] text-gray-400 font-bold uppercase bg-gray-50 px-2 py-0.5 rounded border">${info.employees.length} employee(s)</span>
                    </div>
                    <p class="text-xs text-gray-500 font-semibold"><i class="fas fa-calendar-day text-blue-500 mr-1.5"></i>${formattedDate}</p>
                    <div class="flex flex-wrap mt-1 border-t border-gray-50 pt-2">${employeeBadges}</div>
                </div>
                `;
            }).join('');
        }
    }

    function formatDateString(dateStr) {
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(year, parseInt(month) - 1, day);
            return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    }

    function openAddHolidayModal() {
        document.getElementById('holidayForm').reset();
        document.getElementById('holidayId').value = '';
        document.getElementById('holidayModalTitle').innerHTML = '<i class="fas fa-calendar-alt text-blue-600 mr-2"></i>Add Official Holiday';
        document.getElementById('holidayModal').classList.remove('hidden');
    }

    function closeHolidayModal() {
        document.getElementById('holidayModal').classList.add('hidden');
        document.getElementById('holidayForm').reset();
    }

    function editHoliday(id) {
        const holiday = currentHolidays.find(h => h.id === id);
        if (!holiday) return;

        document.getElementById('holidayId').value = holiday.id;
        document.getElementById('holidayDate').value = holiday.date;
        document.getElementById('holidayOccasion').value = holiday.occasion;
        document.getElementById('holidayModalTitle').innerHTML = '<i class="fas fa-edit text-blue-600 mr-2"></i>Edit Official Holiday';
        
        document.getElementById('holidayModal').classList.remove('hidden');
    }

    async function deleteHoliday(id) {
        if (!confirm("Are you sure you want to delete this official holiday?")) return;

        const statusMsg = document.getElementById('holidayStatusMsg');
        if (statusMsg) {
            statusMsg.innerText = "Deleting...";
            statusMsg.style.opacity = "1";
        }

        try {
            const db = window.firebaseDB.db || firebase.firestore();
            await db.collection('official_holidays').doc(id).delete();
            
            if (statusMsg) statusMsg.innerText = "Deleted successfully.";
            await fetchHolidays();
            renderHolidaysTable();
            setTimeout(() => { if (statusMsg) statusMsg.style.opacity = "0"; }, 2000);
        } catch (e) {
            console.error(e);
            if (statusMsg) statusMsg.innerText = "Error deleting.";
            alert("Error deleting holiday: " + e.message);
        }
    }

    async function handleHolidaySubmit(event) {
        event.preventDefault();
        const btn = document.getElementById('saveHolidayBtn');
        btn.disabled = true;
        btn.innerText = 'Saving...';

        const id = document.getElementById('holidayId').value;
        const date = document.getElementById('holidayDate').value;
        const occasion = document.getElementById('holidayOccasion').value.trim();

        const holidayData = {
            date: date,
            occasion: occasion,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const statusMsg = document.getElementById('holidayStatusMsg');
        if (statusMsg) {
            statusMsg.innerText = "Saving...";
            statusMsg.style.opacity = "1";
        }

        try {
            const db = window.firebaseDB.db || firebase.firestore();
            if (id) {
                await db.collection('official_holidays').doc(id).set(holidayData, { merge: true });
            } else {
                await db.collection('official_holidays').add(holidayData);
            }

            if (statusMsg) statusMsg.innerText = "Saved successfully.";
            closeHolidayModal();
            await fetchHolidays();
            renderHolidaysTable();
            setTimeout(() => { if (statusMsg) statusMsg.style.opacity = "0"; }, 2000);
        } catch (e) {
            console.error(e);
            if (statusMsg) statusMsg.innerText = "Error saving.";
            alert("Error saving holiday: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Holiday';
        }
    }

    // Load and render official holidays in the employee modal
    async function loadEmployeeModalHolidays() {
        const listContainer = document.getElementById('employeeModalNationalHolidaysList');
        if (!listContainer) return;

        try {
            if (currentHolidays.length === 0) {
                await fetchHolidays();
            }

            if (currentHolidays.length === 0) {
                listContainer.innerHTML = '<li class="text-gray-400 italic">No official holidays defined</li>';
                return;
            }

            listContainer.innerHTML = currentHolidays.map(h => {
                const formattedDate = formatDateString(h.date);
                return `<li><strong>${formattedDate}</strong> - ${escapeHTML(h.occasion)}</li>`;
            }).join('');
        } catch (e) {
            console.error("Error loading modal holidays:", e);
            listContainer.innerHTML = '<li class="text-red-500 italic">Failed to load holidays</li>';
        }
    }

    function openAddEmployeeModal() {
        closeEmployeeModal(); // ensure it's reset
        document.getElementById('modalTitle').innerText = 'Add New Employee';
        const deleteBtn = document.getElementById('deleteEmployeeBtn');
        if (deleteBtn) deleteBtn.classList.add('hidden');
        loadEmployeeModalHolidays();
        document.getElementById('employeeModal').classList.remove('hidden');
    }

    // --- Leave Planning Segment ---
    async function initLeavesPage() {
        // Set loading states
        const empTable = document.getElementById('leavesEmployeesTableBody');
        const planTable = document.getElementById('leavePlansTableBody');
        if (empTable) empTable.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading active employees...</td></tr>';
        if (planTable) planTable.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading leave plans...</td></tr>';
        
        waitForFirebaseDB(async () => {
            try {
                await fetchEmployees();
                await fetchLeavePlans();
                renderLeavesPage();
            } catch (e) {
                console.error(e);
                if (empTable) empTable.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-red-500">Error loading page content.</td></tr>';
            }
        });
    }

    async function fetchLeavePlans() {
        try {
            const db = window.firebaseDB.db || firebase.firestore();
            const snapshot = await db.collection('leave_plans').get();
            let plans = [];
            snapshot.forEach(doc => {
                plans.push({ id: doc.id, ...doc.data() });
            });
            // Sort by startDate ascending
            plans.sort((a, b) => a.startDate.localeCompare(b.startDate));
            currentLeavePlans = plans;
            return currentLeavePlans;
        } catch (e) {
            console.error("Error fetching leave plans:", e);
            currentLeavePlans = [];
            return [];
        }
    }

    function renderLeavesPage() {
        const activeEmps = currentEmployees.filter(emp => emp.status !== 'Inactive');
        let tbodyHTML = '';
        let mCardsHTML = '';
        
        // Get today's local date string in YYYY-MM-DD
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (activeEmps.length === 0) {
            tbodyHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No active employees found.</td></tr>`;
            mCardsHTML = `<div class="text-center text-sm text-gray-500 py-4">No active employees found.</div>`;
        } else {
            activeEmps.forEach(emp => {
                // Find active/upcoming leaves for this employee (endDate >= todayStr)
                const empLeaves = currentLeavePlans.filter(p => p.employeeId === emp.id && p.endDate >= todayStr);
                let leavesHTML = '';
                if (empLeaves.length === 0) {
                    leavesHTML = `<span class="text-gray-400 text-xs italic">None</span>`;
                } else {
                    leavesHTML = `<div class="space-y-1">`;
                    empLeaves.forEach(p => {
                        const startFormatted = formatDateString(p.startDate);
                        const endFormatted = formatDateString(p.endDate);
                        const [sYear, sMonth, sDay] = p.startDate.split('-').map(Number);
                        const [eYear, eMonth, eDay] = p.endDate.split('-').map(Number);
                        const start = new Date(sYear, sMonth - 1, sDay);
                        const end = new Date(eYear, eMonth - 1, eDay);
                        const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        leavesHTML += `
                            <div class="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div>
                                    <span><strong>${startFormatted}</strong> to <strong>${endFormatted}</strong> (${days} days)</span>
                                    ${p.remarks ? `<span class="text-[10px] text-gray-500 font-medium italic ml-1 block sm:inline">${escapeHTML(p.remarks)}</span>` : ''}
                                </div>
                                <button onclick="window.payrollApp.deleteLeavePlan('${p.id}')" class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0" title="Delete Leave Plan">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                    });
                    leavesHTML += `</div>`;
                }
                
                tbodyHTML += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${escapeHTML(emp.employeeId || emp.id)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHTML(emp.firstName)} ${escapeHTML(emp.lastName || '')}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div class="font-semibold text-gray-800">${escapeHTML(emp.jobProfile || 'N/A')}</div>
                            <div class="text-xs text-gray-400">${escapeHTML(emp.department || 'N/A')}</div>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">${leavesHTML}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="window.payrollApp.openLeavePlanModal('${emp.id}')" class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg transition-colors font-semibold border border-blue-200">
                                <i class="fas fa-plus mr-1"></i>Plan Leave
                            </button>
                        </td>
                    </tr>
                `;
                
                mCardsHTML += `
                    <div class="bg-white rounded-xl shadow border border-gray-100 p-4 hover:border-blue-200 transition-colors">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <div class="text-xs font-semibold text-gray-400">ID: ${escapeHTML(emp.employeeId || emp.id)}</div>
                                <h4 class="text-base font-bold text-gray-900">${escapeHTML(emp.firstName)} ${escapeHTML(emp.lastName || '')}</h4>
                                <div class="text-xs text-gray-500 font-medium">${escapeHTML(emp.jobProfile || 'N/A')} • ${escapeHTML(emp.department || 'N/A')}</div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <div class="text-xs font-bold text-gray-600 mb-1">Active/Upcoming Planned Leaves:</div>
                            ${leavesHTML}
                        </div>
                        <div class="flex justify-end border-t pt-3">
                            <button onclick="window.payrollApp.openLeavePlanModal('${emp.id}')" class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold border border-blue-200 w-full text-center flex items-center justify-center gap-1">
                                <i class="fas fa-plus"></i> Plan Leave
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        const empTableBody = document.getElementById('leavesEmployeesTableBody');
        if (empTableBody) empTableBody.innerHTML = tbodyHTML;
        
        const empMobileCards = document.getElementById('leavesEmployeesMobileCards');
        if (empMobileCards) empMobileCards.innerHTML = mCardsHTML;

        // Render existing planned leaves
        let plansTbodyHTML = '';
        let plansCardsHTML = '';

        if (currentLeavePlans.length === 0) {
            plansTbodyHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">No planned leaves found.</td></tr>`;
            plansCardsHTML = `<div class="text-center text-sm text-gray-500 py-4">No planned leaves found.</div>`;
        } else {
            currentLeavePlans.forEach((plan, index) => {
                const emp = currentEmployees.find(e => e.id === plan.employeeId);
                const empName = emp ? `${emp.firstName} ${emp.lastName || ''}` : 'Unknown Employee';
                const empIdStr = emp ? (emp.employeeId || emp.id) : 'N/A';
                const startFormatted = formatDateString(plan.startDate);
                const endFormatted = formatDateString(plan.endDate);
                
                const [sYear, sMonth, sDay] = plan.startDate.split('-').map(Number);
                const [eYear, eMonth, eDay] = plan.endDate.split('-').map(Number);
                const start = new Date(sYear, sMonth - 1, sDay);
                const end = new Date(eYear, eMonth - 1, eDay);
                const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                
                plansTbodyHTML += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${index + 1}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${escapeHTML(empName)} <span class="text-xs text-gray-400 font-normal">(${escapeHTML(empIdStr)})</span></td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${startFormatted}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${endFormatted}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${days} day(s)</td>
                        <td class="px-6 py-4 text-sm text-gray-500 italic max-w-xs truncate" title="${escapeHTML(plan.remarks || '')}">${escapeHTML(plan.remarks || '-')}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="window.payrollApp.deleteLeavePlan('${plan.id}')" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-200">
                                <i class="fas fa-trash-alt mr-1"></i>Delete
                            </button>
                        </td>
                    </tr>
                `;
                
                plansCardsHTML += `
                    <div class="bg-white rounded-xl shadow border border-gray-100 p-4 hover:border-red-200 transition-colors">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <div class="text-xs font-semibold text-gray-400">Sl. No. ${index + 1}</div>
                                <h4 class="text-base font-bold text-gray-900">${escapeHTML(empName)}</h4>
                                <div class="text-xs text-gray-500 font-medium">ID: ${escapeHTML(empIdStr)}</div>
                            </div>
                        </div>
                        <div class="space-y-2 mb-4">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Duration:</span>
                                <span class="font-semibold text-gray-900">${startFormatted} to ${endFormatted}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Total Days:</span>
                                <span class="font-bold text-blue-600">${days} day(s)</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Remarks:</span>
                                <span class="text-gray-700 italic">${escapeHTML(plan.remarks || '-')}</span>
                            </div>
                        </div>
                        <div class="flex justify-end border-t pt-3">
                            <button onclick="window.payrollApp.deleteLeavePlan('${plan.id}')" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors text-xs font-bold border border-red-200 w-full text-center flex items-center justify-center gap-1">
                                <i class="fas fa-trash-alt"></i> Delete Plan
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        const plansTableBody = document.getElementById('leavePlansTableBody');
        if (plansTableBody) plansTableBody.innerHTML = plansTbodyHTML;

        const plansMobileCards = document.getElementById('leavePlansMobileCards');
        if (plansMobileCards) plansMobileCards.innerHTML = plansCardsHTML;
    }

    function openLeavePlanModal(employeeId) {
        closeLeavePlanModal();
        
        const select = document.getElementById('leavePlanEmployeeId');
        if (select) {
            select.innerHTML = '<option value="">Select Employee</option>';
            const activeEmps = currentEmployees.filter(emp => emp.status !== 'Inactive');
            activeEmps.forEach(emp => {
                select.innerHTML += `<option value="${emp.id}">${escapeHTML(emp.firstName)} ${escapeHTML(emp.lastName || '')} (${escapeHTML(emp.employeeId || emp.id)})</option>`;
            });
            if (employeeId) {
                select.value = employeeId;
            }
        }
        
        document.getElementById('leavePlanModalTitle').innerHTML = '<i class="fas fa-plane-departure text-blue-600 mr-2"></i>Plan Employee Leave';
        const modal = document.getElementById('leavePlanModal');
        if (modal) modal.classList.remove('hidden');
    }

    function closeLeavePlanModal() {
        const modal = document.getElementById('leavePlanModal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('leavePlanForm');
        if (form) form.reset();
        const idField = document.getElementById('leavePlanId');
        if (idField) idField.value = '';
    }

    async function handleLeavePlanSubmit(event) {
        event.preventDefault();
        const btn = document.getElementById('saveLeavePlanBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = 'Saving...';
        }
        
        const employeeId = document.getElementById('leavePlanEmployeeId').value;
        const startDate = document.getElementById('leavePlanStartDate').value;
        const endDate = document.getElementById('leavePlanEndDate').value;
        const remarks = document.getElementById('leavePlanRemarks').value.trim();
        const planId = document.getElementById('leavePlanId').value;

        if (!employeeId || !startDate || !endDate) {
            alert("Please fill all required fields.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Save Leave Plan';
            }
            return;
        }

        if (endDate < startDate) {
            alert("Error: End Date cannot be before Start Date.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Save Leave Plan';
            }
            return;
        }

        // Check for overlaps with existing leave plans of the same employee
        const overlaps = currentLeavePlans.some(plan => {
            if (planId && plan.id === planId) return false;
            if (plan.employeeId !== employeeId) return false;
            // Overlap: (startDate <= plan.endDate) && (plan.startDate <= endDate)
            return (startDate <= plan.endDate) && (plan.startDate <= endDate);
        });

        if (overlaps) {
            alert("Error: This employee already has a planned leave that overlaps with the selected date range.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Save Leave Plan';
            }
            return;
        }

        const statusMsg = document.getElementById('leavePlanStatusMsg');
        if (statusMsg) {
            statusMsg.innerText = "Saving leave plan...";
            statusMsg.style.opacity = "1";
        }

        try {
            const db = window.firebaseDB.db || firebase.firestore();
            const planData = {
                employeeId: employeeId,
                startDate: startDate,
                endDate: endDate,
                remarks: remarks,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (planId) {
                await db.collection('leave_plans').doc(planId).set(planData, { merge: true });
            } else {
                await db.collection('leave_plans').add(planData);
            }

            // Auto-mark attendance
            const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
            const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);
            const end = new Date(eYear, eMonth - 1, eDay);
            const loop = new Date(start);

            while (loop <= end) {
                const yearStr = loop.getFullYear();
                const monthStr = String(loop.getMonth() + 1).padStart(2, '0');
                const dayStr = String(loop.getDate()).padStart(2, '0');
                const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
                const monthYearStr = `${yearStr}-${monthStr}`;

                await window.firebaseDB.saveAttendance({
                    employeeId: employeeId,
                    date: dateStr,
                    month: monthYearStr,
                    status: 'L',
                    remarks: remarks || "Planned Leave"
                });

                loop.setDate(loop.getDate() + 1);
            }

            if (statusMsg) statusMsg.innerText = "Leave plan saved and attendance marked successfully.";
            closeLeavePlanModal();
            currentAttendanceRecords = [];
            currentAttendanceMonthYear = "";
            await fetchLeavePlans();
            renderLeavesPage();
            setTimeout(() => { if (statusMsg) statusMsg.style.opacity = "0"; }, 3000);
        } catch (e) {
            console.error("Error saving leave plan:", e);
            if (statusMsg) statusMsg.innerText = "Error saving leave plan.";
            alert("Error saving leave plan: " + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Save Leave Plan';
            }
        }
    }

    async function deleteLeavePlan(planId) {
        if (!confirm("Are you sure you want to delete this leave plan? This will also clear the unpaid leaves ('L') marked for these dates.")) return;

        const statusMsg = document.getElementById('leavePlanStatusMsg');
        if (statusMsg) {
            statusMsg.innerText = "Deleting leave plan...";
            statusMsg.style.opacity = "1";
        }

        try {
            const plan = currentLeavePlans.find(p => p.id === planId);
            if (!plan) {
                throw new Error("Leave plan not found in local state.");
            }

            const db = window.firebaseDB.db || firebase.firestore();
            await db.collection('leave_plans').doc(planId).delete();

            // Fetch employee attendance to check which dates are still marked 'L'
            const attendanceRecords = await window.firebaseDB.getAttendance(plan.employeeId);
            const recordMap = {};
            attendanceRecords.forEach(r => {
                recordMap[r.date] = r.status;
            });

            // Loop dates and clear them if they are still 'L'
            const [sYear, sMonth, sDay] = plan.startDate.split('-').map(Number);
            const [eYear, eMonth, eDay] = plan.endDate.split('-').map(Number);
            const start = new Date(sYear, sMonth - 1, sDay);
            const end = new Date(eYear, eMonth - 1, eDay);
            const loop = new Date(start);

            while (loop <= end) {
                const yearStr = loop.getFullYear();
                const monthStr = String(loop.getMonth() + 1).padStart(2, '0');
                const dayStr = String(loop.getDate()).padStart(2, '0');
                const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
                const monthYearStr = `${yearStr}-${monthStr}`;

                if (recordMap[dateStr] === 'L') {
                    await window.firebaseDB.saveAttendance({
                        employeeId: plan.employeeId,
                        date: dateStr,
                        month: monthYearStr,
                        status: '',
                        remarks: ''
                    });
                }

                loop.setDate(loop.getDate() + 1);
            }

            if (statusMsg) statusMsg.innerText = "Leave plan deleted and attendance cleaned up successfully.";
            currentAttendanceRecords = [];
            currentAttendanceMonthYear = "";
            await fetchLeavePlans();
            renderLeavesPage();
            setTimeout(() => { if (statusMsg) statusMsg.style.opacity = "0"; }, 3000);
        } catch (e) {
            console.error("Error deleting leave plan:", e);
            if (statusMsg) statusMsg.innerText = "Error deleting leave plan.";
            alert("Error deleting leave plan: " + e.message);
        }
    }

    // --- Face Recognition Functions ---
    let faceApiLoaded = false;
    let faceModelsLoading = false;
    let faceCheckInInterval = null;
    const lastPunchTimes = {};
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

    async function loadFaceModels() {
        if (faceApiLoaded) return true;
        if (faceModelsLoading) {
            while(faceModelsLoading) { await new Promise(r => setTimeout(r, 100)); }
            return faceApiLoaded;
        }
        faceModelsLoading = true;
        try {
            await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            faceApiLoaded = true;
            console.log("Face API models loaded successfully");
            return true;
        } catch (e) {
            console.error("Failed to load Face API models:", e);
            alert("Error loading face recognition models. Please check console.");
            return false;
        } finally {
            faceModelsLoading = false;
        }
    }

    async function openFaceEnrollModal(employeeId) {
        document.getElementById('faceEnrollEmpId').value = employeeId;
        document.getElementById('faceEnrollModal').classList.remove('hidden');
        document.getElementById('faceEnrollStatus').innerText = "Initializing models...";
        
        const modelsLoaded = await loadFaceModels();
        if (!modelsLoaded) {
            document.getElementById('faceEnrollStatus').innerText = "Model load failed.";
            return;
        }
        
        document.getElementById('faceEnrollStatus').innerText = "Starting camera...";
        const video = document.getElementById('faceEnrollVideo');
        
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser API not supported. Please use HTTPS or localhost.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            video.play().catch(e => console.warn("Auto-play prevented", e));
            
            video.onplaying = async () => {
                document.getElementById('faceEnrollOverlay').classList.add('hidden');
                document.getElementById('btnCaptureFace').disabled = false;
                
                const canvas = document.getElementById('faceEnrollCanvas');
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceapi.matchDimensions(canvas, displaySize);
                
                faceCheckInInterval = setInterval(async () => {
                    if(video.paused || video.ended) return;
                    const detections = await faceapi.detectSingleFace(video).withFaceLandmarks();
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (detections) {
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        faceapi.draw.drawDetections(canvas, resizedDetections);
                        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                    }
                }, 100);
            };
        } catch (e) {
            console.error("Camera access failed", e);
            let errMsg = "Camera access denied.";
            if (e.name === 'NotAllowedError') errMsg = "Camera permission denied by user.";
            else if (e.name === 'NotFoundError') errMsg = "No camera found on this device.";
            else errMsg = e.message || "Camera error.";
            document.getElementById('faceEnrollStatus').innerHTML = `<span class="text-red-400 font-bold">${errMsg}</span><br><span class="text-xs text-gray-300 mt-2 block">Please check your browser/system permissions.</span>`;
            document.getElementById('faceEnrollOverlay').querySelector('.fa-spinner').className = "fas fa-video-slash text-3xl mb-2 text-red-500";
        }
    }

    async function captureFaceDescriptor() {
        const video = document.getElementById('faceEnrollVideo');
        const employeeId = document.getElementById('faceEnrollEmpId').value;
        const btn = document.getElementById('btnCaptureFace');
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Capturing...';
        
        try {
            const detections = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
            if (!detections) {
                alert("No face detected! Please ensure your face is clearly visible.");
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-camera mr-2"></i>Capture & Save';
                return;
            }
            
            const descriptor = Array.from(detections.descriptor);
            
            const db = window.firebaseDB.db || firebase.firestore();
            await db.collection('employees').doc(employeeId).update({
                faceDescriptor: descriptor,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const emp = currentEmployees.find(e => e.id === employeeId);
            if (emp) emp.faceDescriptor = descriptor;
            
            alert("Face enrolled successfully!");
            closeFaceEnrollModal();
        } catch (e) {
            console.error("Error capturing face:", e);
            alert("Error: " + e.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-camera mr-2"></i>Capture & Save';
        }
    }

    function closeFaceEnrollModal() {
        document.getElementById('faceEnrollModal').classList.add('hidden');
        document.getElementById('faceEnrollOverlay').classList.remove('hidden');
        document.getElementById('btnCaptureFace').disabled = true;
        
        const video = document.getElementById('faceEnrollVideo');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        if (faceCheckInInterval) {
            clearInterval(faceCheckInInterval);
            faceCheckInInterval = null;
        }
        const canvas = document.getElementById('faceEnrollCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    async function openFaceCheckInModal() {
        document.getElementById('faceCheckInModal').classList.remove('hidden');
        const overlay = document.getElementById('faceCheckInOverlay');
        const statusText = document.getElementById('faceCheckInStatus');
        
        overlay.classList.remove('hidden');
        statusText.innerText = "Loading models...";
        
        const modelsLoaded = await loadFaceModels();
        if (!modelsLoaded) {
            statusText.innerText = "Model load failed.";
            return;
        }
        
        const labeledDescriptors = currentEmployees
            .filter(emp => emp.status === 'Active' && emp.faceDescriptor)
            .map(emp => {
                return new faceapi.LabeledFaceDescriptors(
                    emp.id,
                    [new Float32Array(emp.faceDescriptor)]
                );
            });
            
        if (labeledDescriptors.length === 0) {
            statusText.innerText = "No active employees with enrolled faces.";
            return;
        }
        
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
        
        statusText.innerText = "Starting camera...";
        const video = document.getElementById('faceCheckInVideo');
        
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser API not supported. Please use HTTPS or localhost.");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
            video.play().catch(e => console.warn("Auto-play prevented", e));
            
            video.onplaying = async () => {
                overlay.classList.add('hidden');
                
                const canvas = document.getElementById('faceCheckInCanvas');
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceapi.matchDimensions(canvas, displaySize);
                
                checkInProcessing = false;
                
                faceCheckInInterval = setInterval(async () => {
                    if (video.paused || video.ended) return;
                    
                    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (detections && detections.length > 0) {
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        
                        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));
                        results.forEach((result, i) => {
                            const box = resizedDetections[i].detection.box;
                            
                            if (result.label !== 'unknown') {
                                const empId = result.label;
                                const emp = currentEmployees.find(e => e.id === empId);
                                const empName = emp ? (emp.shortName || (emp.firstName + ' ' + emp.lastName)) : "Unknown";
                                
                                // Check cooldown
                                const now = Date.now();
                                const lastPunch = lastPunchTimes[empId] || 0;
                                const isCooldownOver = (now - lastPunch) > COOLDOWN_MS;
                                
                                let boxText = empName;
                                if (!isCooldownOver) {
                                    boxText += ' (Cooldown)';
                                }
                                
                                const drawBox = new faceapi.draw.DrawBox(box, { label: boxText, boxColor: isCooldownOver ? '#10B981' : '#F59E0B' });
                                drawBox.draw(canvas);
                                
                                if (isCooldownOver) {
                                    lastPunchTimes[empId] = now;
                                    handleAutoCheckIn(empId, empName);
                                }
                            } else {
                                const drawBox = new faceapi.draw.DrawBox(box, { label: 'Unknown', boxColor: '#EF4444' });
                                drawBox.draw(canvas);
                            }
                        });
                    }
                }, 150);
            };
        } catch (e) {
            console.error("Camera access failed", e);
            let errMsg = "Camera access denied.";
            if (e.name === 'NotAllowedError') errMsg = "Camera permission denied by user.";
            else if (e.name === 'NotFoundError') errMsg = "No camera found on this device.";
            else errMsg = e.message || "Camera error.";
            statusText.innerHTML = `<span class="text-red-400 font-bold">${errMsg}</span><br><span class="text-xs text-gray-300 mt-2 block">Please check your browser/system permissions.</span>`;
            overlay.querySelector('.fa-circle-notch').className = "fas fa-video-slash text-4xl mb-3 text-red-500";
        }
    }

    async function handleAutoCheckIn(empId, empName) {
        const dateObj = new Date();
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const monthStr = `${year}-${month}`;
        
        // Format punch time
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const seconds = dateObj.getSeconds();
        const punchTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        try {
            // Check existing attendance for today
            const existingRecords = await window.firebaseDB.getAttendance(empId, { date: dateStr });
            const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
            
            // If manual override is true, don't overwrite the status, but we can still record punch times
            const isManualOverride = existingRecord && existingRecord.isManualOverride;
            
            let statusToSet = 'P';
            let overtimeMins = 0;
            let punchData = {};
            let isCheckOut = false;
            
            if (!existingRecord || !existingRecord.punchInTime) {
                // Check IN
                statusToSet = 'P'; // Initially assume present
                punchData = { punchInTime: punchTimeStr };
            } else {
                // Check OUT
                isCheckOut = true;
                punchData = { punchOutTime: punchTimeStr };
                
                // Calculate Status based on checkout time
                if (hours < 13) {
                    statusToSet = 'QD'; // Quarter Day
                } else if (hours >= 13 && hours < 17) {
                    statusToSet = 'HD'; // Half Day
                } else {
                    statusToSet = 'P'; // Present
                }
                
                // Calculate Overtime if checking out after 18:00 (6 PM)
                if (hours >= 18) {
                    const extraHours = hours - 18;
                    overtimeMins = (extraHours * 60) + minutes;
                }
            }
            
            // Do not override status if admin has manually set it
            if (isManualOverride) {
                statusToSet = existingRecord.status;
            }
            
            await window.firebaseDB.saveAttendance({
                employeeId: empId,
                date: dateStr,
                month: monthStr,
                status: statusToSet,
                remarks: isCheckOut ? "Face Check-out" : "Face Check-in",
                ...punchData,
                ...(overtimeMins > 0 && { overtimeMinutes: overtimeMins })
            });
            
            // Show toast notification
            const toastContainer = document.getElementById('faceCheckInToastContainer');
            if (toastContainer) {
                const toast = document.createElement('div');
                toast.className = `bg-white shadow-lg rounded-lg border-l-4 ${isCheckOut ? 'border-orange-500' : 'border-green-500'} p-3 transform transition-all duration-300 translate-x-full`;
                toast.innerHTML = `
                    <div class="flex items-center gap-2">
                        <div class="flex-shrink-0">
                            <i class="fas ${isCheckOut ? 'fa-sign-out-alt text-orange-500' : 'fa-check-circle text-green-500'}"></i>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-gray-900">${empName}</p>
                            <p class="text-xs text-gray-500">${isCheckOut ? 'Checked Out' : 'Checked In'} at ${punchTimeStr}</p>
                        </div>
                    </div>
                `;
                toastContainer.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-x-full');
                }, 10);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    toast.classList.add('translate-x-full');
                    toast.classList.add('opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }, 5000);
            }
            
            // Update the select element in the grid
            syncAttendanceSelects(empId, dateStr, statusToSet);
            
        } catch (e) {
            console.error("Error auto-checking in:", e);
        }
    }
    
    function closeFaceCheckInModal() {
        document.getElementById('faceCheckInModal').classList.add('hidden');
        const video = document.getElementById('faceCheckInVideo');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        if (faceCheckInInterval) {
            clearInterval(faceCheckInInterval);
            faceCheckInInterval = null;
        }
        const canvas = document.getElementById('faceCheckInCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        checkInProcessing = false;
        document.getElementById('faceCheckInSuccessOverlay').classList.add('hidden');
    }

    // Expose global functions for HTML onclick
    window.closeEmployeeModal = closeEmployeeModal;
    window.handleEmployeeSubmit = handleEmployeeSubmit;
    window.openManageDepartmentsModal = openManageDepartmentsModal;
    window.closeManageDepartmentsModal = closeManageDepartmentsModal;
    window.addDepartment = addDepartment;

    // Public API
    return {
        initEmployeePage,
        editEmployee,
        toggleEmployeeStatus,
        deleteEmployeeFromModal,
        toggleInactiveEmployees,
        initSalaryPage,
        loadSalaryGrid,
        updateMonthlySalary,
        saveAllSalaries,
        recalcRow,
        initAttendancePage,
        loadAttendanceForMonth,
        updateAttendanceStatus,
        saveDepartmentName,
        deleteDepartment,
        syncAttendanceSelects,
        changeMobileAttendanceDate,
        filterEmployees,
        showPaymentOptions,
        initHolidaysPage,
        openAddHolidayModal,
        closeHolidayModal,
        editHoliday,
        deleteHoliday,
        handleHolidaySubmit,
        openAddEmployeeModal,
        initLeavesPage,
        openLeavePlanModal,
        closeLeavePlanModal,
        handleLeavePlanSubmit,
        deleteLeavePlan,
        openFaceEnrollModal,
        closeFaceEnrollModal,
        captureFaceDescriptor,
        openFaceCheckInModal,
        closeFaceCheckInModal
    };
})();
