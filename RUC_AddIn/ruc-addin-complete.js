// RUC License Management - Complete Implementation
"use strict";

geotab.addin.ruc = function(api, state) {
    let vehicles = [];
    let rucData = [];
    let geotabDevices = [];
    let renewalHistory = {};

    // Load RUC data from JSON file
    const loadRucDataFromFile = async () => {
        try {
            // Use full GitHub Pages URL when running in MyGeotab with cache busting
            const timestamp = new Date().getTime();
            const dataUrl = `https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json?v=${timestamp}`;
            console.log(`Loading RUC data from: ${dataUrl}`);
            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            rucData = await response.json();
            console.log(`Successfully loaded ${rucData.length} vehicles from RUC_Data.json`);
            return rucData;
        } catch (error) {
            console.error('Error loading RUC data:', error);
            // Fallback to empty array if file can't be loaded
            rucData = [];
            return [];
        }
    };

    // Load renewal history from localStorage
    const loadRenewalHistory = () => {
        try {
            const stored = localStorage.getItem('ruc_renewal_history');
            renewalHistory = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading renewal history:', error);
            renewalHistory = {};
        }
    };

    // Save renewal history to localStorage
    const saveRenewalHistory = () => {
        try {
            localStorage.setItem('ruc_renewal_history', JSON.stringify(renewalHistory));
        } catch (error) {
            console.error('Error saving renewal history:', error);
        }
    };

    // Get current odometer reading for a device
    const getCurrentOdometer = async (deviceId) => {
        try {
            // Try multiple diagnostic IDs for odometer data
            const diagnosticIds = [
                "DiagnosticOdometerId",
                "DiagnosticOdometerAdjustmentId", 
                "DiagnosticEngineOdometerAdjustmentId",
                "DiagnosticEngineOdometerId"
            ];

            for (const diagnosticId of diagnosticIds) {
                try {
                    const statusData = await api.call("Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: deviceId },
                            diagnosticSearch: { id: diagnosticId }
                        },
                        resultsLimit: 1
                    });

                    if (statusData && statusData.length > 0 && statusData[0].data) {
                        const odometerKm = Math.round(statusData[0].data / 1000);
                        console.log(`Got odometer for device ${deviceId}: ${odometerKm} km using ${diagnosticId}`);
                        return odometerKm;
                    }
                } catch (diagError) {
                    console.warn(`Failed to get odometer with ${diagnosticId}:`, diagError);
                    continue;
                }
            }

            // If no diagnostic worked, try getting the latest StatusData without specific diagnostic
            const allStatusData = await api.call("Get", {
                typeName: "StatusData",
                search: {
                    deviceSearch: { id: deviceId }
                },
                resultsLimit: 10
            });

            // Look for any odometer-related data
            const odometerData = allStatusData.find(data => 
                data.diagnostic && 
                data.diagnostic.name && 
                data.diagnostic.name.toLowerCase().includes('odometer') &&
                data.data > 0
            );

            if (odometerData) {
                const odometerKm = Math.round(odometerData.data / 1000);
                console.log(`Found odometer data for device ${deviceId}: ${odometerKm} km`);
                return odometerKm;
            }

            console.warn(`No odometer data available for device ${deviceId}`);
            return null; // Return null instead of 0 to indicate no data

        } catch (error) {
            console.error(`Error getting odometer for device ${deviceId}:`, error);
            return null; // Return null to indicate error
        }
    };

    // Calculate RUC status
    const calculateRucStatus = (currentOdometer, rucPaidTo) => {
        const remaining = rucPaidTo - currentOdometer;
        
        if (remaining <= 0) {
            return { status: 'critical', remaining: 0, badge: 'EXPIRED' };
        } else if (remaining <= 2000) {
            return { status: 'warning', remaining, badge: 'RENEWAL DUE' };
        } else {
            return { status: 'ok', remaining, badge: 'OK' };
        }
    };

    // Match Geotab devices with RUC data
    const matchDevicesWithRucData = (devices, rucData) => {
        const matched = [];
        
        for (const rucVehicle of rucData) {
            // Try to find matching Geotab device by registration plate
            const matchedDevice = devices.find(device => 
                device.licensePlate && 
                device.licensePlate.toLowerCase() === rucVehicle.regPlate.toLowerCase()
            );

            matched.push({
                ...rucVehicle,
                geotabDevice: matchedDevice,
                hasGeotabData: !!matchedDevice
            });
        }

        return matched;
    };

    // Update summary cards
    const updateSummaryCards = (vehicles) => {
        const totalElement = document.getElementById('total');
        const activeElement = document.getElementById('active');
        const alertsElement = document.querySelector('.alert-card .card-number');

        if (totalElement) {
            totalElement.textContent = vehicles.length;
        }

        const activeCount = vehicles.filter(v => v.rucStatus && v.rucStatus.status !== 'critical').length;
        if (activeElement) {
            activeElement.textContent = activeCount;
        }

        const alertCount = vehicles.filter(v => v.rucStatus && (v.rucStatus.status === 'critical' || v.rucStatus.status === 'warning')).length;
        if (alertsElement) {
            alertsElement.textContent = alertCount;
        }
    };

    // Show renewal modal
    const showRenewalModal = (vehicle) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Renew RUC License</h3>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Vehicle:</strong> ${vehicle.vehicleDescription}</p>
                    <p><strong>Registration:</strong> ${vehicle.regPlate}</p>
                    <p><strong>Current Odometer:</strong> ${vehicle.currentOdometer ? vehicle.currentOdometer.toLocaleString() : 'Unknown'} km</p>
                    <p><strong>Current RUC Paid To:</strong> ${vehicle.rucPaidTo.toLocaleString()} km</p>
                    
                    <div class="renewal-options">
                        <h4>Select License Duration:</h4>
                        <div class="option-cards">
                            <div class="option-card" data-km="1000">
                                <div class="option-title">1,000 km</div>
                                <div class="option-price">~$76</div>
                            </div>
                            <div class="option-card" data-km="5000">
                                <div class="option-title">5,000 km</div>
                                <div class="option-price">~$380</div>
                            </div>
                            <div class="option-card" data-km="10000">
                                <div class="option-title">10,000 km</div>
                                <div class="option-price">~$760</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="renewal-summary hidden">
                        <p><strong>New RUC Paid To:</strong> <span id="new-ruc-to"></span> km</p>
                        <p><strong>Estimated Cost:</strong> <span id="estimated-cost"></span></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn-primary" id="confirm-renewal" disabled>Confirm Renewal</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle option selection
        const optionCards = modal.querySelectorAll('.option-card');
        const confirmBtn = modal.querySelector('#confirm-renewal');
        const renewalSummary = modal.querySelector('.renewal-summary');
        const newRucTo = modal.querySelector('#new-ruc-to');
        const estimatedCost = modal.querySelector('#estimated-cost');

        let selectedKm = 0;

        optionCards.forEach(card => {
            card.addEventListener('click', () => {
                optionCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                selectedKm = parseInt(card.dataset.km);
                const newTotal = vehicle.rucPaidTo + selectedKm;
                const cost = selectedKm * 0.076; // Approximate RUC rate

                newRucTo.textContent = newTotal.toLocaleString();
                estimatedCost.textContent = `$${cost.toFixed(2)}`;
                
                renewalSummary.classList.remove('hidden');
                confirmBtn.disabled = false;
            });
        });

        // Handle renewal confirmation
        confirmBtn.addEventListener('click', () => {
            if (selectedKm > 0) {
                // Update vehicle data
                vehicle.rucPaidTo += selectedKm;
                
                // Save to renewal history
                const renewalRecord = {
                    date: new Date().toISOString(),
                    vehicleId: vehicle.fleetNumber,
                    regPlate: vehicle.regPlate,
                    kmAdded: selectedKm,
                    newTotal: vehicle.rucPaidTo,
                    cost: selectedKm * 0.076
                };

                if (!renewalHistory[vehicle.regPlate]) {
                    renewalHistory[vehicle.regPlate] = [];
                }
                renewalHistory[vehicle.regPlate].push(renewalRecord);
                saveRenewalHistory();

                // Refresh the display
                loadAndDisplayData();
                
                modal.remove();
                
                // Show success message
                showSuccessMessage(`RUC license renewed for ${vehicle.regPlate}. New total: ${vehicle.rucPaidTo.toLocaleString()} km`);
            }
        });
    };

    // Show success message
    const showSuccessMessage = (message) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'error-container';
        successDiv.innerHTML = `
            <div class="error-content" style="background: #d4edda; border-color: #c3e6cb; color: #155724;">
                <h3>Success!</h3>
                <p>${message}</p>
                <button class="btn-dismiss" onclick="this.closest('.error-container').remove()">Dismiss</button>
            </div>
        `;
        document.body.appendChild(successDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    };

    // Main data loading and display function
    const loadAndDisplayData = async () => {
        try {
            console.log("Loading RUC License Management data...");
            
            // Show loading spinner
            const loading = document.getElementById('loading');
            const content = document.getElementById('rucAddin');
            const errorMsg = document.getElementById('error-message');
            
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'none';

            // Update status
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = 'Loading vehicle data...';
                statusElement.className = 'status-connected';
            }

            // Load RUC data and renewal history
            await loadRucDataFromFile();
            loadRenewalHistory();

            // Get Geotab devices
            try {
                geotabDevices = await api.call("Get", {
                    typeName: "Device"
                });
                console.log(`Loaded ${geotabDevices.length} devices from Geotab API`);
            } catch (error) {
                console.warn("Could not load Geotab devices:", error);
                geotabDevices = [];
            }

            // Match RUC data with Geotab devices
            vehicles = matchDevicesWithRucData(geotabDevices, rucData);

            // Get current odometer readings for matched vehicles
            for (const vehicle of vehicles) {
                if (vehicle.hasGeotabData) {
                    try {
                        vehicle.currentOdometer = await getCurrentOdometer(vehicle.geotabDevice.id);
                        if (vehicle.currentOdometer === null) {
                            console.warn(`No odometer data available for ${vehicle.regPlate}, marking as no data`);
                            vehicle.hasOdometerData = false;
                            vehicle.currentOdometer = 0; // Set to 0 for calculation but mark as no data
                        } else {
                            vehicle.hasOdometerData = true;
                        }
                    } catch (error) {
                        console.warn(`Could not get odometer for ${vehicle.regPlate}:`, error);
                        vehicle.currentOdometer = 0;
                        vehicle.hasOdometerData = false;
                    }
                } else {
                    console.warn(`No Geotab device found for ${vehicle.regPlate}`);
                    vehicle.currentOdometer = 0;
                    vehicle.hasOdometerData = false;
                }

                // Calculate RUC status
                vehicle.rucStatus = calculateRucStatus(vehicle.currentOdometer, vehicle.rucPaidTo);
            }

            console.log(`Processed ${vehicles.length} vehicles with RUC data`);

            // Update summary cards
            updateSummaryCards(vehicles);

            // Update status
            if (statusElement) {
                statusElement.textContent = `Connected to Geotab API - ${vehicles.length} vehicles loaded`;
                statusElement.className = 'status-connected';
            }

            // Build table content
            const tableBody = document.getElementById('ruc-table-body');
            if (tableBody) {
                let tableContent = '';
                
                for (const vehicle of vehicles) {
                    const statusClass = `status-${vehicle.rucStatus.status}`;
                    const statusText = vehicle.rucStatus.badge;
                    const remainingKm = vehicle.rucStatus.remaining;
                    
                    tableContent += `
                        <tr>
                            <td><strong>${vehicle.vehicleDescription}</strong></td>
                            <td>${vehicle.fleetNumber}</td>
                            <td><strong>${vehicle.regPlate}</strong></td>
                            <td style="text-align: right;">
                                ${vehicle.rucPaidTo.toLocaleString()} km
                            </td>
                            <td style="text-align: right;">
                                ${!vehicle.hasOdometerData ? 
                                    '<span style="color: #ffc107; font-weight: bold;">NO ODOMETER DATA</span>' :
                                    remainingKm > 0 ? `${remainingKm.toLocaleString()} km` : '<span style="color: #dc3545; font-weight: bold;">EXPIRED</span>'
                                }
                            </td>
                            <td style="text-align: center;">
                                <span class="status-badge ${statusClass}">${statusText}</span>
                                ${vehicle.rucStatus.status !== 'ok' ? 
                                    `<br><button class="btn-renew" onclick="window.renewLicense('${vehicle.regPlate}')" style="margin-top: 8px;">Renew</button>` : 
                                    ''
                                }
                            </td>
                        </tr>
                    `;
                }
                
                tableBody.innerHTML = tableContent;
            }

            // Hide loading, show content
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';

            console.log("RUC License Management data loaded successfully");

        } catch (error) {
            console.error("Failed to load RUC data:", error);
            
            // Hide loading, show error
            const loading = document.getElementById('loading');
            const errorMsg = document.getElementById('error-message');
            const statusElement = document.getElementById('status');
            
            if (loading) loading.style.display = 'none';
            if (errorMsg) {
                errorMsg.textContent = 'Error loading RUC data: ' + error.message;
                errorMsg.style.display = 'block';
            }
            if (statusElement) {
                statusElement.textContent = 'Error loading data';
                statusElement.className = 'status-disconnected';
            }
        }
    };

    // Global function for renewal button clicks
    window.renewLicense = (regPlate) => {
        const vehicle = vehicles.find(v => v.regPlate === regPlate);
        if (vehicle) {
            showRenewalModal(vehicle);
        }
    };

    // Global function for refresh button
    window.refreshRucData = () => {
        loadAndDisplayData();
    };

    // Return the add-in interface
    return {
        initialize: function(api, state, callback) {
            console.log("RUC License Management add-in initialized");
            loadAndDisplayData();
            if (callback) {
                callback();
            }
        },
        focus: function(api, state) {
            console.log("RUC add-in focused - refreshing data");
            loadAndDisplayData();
        },
        blur: function() {
            console.log("RUC add-in blurred");
        }
    };
};
