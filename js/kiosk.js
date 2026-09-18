// kiosk.js
// Standalone logic for the auto-attendance Raspberry Pi Kiosk

const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per employee
let lastPunchTimes = {};
let currentEmployees = [];
let faceMatcher = null;

// Start digital clock
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('clock-time').innerText = timeStr;
    document.getElementById('clock-date').innerText = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

function setSystemStatus(msg, isError = false) {
    const statusText = document.getElementById('system-status-text');
    const icon = document.querySelector('#system-status i');
    statusText.innerText = msg;
    
    if (isError) {
        icon.className = "fas fa-exclamation-triangle text-red-500 mr-2";
    } else {
        if (msg === "System Ready") {
            icon.className = "fas fa-check-circle text-green-500 mr-2";
        } else {
            icon.className = "fas fa-spinner fa-spin text-blue-400 mr-2";
        }
    }
}

function showToast(title, msg, type = 'success') {
    const toast = document.getElementById('status-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');
    
    toastTitle.innerText = title;
    toastMsg.innerText = msg;
    
    if (type === 'success') {
        toastIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        toastIcon.className = "text-green-400 text-5xl mb-4";
    } else if (type === 'warning') {
        toastIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        toastIcon.className = "text-yellow-400 text-5xl mb-4";
    }
    
    toast.classList.add('show');
    
    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

async function loadModels() {
    setSystemStatus("Loading AI Models...");
    try {
        const MODEL_URL = '/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        return true;
    } catch (e) {
        console.error("Model load error:", e);
        setSystemStatus("Failed to load AI Models", true);
        return false;
    }
}

async function fetchEmployees() {
    setSystemStatus("Syncing employees...");
    try {
        const db = window.firebaseDB.db || firebase.firestore();
        const snapshot = await db.collection('employees').get();
        currentEmployees = [];
        snapshot.forEach(doc => {
            currentEmployees.push({ id: doc.id, ...doc.data() });
        });
        
        // Build descriptors
        const labeledDescriptors = currentEmployees
            .filter(emp => emp.status === 'Active' && (emp.faceDescriptors || emp.faceDescriptor))
            .map(emp => {
                let descriptorsList = [];
                if (emp.faceDescriptors && Array.isArray(emp.faceDescriptors)) {
                    descriptorsList = emp.faceDescriptors.map(d => {
                        let parsed = typeof d === 'string' ? JSON.parse(d) : d;
                        return new Float32Array(parsed);
                    });
                } else if (emp.faceDescriptor) {
                    descriptorsList = [new Float32Array(emp.faceDescriptor)];
                }
                return new faceapi.LabeledFaceDescriptors(emp.id, descriptorsList);
            })
            .filter(ld => ld.descriptors.length > 0);
            
        if (labeledDescriptors.length === 0) {
            setSystemStatus("No enrolled faces found", true);
            return false;
        }
        
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
        return true;
    } catch (e) {
        console.error("Firebase sync error:", e);
        setSystemStatus("Failed to sync database", true);
        return false;
    }
}

async function startCamera() {
    setSystemStatus("Starting camera...");
    const video = document.getElementById('kioskVideo');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user" 
            } 
        });
        video.srcObject = stream;
        video.play().catch(e => console.warn("Auto-play prevented", e));
        
        video.onplaying = () => {
            setSystemStatus("System Ready");
            const canvas = document.getElementById('kioskCanvas');
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
            
            let isDetecting = false;
            
            // Loop for detection
            setInterval(async () => {
                if (video.paused || video.ended || isDetecting) return;
                
                isDetecting = true;
                try {
                    // Use TinyFaceDetector with small input size for max speed on Pi
                    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
                    const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks().withFaceDescriptors();
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (detections && detections.length > 0 && faceMatcher) {
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
                            if (!isCooldownOver) boxText += ' (Cooldown)';
                            
                            // Draw bounding box (mirrored context means box is flipped, faceapi.draw handles it mostly, 
                            // but because we CSS transformed the video, drawing over it can be tricky. 
                            // It's usually fine for visual feedback).
                            const drawBox = new faceapi.draw.DrawBox(box, { 
                                label: boxText, 
                                boxColor: isCooldownOver ? 'rgba(16, 185, 129, 0.8)' : 'rgba(245, 158, 11, 0.5)' 
                            });
                            drawBox.draw(canvas);
                            
                            if (isCooldownOver) {
                                lastPunchTimes[empId] = now;
                                logAttendance(empId, empName);
                            }
                        } else {
                            const drawBox = new faceapi.draw.DrawBox(box, { label: 'Unknown', boxColor: 'rgba(239, 68, 68, 0.8)' });
                            drawBox.draw(canvas);
                        }
                    });
                }
            } catch (err) {
                console.error("Detection error:", err);
            } finally {
                isDetecting = false;
            }
            }, 500); // 500ms interval is safer for Raspberry Pi CPU
        };
    } catch (e) {
        console.error("Camera access failed", e);
        setSystemStatus("Camera Error: Check Permissions", true);
    }
}

async function logAttendance(empId, empName) {
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const monthStr = `${year}-${month}`;
    
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const seconds = dateObj.getSeconds();
    const punchTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    try {
        const existingRecords = await window.firebaseDB.getAttendance(empId, { date: dateStr });
        const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;
        
        const isManualOverride = existingRecord && existingRecord.isManualOverride;
        
        let statusToSet = 'P';
        let overtimeMins = 0;
        let punchData = {};
        let isCheckOut = false;
        
        if (!existingRecord || !existingRecord.punchInTime) {
            // Check IN
            statusToSet = 'P';
            punchData = { punchInTime: punchTimeStr };
        } else {
            // Check OUT
            isCheckOut = true;
            punchData = { punchOutTime: punchTimeStr };
            
            if (hours < 13) statusToSet = 'QD';
            else if (hours >= 13 && hours < 17) statusToSet = 'HD';
            else statusToSet = 'P';
            
            if (hours >= 18) {
                overtimeMins = ((hours - 18) * 60) + minutes;
            }
        }
        
        if (isManualOverride) {
            statusToSet = existingRecord.status;
        }
        
        await window.firebaseDB.saveAttendance({
            employeeId: empId,
            date: dateStr,
            month: monthStr,
            status: statusToSet,
            overtimeMinutes: overtimeMins,
            ...punchData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success UI
        const type = isCheckOut ? "OUT" : "IN";
        const successMsg = `Punched ${type} successfully at ${punchTimeStr.slice(0,5)}`;
        showToast(
            `${empName}`, 
            successMsg,
            'success'
        );
        
        // Audio feedback for headless mode
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`Attendance recorded for ${empName}`);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
        
    } catch (e) {
        console.error("Error logging attendance via Kiosk:", e);
        showToast("Network Error", `Failed to log punch for ${empName}`, 'warning');
        if ('speechSynthesis' in window) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Network error. Please try again."));
        }
    }
}

// Initialize Kiosk
async function initKiosk() {
    // Explicitly initialize Firebase for the standalone kiosk
    try {
        if (window.initializeFirebaseApp) {
            window.initializeFirebaseApp();
        }
        if (window.firebaseDB && typeof window.firebaseDB.initialize === 'function') {
            await window.firebaseDB.initialize();
        }
    } catch (e) {
        console.error("Firebase Init Error:", e);
    }
    
    // Wait for firebase to init
    const checkDb = setInterval(async () => {
        if (window.firebaseDB && window.firebaseDB.db) {
            clearInterval(checkDb);
            const modelsOk = await loadModels();
            if (modelsOk) {
                const empsOk = await fetchEmployees();
                if (empsOk) {
                    startCamera();
                }
            }
            
            // Poll for new employees every 10 mins (in case new faces are enrolled remotely)
            setInterval(fetchEmployees, 10 * 60 * 1000);
        }
    }, 500);
}

document.addEventListener("DOMContentLoaded", initKiosk);
