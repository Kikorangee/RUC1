// RUC License Management - Direct Working Solution
"use strict";

let vehicles = [];
let api = null;

function initialize(geotabApi, state, callback) {
    api = geotabApi;
    console.log("RUC License Management starting...");
    
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
            </div>
        </div>
    `;
    
    // Load vehicles immediately
    loadVehicles();
    if (callback) callback();
}

function loadVehicles() {
    const status = document.getElementById('status');
    const vehicleList = document.getElementById('vehicle-list');
    
    status.textContent = 'Loading vehicle data...';
    
    // Load directly from GitHub Pages
    fetch('https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json')
        .then(response => response.json())
        .then(data => {
            vehicles = data;
            status.textContent = 'Fleet loaded successfully';
            status.style.color = '#28a745';
            
            // Update counts
            document.getElementById('total').textContent = vehicles.length;
            document.getElementById('active').textContent = vehicles.length;
            
            // Clear loading message
            vehicleList.innerHTML = '';
            
            // Add all vehicles to table
            vehicles.forEach((vehicle, i) => {
                const row = vehicleList.insertRow();
                
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
        })
        .catch(error => {
            status.textContent = 'Error loading data: ' + error.message;
            status.style.color = '#dc3545';
        });
}

function getReading(index) {
    const vehicle = vehicles[index];
    alert(`Getting odometer reading for ${vehicle.vehicleDescription} (${vehicle.regPlate})`);
}

function renew(index) {
    const vehicle = vehicles[index];
    const current = vehicle.rucPaidTo;
    alert(`Renew RUC for ${vehicle.vehicleDescription}\n\nCurrent: ${formatKm(current)}\nOptions:\n+1000km: ${formatKm(current + 1000)}\n+5000km: ${formatKm(current + 5000)}\n+10000km: ${formatKm(current + 10000)}`);
}

function formatKm(km) {
    if (!km) return '--';
    return new Intl.NumberFormat().format(Math.round(km)) + ' km';
}

function focus() { console.log('Add-in focused'); }
function blur() { console.log('Add-in blurred'); }
