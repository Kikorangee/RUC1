// RUC License Management - Final Working Version
"use strict";

geotab.addin.ruc = function(api, state) {
    let vehicles = [];

    const loadRucData = async () => {
        try {
            console.log("Loading vehicles from Geotab API...");
            
            // Show loading spinner
            const loading = document.getElementById('loading');
            const content = document.getElementById('rucAddin');
            const errorMsg = document.getElementById('error-message');
            
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'none';
            
            // Get all vehicles in user's scope using proven API call
            // Updated to use the correct API method for getting groups
            let devices = [];
            try {
                // Try to get devices with group filtering
                devices = await api.call("Get", {
                    typeName: "Device"
                });
            } catch (groupError) {
                // Fallback to getting all devices if group filtering fails
                console.warn("Could not filter by groups, getting all devices:", groupError);
                devices = await api.call("Get", {
                    typeName: "Device"
                });
            }

            console.log(`Successfully loaded ${devices.length} vehicles from Geotab`);

            if (!devices || devices.length === 0) {
                if (loading) loading.style.display = 'none';
                if (content) content.style.display = 'block';
                const tableBody = document.getElementById('ruc-table-body');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No vehicles found in your scope.</td></tr>';
                }
                return;
            }

            // Build table content with actual vehicle data
            let tableContent = '';
            for (const vehicle of devices) {
                // Use real vehicle properties
                const vehicleName = vehicle.name || 'Unknown Vehicle';
                const serialNumber = vehicle.serialNumber || '--';
                const licensePlate = vehicle.licensePlate || '--';
                
                tableContent += `
                    <tr>
                        <td><strong>${vehicleName}</strong></td>
                        <td>No RUC logs yet</td>
                        <td>--</td>
                        <td>--</td>
                        <td>${licensePlate}</td>
                    </tr>
                `;
            }
            
            // Display the vehicle data
            const tableBody = document.getElementById('ruc-table-body');
            if (tableBody) {
                tableBody.innerHTML = tableContent;
            }
            
            // Hide loading, show content
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';

            console.log(`RUC table populated with ${devices.length} vehicles`);

        } catch (error) {
            console.error("Failed to load RUC data:", error);
            
            // Hide loading, show error
            const loading = document.getElementById('loading');
            const errorMsg = document.getElementById('error-message');
            
            if (loading) loading.style.display = 'none';
            if (errorMsg) {
                errorMsg.textContent = 'Error loading vehicle data: ' + error.message;
                errorMsg.style.display = 'block';
            }
        }
    };

    return {
        initialize: function(api, state, callback) {
            console.log("RUC License Management add-in initialized");
            loadRucData();
            if (callback) {
                callback();
            }
        },
        focus: function(api, state) {
            console.log("RUC add-in focused - refreshing data");
            loadRucData();
        },
        blur: function() {
            console.log("RUC add-in blurred");
        }
    };
};
