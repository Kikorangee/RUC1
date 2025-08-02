// IMMEDIATE FIX - Test version that will work
"use strict";
function initialize(api, state, callback) {
    console.log("=== IMMEDIATE TEST VERSION ===");
    
    document.body.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #28a745;">RUC License Management - IMMEDIATE TEST</h1>
            <div id="status" style="padding: 15px; background: #e9ecef; border-radius: 5px; margin: 15px 0; font-weight: bold;">
                Starting data load test...
            </div>
            <div id="results"></div>
        </div>
    `;
    
    testDataLoad();
    if (callback) callback();
}
function testDataLoad() {
    const status = document.getElementById('status');
    const results = document.getElementById('results');
    
    status.textContent = "Step 1: Connecting to GitHub Pages...";
    status.style.background = "#fff3cd";
    
    fetch('https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json', {
        method: 'GET',
        cache: 'no-cache'
    })
    .then(response => {
        console.log("Response status:", response.status);
        status.textContent = `Step 2: Response received (${response.status})`;
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    })
    .then(vehicles => {
        console.log("Vehicles loaded:", vehicles.length);
        
        status.textContent = `SUCCESS: ${vehicles.length} vehicles loaded!`;
        status.style.background = "#d4edda";
        status.style.color = "#155724";
        
        let html = `
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3>SUCCESS: Data Loading Works!</h3>
                <p><strong>Total Vehicles:</strong> ${vehicles.length}</p>
                <p><strong>Data Source:</strong> GitHub Pages RUC_Data.json</p>
                <p><strong>First Vehicle:</strong> ${vehicles[0].vehicleDescription}</p>
                <p><strong>Test Result:</strong> Your data loads perfectly!</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #343a40; color: white;">
                        <th style="padding: 12px; text-align: left;">Vehicle</th>
                        <th style="padding: 12px; text-align: left;">Fleet #</th>
                        <th style="padding: 12px; text-align: left;">Registration</th>
                        <th style="padding: 12px; text-align: right;">RUC Paid To</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Show first 20 vehicles
        for (let i = 0; i < Math.min(20, vehicles.length); i++) {
            const v = vehicles[i];
            const bg = i % 2 === 0 ? '#f8f9fa' : 'white';
            html += `
                <tr style="background: ${bg};">
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${v.vehicleDescription || 'Unknown'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${v.fleetNumber || '--'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">${v.regPlate || '--'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right; color: #28a745; font-weight: bold;">${v.rucPaidTo ? v.rucPaidTo.toLocaleString() + ' km' : '--'}</td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
            <div style="text-align: center; margin: 20px 0; padding: 15px; background: #e7f3ff; border-radius: 5px;">
                <strong>Showing first 20 of ${vehicles.length} vehicles</strong><br>
                <small>Data loading test completed successfully!</small>
            </div>
        `;
        
        results.innerHTML = html;
        
    })
    .catch(error => {
        console.error("Test failed:", error);
        
        status.textContent = `FAILED: ${error.message}`;
        status.style.background = "#f8d7da";
        status.style.color = "#721c24";
        
        results.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Test Failed</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>This tells us exactly what's wrong with data loading</strong></p>
            </div>
        `;
    });
}
function focus() { console.log('Test add-in focused'); }
function blur() { console.log('Test add-in blurred'); }
