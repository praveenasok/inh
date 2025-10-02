
        // Firebase Readiness Check
        function waitForFirebase() {
            return new Promise((resolve) => {
                if (window.globalFirebase && window.globalFirebase.isAvailable()) {
                    resolve();
                } else {
                    // Wait for global Firebase to be ready
                    const checkInterval = setInterval(() => {
                        if (window.globalFirebase && window.globalFirebase.isAvailable()) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    
                    // Fallback timeout
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 5000);
                }
            });
        }
        
        // Firebase ready check will be handled in main initialization
    