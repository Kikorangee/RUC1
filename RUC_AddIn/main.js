// RUC License Management - Clean Production Version
"use strict";

let vehicles = [];
let api = null;

function initialize(geotabApi, state, callback) {
    api = geotabApi;
    console.log("RUC License Management starting...");
    
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
            </div>
        </div>
    `;
    
    loadData();
    if (callback) callback();
}

function loadData() {
    const status = document.getElementById('status');
    status.textContent = 'Fetching vehicle data...';
    
    fetch('https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json')
        .then(response => {
            console.log('Response:', response.status);
            if (!response.ok) throw new Error('Failed to load data');
            return response.json();
        })
        .then(data => {
            console.log('Loaded', data.length, 'vehicles');
            vehicles = data;
            
            status.textContent = 'Fleet data loaded successfully';
            status.style.color = '#28a745';
            
            showVehicles();
            updateCounts();
        })
        .catch(error => {
            console.error('Error:', error);
            status.textContent = 'Error: ' + error.message;
            status.style.color = '#dc3545';
        });
}

function showVehicles() {
    const tbody = document.getElementById('vehicle-list');
    tbody.innerHTML = '';
    
    vehicles.forEach((vehicle, i) => {
        const row = tbody.insertRow();
        
        const cellVehicle = row.insertCell(0);
        cellVehicle.textContent = vehicle.vehicleDescription || 'Unknown';
        cellVehicle.style.padding = '15px';
        cellVehicle.style.borderBottom = '1px solid #dee2e6';
        
        const cellFleet = row.insertCell(1);
        cellFleet.textContent = vehicle.fleetNumber || '--';
        cellFleet.style.padding = '15px';
        cellFleet.style.borderBottom = '1px solid #dee2e6';
        
        const cellReg = row.insertCell(2);
        cellReg.textContent = vehicle.regPlate || '--';
        cellReg.style.padding = '15px';
        cellReg.style.borderBottom = '1px solid #dee2e6';
        cellReg.style.fontWeight = 'bold';
        
        const cellRUC = row.insertCell(3);
        cellRUC.textContent = formatKm(vehicle.rucPaidTo);
        cellRU
