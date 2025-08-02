// RUC License Management - GeoTab API Integration
"use strict";

let api = null;
let state = null;

// Initialize function - called by GeoTab when the add-in is loaded
function initialize(geotabApi, stateObj, callback) {
    console.log("RUC License Management initialize function called");
    console.log("API object:", geotabApi);
    console.log("State object:", stateObj);
    
    // Store API and state references
    api = geotabApi;
    state = stateObj;
    
    // Load vehicles from GeoTab API
    loadVehiclesFromGeotab();
    
    // Call the callback to indicate initialization is complete
    if (callback) {
        callback();
    }
}

// Focus function - called when the add-in gains focus
function focus(geotabApi, stateObj) {
    console.log("RUC License Management focus function called");
    // Refresh data when user returns to the add-in
    if (api) {
        loadVehiclesFromGeotab();
    }
}

// Blur function - called when the add-in loses focus
function blur() {
    console.log("RUC License Management blur function called");
    // Could pause updates here if needed
}

async function loadVehiclesFromGeotab() {
    const statusElement = document.getElementById('status');
    const vehicleList = document.getElementById('vehicle-list');
    const errorMsg = document.getElementById('error-message');
    const totalElement = document.getElementById('total');
    const activeElement = document.getElementById('active');
    
    // Show loading status
    if (statusElement) {
        statusElement.textContent = 'Loading vehicle data from Geotab API...';
        statusElement.style.color = '#007bff';
    }
    
    // Hide error message
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
    
    try {
        console.log("Getting devices from Geotab API...");
        
        // Get all vehicles in user's scope using proven API call
        // Note: In the new API approach, we don't use state.getGroups()
        const devices = await api.call("Get", {
            typeName: "Device"
            // Removed groups search as it's not needed in this context
        });

        console.log(`Successfully loaded ${devices.length} vehicles from Geotab`);
        
        if (statusElement) {
            statusElement.textContent = 'Fleet loaded successfully from Geotab API';
            statusElement.style.color = '#28a745';
        }
        
        if (!devices || devices.length === 0) {
            if (statusElement) {
                statusElement.textContent = 'No vehicles found in your scope';
                statusElement.style.color = '#ffc107';
            }
            
            if (vehicleList) {
                vehicleList.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #6c757d;">No vehicles found in your scope.</td></tr>';
            }
            return;
        }
        
        // Update counts
        if (totalElement) {
            totalElement.textContent = devices.length;
        }
        
        if (activeElement) {
            activeElement.textContent = devices.length;
        }
        
        // Clear loading message
        if (vehicleList) {
            vehicleList.innerHTML = '';
        }
        
        // Add all vehicles to table
        if (vehicleList) {
            devices.forEach((device, i) => {
                const row = vehicleList.insertRow();
                
                const cellVehicle = row.insertCell(0);
                cellVehicle.textContent = device.name || 'Unknown Vehicle';
                cellVehicle.style.padding = '15px';
                cellVehicle.style.borderBottom = '1px solid #dee2e6';
                
                const cellFleet = row.insertCell(1);
                cellFleet.textContent = device.serialNumber || '--';
                cellFleet.style.padding = '15px';
                cellFleet.style.borderBottom = '1px solid #dee2e6';
                
                const cellReg = row.insertCell(2);
                cellReg.textContent = device.licensePlate || '--';
                cellReg.style.padding = '15px';
                cellReg.style.borderBottom = '1px solid #dee2e6';
                cellReg.style.fontWeight = 'bold';
                
                const cellRUC = row.insertCell(3);
                cellRUC.textContent = 'No RUC logs yet'; // Placeholder since we don't have RUC data yet
                cellRUC.style.padding = '15px';
                cellRUC.style.borderBottom = '1px solid #dee2e6';
                cellRUC.style.textAlign = 'right';
                cellRUC.style.color = '#28a745';
                cellRUC.style.fontWeight = 'bold';
                
                const cellActions = row.insertCell(4);
                cellActions.innerHTML = `
                    <button onclick="getReading(${i})" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">Get Reading</button>
                    <button onclick="renew(${i})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">Renew</button>
                `;
                cellActions.style.padding = '15px';
                cellActions.style.borderBottom = '1px solid #dee2e6';
                cellActions.style.textAlign = 'center';
                
                if (i % 2 === 1) {
                    row.style.backgroundColor = '#f8f9fa';
                }
            });
        }
    } catch (error) {
        console.error("Failed to load RUC data:", error);
        
        if (statusElement) {
            statusElement.textContent = 'Error loading data: ' + error.message;
            statusElement.style.color = '#dc3545';
        }
        
        if (errorMsg) {
            errorMsg.textContent = 'Error loading data from Geotab API: ' + error.message;
            errorMsg.style.display = 'block';
        }
        
        if (vehicleList) {
            vehicleList.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #dc3545;">Error loading vehicle data. Please check console for details.</td></tr>';
        }
    }
}

function getReading(index) {
    alert(`Getting odometer reading for vehicle ${index}`);
    // In a real implementation, this would call the GeoTab API to get the current odometer reading
}

function renew(index) {
    alert(`Renew RUC for vehicle ${index}`);
    // In a real implementation, this would handle RUC renewal
}

// This is needed for the new GeoTab add-in approach
window.initialize = initialize;
window.focus = focus;
window.blur = blur;
window.getReading = getReading;
window.renew = renew;
