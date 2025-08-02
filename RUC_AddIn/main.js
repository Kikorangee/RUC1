// COMPREHENSIVE DEBUG VERSION - Enhanced logging for troubleshooting
"use strict";

// Enable comprehensive logging
console.log("=== DEBUG MODE ENABLED ===");
console.log("Timestamp:", new Date().toISOString());

let fleetData = [];
let geotabApi = null;
let debugLog = [];

function logDebug(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data || '');
    debugLog.push(logEntry + (data ? ': ' + JSON.stringify(data) : ''));
    
    // Update debug display if available
    updateDebugDisplay();
}

function updateDebugDisplay() {
    const debugElement = document.getElementById('debug-output');
    if (debugElement) {
        debugElement.innerHTML = debugLog.map(log => `<div>${log}</div>`).join('');
        debugElement.scrollTop = debugElement.scrollHeight;
    }
}

function initialize(api, state, callback) {
    logDebug("=== INITIALIZE FUNCTION CALLED ===");
    logDebug("API object received", api ? "YES" : "NO");
    logDebug("State object received", state ? "YES" : "NO");
    logDebug("Callback function received", callback ? "YES" : "NO");
    
    geotabApi = api;
    
    if (state && state.user) {
        logDebug("User information", state.user.name);
    }
    
    try {
        logDebug("Setting up page structure...");
        setupPage();
        
        logDebug("Starting data loading process...");
        loadFleetData();
        
    } catch (error) {
        logDebug("ERROR in initialize function", error.message);
        console.error("Initialize error:", error);
    }
    
    if (callback) {
        logDebug("Calling callback function...");
        callback();
    }
    
    logDebug("=== INITIALIZE FUNCTION COMPLETED ===");
}

function setupPage() {
    logDebug("Creating page HTML structure...");
    
    document.body.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #28a745;">RUC License Management - DEBUG MODE</h1>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <h3>Status: <span id="status">Initializing...</span></h3>
                <div id="progress-bar" style="background: #e9ecef; height: 20px; border-radius: 10px; margin: 10px 0;">
                    <div id="progress-fill" style="background: #28a745; height: 100%; width: 10%; border-radius: 10px; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 10px 0;">
                <h4>Debug Console Output:</h4>
                <div id="debug-output" style="background: #343a40; color: #f8f9fa; padding: 10px; border-radius: 3px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;"></div>
                <button onclick="copyDebugLog()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 3px; margin-top: 10px; cursor: pointer;">Copy Debug Log</button>
            </div>
            
            <div id="data-container" style="margin: 20px 0;"></div>
            
            <div id="error-container" style="display: none; background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24; margin: 10px 0;">
                <h4>Error Details:</h4>
                <div id="error-message"></div>
            </div>
        </div>
    `;
    
    updateDebugDisplay();
    logDebug("Page structure created successfully");
}

function updateProgress(percentage, statusText) {
    const statusElement = document.getElementById('status');
    const progressFill = document.getElementById('progress-fill');
    
    if (statusElement) statusElement.textContent = statusText;
    if (progressFill) progressFill.style.width = percentage + '%';
    
    logDebug(`Progress: ${percentage}% - ${statusText}`);
}

function loadFleetData() {
    logDebug("=== STARTING DATA LOADING PROCESS ===");
    updateProgress(20, "Preparing to fetch data...");
    
    const dataUrl = "https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json";
    logDebug("Data URL", dataUrl);
    
    updateProgress(30, "Connecting to GitHub Pages...");
    
    fetch(dataUrl)
        .then(response => {
            logDebug("Fetch response received");
            logDebug("Response status", response.status);
            logDebug("Response status text", response.statusText);
            logDebug("Response headers", Object.fromEntries(response.headers.entries()));
            
            updateProgress(50, "Response received, parsing JSON...");
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        })
        .then(data => {
            logDebug("JSON parsing successful");
            logDebug("Data type", typeof data);
            logDebug("Data is array", Array.isArray(data));
            logDebug("Data length", data.length);
            
            if (data.length > 0) {
                logDebug("First vehicle sample", data[0]);
            }
            
            updateProgress(70, "Processing vehicle data...");
            
            fleetData = data.map((vehicle, index) => {
                const processedVehicle = {
                    ...vehicle,
                    currentOdometer: 0,
                    remainingKm: vehicle.rucPaidTo,
                    lastUpdated: null,
                    deviceId: null
                };
                
                if (index < 3) {
                    logDebug(`Processed vehicle ${index + 1}`, processedVehicle);
                }
                
                return processedVehicle;
            });
            
            updateProgress(90, "Building vehicle table...");
            logDebug("Fleet data processing completed", fleetData.length + " vehicles ready");
            
            displayFleetData();
            
        })
        .catch(error => {
            logDebug("ERROR in loadFleetData", error.message);
            logDebug("Error stack", error.stack);
            
            updateProgress(0, "Error occurred");
            showError("Data loading failed: " + error.message);
        });
}

function displayFleetData() {
    logDebug("=== STARTING DISPLAY PROCESS ===");
    updateProgress(95, "Displaying vehicle data...");
    
    const container = document.getElementById('data-container');
    if (!container) {
        logDebug("ERROR: data-container element not found");
        return;
    }
    
    logDebug("Building HTML for", fleetData.length, "vehicles");
    
    let html = `
        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; color: #155724;">
            <h3>✅ SUCCESS: Fleet Data Loaded</h3>
            <p><strong>Total Vehicles:</strong> ${fleetData.length}</p>
            <p><strong>Data Source:</strong> GitHub Pages RUC_Data.json</p>
            <p><strong>Status:</strong> Ready for odometer integration</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white;">
            <thead>
                <tr style="background: #343a40; color: white;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Vehicle Description</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Fleet #</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Reg Plate</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">RUC Paid To (km)</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    fleetData.forEach((vehicle, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        html += `
            <tr style="background: ${bgColor};">
                <td style="padding: 10px; border: 1px solid #ddd;">${vehicle.vehicleDescription || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${vehicle.fleetNumber || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${vehicle.regPlate || 'N/A'}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatNumber(vehicle.rucPaidTo)}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    <button onclick="testOdometerRead(${index})" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin: 2px;">
                        Get Reading
                    </button>
                    <button onclick="testRenew(${index})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin: 2px;">
                        Renew
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>🎯 Next Steps:</h4>
            <ul>
                <li>✅ All ${fleetData.length} vehicles loaded successfully</li>
                <li>🔄 Click "Get Reading" to test Geotab device integration</li>
                <li>🔄 Click "Renew" to test license renewal functionality</li>
                <li>📊 Monitor console for detailed API interaction logs</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = html;
    updateProgress(100, "Fleet data displayed successfully!");
    
    logDebug("Display process completed successfully");
    logDebug("=== ALL PROCESSES COMPLETED ===");
}

function testOdometerRead(vehicleIndex) {
    const vehicle = fleetData[vehicleIndex];
    logDebug("=== TESTING ODOMETER READ ===");
    logDebug("Vehicle selected", vehicle.vehicleDescription);
    logDebug("Fleet number", vehicle.fleetNumber);
    logDebug("Registration", vehicle.regPlate);
    
    if (!geotabApi) {
        logDebug("ERROR: Geotab API not available");
        alert("Geotab API not available for odometer reading");
        return;
    }
    
    logDebug("Geotab API available, testing connection...");
    alert(`Testing odometer read for:\n\nVehicle: ${vehicle.vehicleDescription}\nFleet #: ${vehicle.fleetNumber}\nReg: ${vehicle.regPlate}\n\nCheck console for API connection details.`);
    
    // Test Geotab API call
    try {
        geotabApi.call("Get", {
            typeName: "Device",
            search: { name: vehicle.regPlate }
        }).then(devices => {
            logDebug("Device search successful", devices.length + " devices found");
            if (devices.length > 0) {
                logDebug("Matching device found", devices[0]);
            }
        }).catch(error => {
            logDebug("Device search failed", error.message);
        });
    } catch (error) {
        logDebug("Geotab API call failed", error.message);
    }
}

function testRenew(vehicleIndex) {
    const vehicle = fleetData[vehicleIndex];
    logDebug("=== TESTING RENEWAL PROCESS ===");
    logDebug("Vehicle selected for renewal", vehicle.vehicleDescription);
    
    alert(`Testing renewal for:\n\nVehicle: ${vehicle.vehicleDescription}\nCurrent RUC: ${formatNumber(vehicle.rucPaidTo)} km\n\nRenewal options:\n+1000km: ${formatNumber(vehicle.rucPaidTo + 1000)}\n+5000km: ${formatNumber(vehicle.rucPaidTo + 5000)}\n+10000km: ${formatNumber(vehicle.rucPaidTo + 10000)}`);
}

function showError(message) {
    logDebug("Showing error to user", message);
    
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    if (errorContainer && errorMessage) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
    }
}

function copyDebugLog() {
    const logText = debugLog.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
        alert('Debug log copied to clipboard!\n\nPaste this in your message to show exactly what happened.');
    }).catch(err => {
        console.error('Copy failed:', err);
        alert('Copy failed. Please manually select the debug output.');
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(Math.round(num));
}

// Geotab add-in lifecycle functions
function focus() {
    logDebug("Add-in gained focus");
}

function blur() {
    logDebug("Add-in lost focus");
}

// Global error handler
window.addEventListener('error', function(event) {
    logDebug("GLOBAL ERROR CAUGHT", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

logDebug("=== DEBUG MAIN.JS LOADED SUCCESSFULLY ===");
