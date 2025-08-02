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
            
            // Check if response exists and is ok
            if (!response) {
                throw new Error('No response received from server');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid data format received - expected array');
            }
            
            rucData = data;
            console.log(`Successfully loaded ${rucData.length} vehicles from RUC_Data.json`);
            return rucData;
            
        } catch (error) {
            console.error('Error loading RUC data:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
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
            console.log(`🔍 Attempting to get odometer for device ${deviceId}...`);
            
            // Strategy 1: Try standard diagnostic IDs
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
                        console.log(`✅ Got odometer for device ${deviceId}: ${odometerKm} km using ${diagnosticId}`);
                        return odometerKm;
                    }
                } catch (diagError) {
                    console.warn(`❌ Failed to get odometer with ${diagnosticId}:`, diagError);
                    continue;
                }
            }

            // Strategy 2: Try LogRecord for odometer data (alternative data source)
            console.log(`📊 Trying LogRecord data for device ${deviceId}...`);
            try {
                const logRecords = await api.call("Get", {
                    typeName: "LogRecord",
                    search: {
                        deviceSearch: { id: deviceId }
                    },
                    resultsLimit: 10
                });

                for (const record of logRecords) {
                    if (record.odometer && record.odometer > 0) {
                        const odometerKm = Math.round(record.odometer / 1000);
                        console.log(`✅ Found odometer in LogRecord for device ${deviceId}: ${odometerKm} km`);
                        return odometerKm;
                    }
                }
            } catch (logError) {
                console.warn(`❌ LogRecord search failed for ${deviceId}:`, logError);
            }

            // Strategy 3: Try Trip data for odometer readings
            console.log(`🚗 Trying Trip data for device ${deviceId}...`);
            try {
                const trips = await api.call("Get", {
                    typeName: "Trip",
                    search: {
                        deviceSearch: { id: deviceId }
                    },
                    resultsLimit: 5
                });

                for (const trip of trips) {
                    if (trip.distance && trip.distance > 0) {
                        // Trip distance might give us recent odometer info
                        console.log(`🚗 Found trip data for device ${deviceId}: distance ${trip.distance}m`);
                        // This is just distance, not total odometer, so continue searching
                    }
                }
            } catch (tripError) {
                console.warn(`❌ Trip search failed for ${deviceId}:`, tripError);
            }

            // Strategy 4: Get ALL StatusData and search comprehensively
            console.log(`🔍 Comprehensive StatusData search for device ${deviceId}...`);
            const allStatusData = await api.call("Get", {
                typeName: "StatusData",
                search: {
                    deviceSearch: { id: deviceId }
                },
                resultsLimit: 100 // Increased limit to find more data
            });

            console.log(`📊 Found ${allStatusData.length} status records for device ${deviceId}`);

            // Look for any odometer-related data with various patterns
            const odometerPatterns = [
                'odometer', 'distance', 'mileage', 'km', 'mile', 'total', 'cumulative',
                'engine', 'vehicle', 'trip', 'counter', 'meter', 'reading'
            ];

            // Sort by most recent data first
            allStatusData.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

            for (const data of allStatusData) {
                if (data.diagnostic && data.diagnostic.name && data.data > 0) {
                    const diagName = data.diagnostic.name.toLowerCase();
                    
                    // Check if diagnostic name contains odometer-related terms
                    for (const pattern of odometerPatterns) {
                        if (diagName.includes(pattern)) {
                            let odometerKm;
                            
                            // More sophisticated unit detection
                            if (data.data > 10000000) {
                                // Very large number - likely in millimeters or smaller units
                                odometerKm = Math.round(data.data / 1000000);
                            } else if (data.data > 1000000) {
                                // Large number - likely in meters
                                odometerKm = Math.round(data.data / 1000);
                            } else if (data.data > 100000) {
                                // Medium-large number - likely already in km
                                odometerKm = Math.round(data.data);
                            } else if (data.data > 1000) {
                                // Medium number - could be km or need conversion
                                odometerKm = Math.round(data.data);
                            } else {
                                // Small number - might be in thousands of km
                                odometerKm = Math.round(data.data * 1000);
                            }
                            
                            // Sanity check - odometer should be reasonable (0-1M km)
                            if (odometerKm > 0 && odometerKm < 1000000) {
                                console.log(`✅ Found odometer data for device ${deviceId}: ${odometerKm} km using diagnostic "${data.diagnostic.name}" (ID: ${data.diagnostic.id}, Value: ${data.data})`);
                                return odometerKm;
                            }
                        }
                    }
                }
            }

            // Strategy 5: Try DeviceStatusInfo for additional device data
            console.log(`📱 Trying DeviceStatusInfo for device ${deviceId}...`);
            try {
                const deviceStatus = await api.call("Get", {
                    typeName: "DeviceStatusInfo",
                    search: {
                        deviceSearch: { id: deviceId }
                    }
                });

                if (deviceStatus && deviceStatus.length > 0) {
                    console.log(`📱 DeviceStatusInfo found for ${deviceId}:`, deviceStatus[0]);
                }
            } catch (statusError) {
                console.warn(`❌ DeviceStatusInfo search failed for ${deviceId}:`, statusError);
            }

            // Strategy 6: Log all available diagnostics for debugging
            console.log(`📋 All available diagnostics for device ${deviceId}:`);
            allStatusData.slice(0, 20).forEach((data, index) => {
                if (data.diagnostic) {
                    console.log(`  ${index + 1}. "${data.diagnostic.name}" (ID: ${data.diagnostic.id}) = ${data.data} [${data.dateTime}]`);
                }
            });

            // Strategy 7: Get device details for additional context
            try {
                const deviceDetails = await api.call("Get", {
                    typeName: "Device",
                    search: {
                        id: deviceId
                    }
                });

                if (deviceDetails && deviceDetails.length > 0) {
                    const device = deviceDetails[0];
                    console.log(`🚛 Device ${deviceId} details:`, {
                        name: device.name,
                        serialNumber: device.serialNumber,
                        deviceType: device.deviceType?.name || 'Unknown',
                        vehicleIdentificationNumber: device.vehicleIdentificationNumber || 'N/A'
                    });
                }
            } catch (deviceError) {
                console.warn(`❌ Could not get device details for ${deviceId}:`, deviceError);
            }

            console.warn(`❌ No odometer data found for device ${deviceId} after exhaustive search`);
            return null;

        } catch (error) {
            console.error(`❌ Error getting odometer for device ${deviceId}:`, error);
            return null;
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
        
        console.log(`Attempting to match ${rucData.length} RUC vehicles with ${devices.length} Geotab devices`);
        
        // Log all Geotab device names for debugging
        console.log("Available Geotab devices:");
        devices.forEach((device, index) => {
            console.log(`  ${index + 1}. Name: "${device.name}", License: "${device.licensePlate || 'N/A'}", Serial: "${device.serialNumber || 'N/A'}", ID: "${device.id}"`);
        });
        
        // Log first 10 RUC vehicles for comparison
        console.log("First 10 RUC vehicles for comparison:");
        rucData.slice(0, 10).forEach((vehicle, index) => {
            console.log(`  ${index + 1}. Fleet #${vehicle.fleetNumber}: ${vehicle.regPlate} (${vehicle.vehicleDescription})`);
        });
        
        for (const rucVehicle of rucData) {
            let matchedDevice = null;
            
            // Strategy 1: Exact fleet number match in device name
            matchedDevice = devices.find(device => 
                device.name && device.name.includes(rucVehicle.fleetNumber.toString())
            );
            
            // Strategy 2: License plate match (fallback)
            if (!matchedDevice) {
                matchedDevice = devices.find(device => 
                    device.licensePlate && 
                    device.licensePlate.toLowerCase() === rucVehicle.regPlate.toLowerCase()
                );
            }
            
            // Strategy 3: Partial license plate match (remove spaces/hyphens)
            if (!matchedDevice) {
                const cleanRucPlate = rucVehicle.regPlate.replace(/[-\s]/g, '').toLowerCase();
                matchedDevice = devices.find(device => 
                    device.licensePlate && 
                    device.licensePlate.replace(/[-\s]/g, '').toLowerCase() === cleanRucPlate
                );
            }
            
            // Strategy 4: Check if device name contains the registration plate
            if (!matchedDevice) {
                matchedDevice = devices.find(device => 
                    device.name && 
                    device.name.toLowerCase().includes(rucVehicle.regPlate.toLowerCase())
                );
            }
            
            // Strategy 5: Check groups for fleet number or registration
            if (!matchedDevice) {
                matchedDevice = devices.find(device => 
                    device.groups && device.groups.some(group => 
                        group.name && (
                            group.name.includes(rucVehicle.fleetNumber.toString()) ||
                            group.name.toLowerCase().includes(rucVehicle.regPlate.toLowerCase())
                        )
                    )
                );
            }
            
            // Strategy 6: Serial number contains fleet number
            if (!matchedDevice) {
                matchedDevice = devices.find(device => 
                    device.serialNumber && 
                    device.serialNumber.includes(rucVehicle.fleetNumber.toString())
                );
            }
            
            // Log matching attempts for debugging
            if (matchedDevice) {
                console.log(`✓ Matched Fleet #${rucVehicle.fleetNumber} (${rucVehicle.regPlate}) with Geotab device: "${matchedDevice.name}" (License: ${matchedDevice.licensePlate || 'N/A'})`);
            } else {
                console.warn(`✗ No Geotab device found for Fleet #${rucVehicle.fleetNumber} (${rucVehicle.regPlate})`);
                
                // For debugging: show potential matches
                const potentialMatches = devices.filter(device => 
                    (device.name && device.name.toLowerCase().includes(rucVehicle.fleetNumber.toString().slice(-2))) ||
                    (device.licensePlate && device.licensePlate.toLowerCase().includes(rucVehicle.regPlate.slice(-3).toLowerCase()))
                );
                if (potentialMatches.length > 0) {
                    console.log(`  Potential matches for ${rucVehicle.regPlate}:`, potentialMatches.map(d => `"${d.name}" (${d.licensePlate || 'N/A'})`));
                }
            }

            matched.push({
                ...rucVehicle,
                geotabDevice: matchedDevice,
                hasGeotabData: !!matchedDevice
            });
        }

        const matchedCount = matched.filter(v => v.hasGeotabData).length;
        console.log(`Successfully matched ${matchedCount} out of ${rucData.length} vehicles with Geotab devices`);
        
        // If very few matches, log some examples for debugging
        if (matchedCount < rucData.length * 0.5) {
            console.warn("Low match rate detected. Sample RUC vehicles:");
            rucData.slice(0, 5).forEach(vehicle => {
                console.log(`  Fleet #${vehicle.fleetNumber}: ${vehicle.regPlate} (${vehicle.vehicleDescription})`);
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
                    // Safely access vehicle properties with fallbacks
                    const statusClass = vehicle.rucStatus ? `status-${vehicle.rucStatus.status}` : 'status-unknown';
                    const statusText = vehicle.rucStatus ? vehicle.rucStatus.badge : 'UNKNOWN';
                    const remainingKm = vehicle.rucStatus ? vehicle.rucStatus.remaining : 0;
                    const hasValidStatus = vehicle.rucStatus && vehicle.rucStatus.status;
                    
                    tableContent += `
                        <tr>
                            <td><strong>${vehicle.vehicleDescription || 'Unknown Vehicle'}</strong></td>
                            <td>${vehicle.fleetNumber || 'N/A'}</td>
                            <td><strong>${vehicle.regPlate || 'N/A'}</strong></td>
                            <td style="text-align: right;">
                                ${vehicle.rucPaidTo ? vehicle.rucPaidTo.toLocaleString() : '0'} km
                            </td>
                            <td style="text-align: right;">
                                ${!vehicle.hasOdometerData ? 
                                    '<span style="color: #ffc107; font-weight: bold;">NO ODOMETER DATA</span>' :
                                    remainingKm > 0 ? `${remainingKm.toLocaleString()} km` : '<span style="color: #dc3545; font-weight: bold;">EXPIRED</span>'
                                }
                            </td>
                            <td style="text-align: center;">
                                <span class="status-badge ${statusClass}">${statusText}</span>
                                <br>
                                <div style="margin-top: 8px;">
                                    ${vehicle.hasGeotabData ? 
                                        `<button class="btn-refresh-odometer" onclick="window.refreshOdometer('${vehicle.regPlate}')" style="background: #17a2b8; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; margin-right: 4px;">Refresh Odometer</button>` : 
                                        ''
                                    }
                                    ${hasValidStatus && vehicle.rucStatus.status !== 'ok' ? 
                                        `<button class="btn-renew" onclick="window.renewLicense('${vehicle.regPlate}')" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px;">Renew</button>` : 
                                        ''
                                    }
                                </div>
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

    // Global function for refresh odometer button
    window.refreshOdometer = async (regPlate) => {
        const vehicle = vehicles.find(v => v.regPlate === regPlate);
        if (vehicle && vehicle.hasGeotabData) {
            console.log(`Manually refreshing odometer for ${regPlate}...`);
            
            // Show loading state for this specific button
            const button = document.querySelector(`button[onclick="window.refreshOdometer('${regPlate}')"]`);
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Loading...';
                button.disabled = true;
            }
            
            try {
                // Get fresh odometer reading
                const newOdometer = await getCurrentOdometer(vehicle.geotabDevice.id);
                
                if (newOdometer !== null) {
                    vehicle.currentOdometer = newOdometer;
                    vehicle.hasOdometerData = true;
                    console.log(`Updated odometer for ${regPlate}: ${newOdometer} km`);
                } else {
                    vehicle.hasOdometerData = false;
                    vehicle.currentOdometer = 0;
                    console.warn(`Still no odometer data available for ${regPlate}`);
                }
                
                // Recalculate RUC status
                vehicle.rucStatus = calculateRucStatus(vehicle.currentOdometer, vehicle.rucPaidTo);
                
                // Refresh the entire table to show updated data
                loadAndDisplayData();
                
                // Show success message
                if (newOdometer !== null) {
                    showSuccessMessage(`Odometer refreshed for ${regPlate}: ${newOdometer.toLocaleString()} km`);
                } else {
                    showSuccessMessage(`Odometer refresh attempted for ${regPlate} - no data available from Geotab API`);
                }
                
            } catch (error) {
                console.error(`Error refreshing odometer for ${regPlate}:`, error);
                showSuccessMessage(`Error refreshing odometer for ${regPlate}: ${error.message}`);
                
                // Re-enable button on error
                if (button) {
                    button.textContent = originalText;
                    button.disabled = false;
                }
            }
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
