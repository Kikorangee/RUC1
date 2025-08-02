// RUC License Management - GeoTab API Integration
"use strict";

let vehicles = [];
let api = null;
let state = null;

function initialize(geotabApi, stateObj, callback) {
    api = geotabApi;
    state = stateObj;
    console.log("RUC License Management starting...");
    console.log("API object:", api);
    console.log("State object:", state);
    
    // Create interface immediately
    document.body.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif; background: #f8f9fa; min-height: 100vh;">
            <div style="max-width: 1200px; margin: 0 auto;">
                <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">RUC License Management</h1>
                
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #495057;">Status: <span id="status" style="color: #007bff;">Loading...</span></h3>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                        <h4 style="margin: 0 0 10px 0; color: #6c757d;">Total Vehicles</h4>
                        <div id="total" style="font-size: 24px; font-weight: bold; color: #28a745;">--</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                        <h4 style="margin: 0 0 10px 0; color: #6c757d;">Active Licenses</h4>
                        <div id="active" style="font-size: 24px; font-weight: bold; color: #007bff;">--</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
                        <h4 style="margin: 0 0 10px 0; color: #6c757d;">Alerts</h4>
                        <div style="font-size: 24px; font-weight: bold; color: #ffc107;">0</div>
                    </div>
                </div>
                
                <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid #dee2e6;">
                        <h3 style="margin: 0; color: #495057;">Vehicle Fleet</h3>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8f9fa;">
                                <tr>
                                    <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Vehicle</th>
                                    <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Fleet #</th>
                                    <th style="padding: 15px; text-align: left; border-bottom: 2px solid #dee2e6;">Registration</th>
                                    <th style="padding: 15px; text-align: right; border-bottom: 2px solid #dee2e6;">RUC Paid To</th>
                                    <th style="padding: 15px; text-align: center; border-bottom: 2px solid #dee2e6;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="vehicle-list">
                                <tr><td colspan="5" style="padding: 40px; text-align: center; color: #6c757d;">Loading vehicles...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div id="error-message" style="display: none; background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 20px;"></div>
            </div>
        </div>
    `;
    
    // Load vehicles from GeoTab API
    loadVehiclesFromGeotab();
    if (callback) callback();
}

async function loadVehiclesFromGeotab() {
    const status = document.getElementById('status');
    const vehicleList = document.getElementById('vehicle-list');
    const errorMsg = document.getElementById('error-message');
    
    status.textContent = 'Loading vehicle data from GeoTab API...';
    status.style.color = '#007bff';
    errorMsg.style.display = 'none';
    
    try {
        console.log("Getting devices from Geotab API...");
        console.log("User groups:", state.getGroups());
        
        // Get all vehicles in user's scope using proven API call
        const devices = await api.call("Get", {
            typeName: "Device",
            search: {
                groups: state.getGroups()
            }
        });

        console.log(`Successfully loaded ${devices.length} vehicles from Geotab`);
        status.textContent = 'Fleet loaded successfully from GeoTab API';
        status.style.color = '#28a745';
        
        if (!devices || devices.length === 0) {
            status.textContent = 'No vehicles found in your scope';
            status.style.color = '#ffc107';
            vehicleList.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #6c757d;">No vehicles found in your scope.</td></tr>';
            return;
        }
        
        // Update counts
        document.getElementById('total').textContent = devices.length;
        document.getElementById('active').textContent = devices.length;
        
        // Clear loading message
        vehicleList.innerHTML = '';
        
        // Add all vehicles to table
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
    } catch (error) {
        console.error("Failed to load RUC data:", error);
        status.textContent = 'Error loading data: ' + error.message;
        status.style.color = '#dc3545';
        errorMsg.textContent = 'Error loading data from GeoTab API: ' + error.message;
        errorMsg.style.display = 'block';
        vehicleList.innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #dc3545;">Error loading vehicle data. Please check console for details.</td></tr>';
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

function formatKm(km) {
    if (!km) return '--';
    return new Intl.NumberFormat().format(Math.round(km)) + ' km';
}

function focus() { 
    console.log('Add-in focused - refreshing data');
    // In a real implementation, this would refresh the data from the GeoTab API
}

function blur() { 
    console.log('Add-in blurred');
}
