/**
 * RUC License Management Add-In for MyGeotab
 * Monitors Road User Charge licenses and provides renewal functionality
 */

"use strict";

// Global variables
let fleetData = [];
let geotabApi = null;
let currentUser = null;
let refreshInterval = null;
let selectedVehicleIndex = null;

// Constants
const ALERT_THRESHOLD = 2000; // km before expiry when alert should trigger
const REFRESH_INTERVAL = 5 * 60 * 1000; // refresh every 5 minutes
const ODOMETER_DIAGNOSTIC_ID = "DiagnosticOdometerId";

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat().format(Math.round(num));
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('en-NZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showError(message) {
    const errorContainer = document.getElementById("errorContainer");
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.textContent = message;
    errorContainer.classList.remove("hidden");
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        hideError();
    }, 10000);
}

function hideError() {
    const errorContainer = document.getElementById("errorContainer");
    errorContainer.classList.add("hidden");
}

function showLoading() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    loadingOverlay.classList.add("hidden");
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById("connectionStatus");
    if (connected) {
        statusElement.textContent = "Connected";
        statusElement.className = "status-connected";
    } else {
        statusElement.textContent = "Disconnected";
        statusElement.className = "status-disconnected";
    }
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById("lastUpdated");
    lastUpdatedElement.textContent = `Last Updated: ${formatDateTime(new Date())}`;
}

// Data Management Functions
function loadFleetData() {
    return new Promise((resolve, reject) => {
        // Check if localStorage has updated fleet data
        const savedData = localStorage.getItem("rucFleetData");
        if (savedData) {
            try {
                fleetData = JSON.parse(savedData);
                console.log("Loaded fleet data from localStorage:", fleetData.length, "vehicles");
                resolve(fleetData);
                return;
            } catch (error) {
                console.warn("Failed to parse saved fleet data, loading from file");
            }
        }

        // Load from JSON file - FIXED: Use full GitHub Pages URL
        fetch("https://kikorangee.github.io/RUC1/RUC_AddIn/RUC_Data.json")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                fleetData = data.map(vehicle => ({
                    ...vehicle,
                    currentOdometer: 0,
                    remainingKm: vehicle.rucPaidTo,
                    lastUpdated: null,
                    deviceId: null // Will be populated when we find matching devices
                }));

                // Save initial data to localStorage
                localStorage.setItem("rucFleetData", JSON.stringify(fleetData));
                console.log("Loaded fleet data from file:", fleetData.length, "vehicles");
                resolve(fleetData);
            })
            .catch(error => {
                console.error("Failed to load fleet data:", error);
                reject(error);
            });
    });
}

function saveFleetData() {
    try {
        localStorage.setItem("rucFleetData", JSON.stringify(fleetData));
        console.log("Fleet data saved to localStorage");
    } catch (error) {
        console.error("Failed to save fleet data:", error);
    }
}

// Geotab API Functions
async function getDevices() {
    if (!geotabApi) {
        throw new Error("Geotab API not available");
    }

    try {
        const devices = await geotabApi.call("Get", {
            typeName: "Device"
        });
        console.log("Retrieved", devices.length, "devices from Geotab");
        return devices;
    } catch (error) {
        console.error("Failed to get devices:", error);
        throw error;
    }
}

async function getOdometerData(deviceId, fromDate = null) {
    if (!geotabApi || !deviceId) {
        return null;
    }

    try {
        const searchParams = {
            deviceSearch: { id: deviceId },
            diagnosticSearch: { id: ODOMETER_DIAGNOSTIC_ID }
        };

        // If no fromDate specified, get data from last 24 hours
        if (!fromDate) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            searchParams.fromDate = yesterday.toISOString();
        } else {
            searchParams.fromDate = fromDate;
        }

        searchParams.toDate = new Date().toISOString();

        const statusData = await geotabApi.call("Get", {
            typeName: "StatusData",
            search: searchParams
        });

        if (statusData && statusData.length > 0) {
            // Get the most recent odometer reading
            const latestReading = statusData[statusData.length - 1];
            return {
                value: latestReading.data,
                dateTime: new Date(latestReading.dateTime),
                deviceId: deviceId
            };
        }

        return null;
    } catch (error) {
        console.error(`Failed to get odometer data for device ${deviceId}:`, error);
        return null;
    }
}

// Device Matching Functions
function matchVehiclesToDevices(devices) {
    let matchedCount = 0;

    fleetData.forEach(vehicle => {
        // Try to match by registration plate or fleet number
        const matchedDevice = devices.find(device => {
            // Check if device name contains registration plate
            if (device.name && vehicle.regPlate) {
                const deviceName = device.name.toLowerCase();
                const regPlate = vehicle.regPlate.toLowerCase();
                if (deviceName.includes(regPlate) || regPlate.includes(deviceName)) {
                    return true;
                }
            }

            // Check if device name contains fleet number
            if (device.name && vehicle.fleetNumber) {
                const deviceName = device.name.toLowerCase();
                const fleetNum = vehicle.fleetNumber.toString();
                if (deviceName.includes(fleetNum)) {
                    return true;
                }
            }

            return false;
        });

        if (matchedDevice) {
            vehicle.deviceId = matchedDevice.id;
            vehicle.deviceName = matchedDevice.name;
            matchedCount++;
        }
    });

    console.log(`Matched ${matchedCount} vehicles to Geotab devices`);
    return matchedCount;
}

// Data Update Functions
async function updateOdometerData() {
    if (!geotabApi) {
        showError("Geotab API is not available");
        return;
    }

    updateConnectionStatus(true);

    try {
        // Get devices if we haven't matched them yet
        const devicesNeeded = fleetData.some(vehicle => !vehicle.deviceId);
        if (devicesNeeded) {
            const devices = await getDevices();
            matchVehiclesToDevices(devices);
        }

        // Update odometer data for each vehicle
        const updatePromises = fleetData.map(async (vehicle, index) => {
            if (!vehicle.deviceId) {
                console.warn(`No device ID found for vehicle ${vehicle.regPlate}`);
                return;
            }

            try {
                const odometerData = await getOdometerData(vehicle.deviceId);
                if (odometerData) {
                    vehicle.currentOdometer = Math.round(odometerData.value);
                    vehicle.remainingKm = vehicle.rucPaidTo - vehicle.currentOdometer;
                    vehicle.lastUpdated = odometerData.dateTime;

                    // Update the table row
                    updateTableRow(index, vehicle);
                }
            } catch (error) {
                console.error(`Failed to update odometer for vehicle ${vehicle.regPlate}:`, error);
            }
        });

        await Promise.all(updatePromises);

        // Save updated data
        saveFleetData();

        // Update UI components
        updateSummaryCards();
        updateAlerts();
        updateLastUpdated();

        console.log("Odometer data update completed");
    } catch (error) {
        console.error("Failed to update odometer data:", error);
        showError("Failed to update vehicle data: " + error.message);
        updateConnectionStatus(false);
    }
}

// UI Update Functions
function updateSummaryCards() {
    const totalVehicles = fleetData.length;
    const alertCount = fleetData.filter(vehicle =>
        vehicle.remainingKm !== undefined && vehicle.remainingKm <= ALERT_THRESHOLD
    ).length;
    const activeLicenses = fleetData.filter(vehicle =>
        vehicle.remainingKm !== undefined && vehicle.remainingKm > 0
    ).length;

    document.getElementById("totalVehicles").textContent = totalVehicles;
    document.getElementById("alertCount").textContent = alertCount;
    document.getElementById("activeLicenses").textContent = activeLicenses;
}

function updateAlerts() {
    const alertsContainer = document.getElementById("alertsContainer");
    const alertVehicles = fleetData.filter(vehicle =>
        vehicle.remainingKm !== undefined && vehicle.remainingKm <= ALERT_THRESHOLD
    );

    if (alertVehicles.length === 0) {
        alertsContainer.innerHTML = '<p class="no-alerts">No vehicles require immediate attention</p>';
    } else {
        alertsContainer.innerHTML = alertVehicles.map(vehicle => {
            const urgency = vehicle.remainingKm <= 500 ? 'URGENT' : 'WARNING';
            return `
                <div class="alert-item">
                    <strong>${urgency}:</strong> ${vehicle.vehicleDescription} (${vehicle.regPlate})
                    has only ${formatNumber(Math.max(0, vehicle.remainingKm))} km remaining on RUC license
                </div>
            `;
        }).join('');
    }
}

function getStatusBadge(remainingKm) {
    if (remainingKm === undefined || remainingKm === null) {
        return '<span class="status-badge">No Data</span>';
    }

    if (remainingKm <= 500) {
        return '<span class="status-badge status-critical">Critical</span>';
    } else if (remainingKm <= ALERT_THRESHOLD) {
        return '<span class="status-badge status-warning">Warning</span>';
    } else {
        return '<span class="status-badge status-ok">OK</span>';
    }
}

function updateTableRow(index, vehicle) {
    const tbody = document.querySelector("#fleetTable tbody");
    const rows = tbody.querySelectorAll("tr");
    if (rows[index]) {
        const row = rows[index];
        
        // Update current odometer (column 4)
        row.cells[4].textContent = vehicle.currentOdometer ? formatNumber(vehicle.currentOdometer) : '--';
        
        // Update remaining km (column 6)
        row.cells[6].textContent = vehicle.remainingKm !== undefined ? formatNumber(Math.max(0, vehicle.remainingKm)) : '--';
        
        // Update license options (column 7)
        const newLicenseWith1000 = vehicle.rucPaidTo + 1000;
        const newLicenseWith5000 = vehicle.rucPaidTo + 5000;
        const newLicenseWith10000 = vehicle.rucPaidTo + 10000;
        
        row.cells[7].innerHTML = `
            <div class="license-options">
                <small>+1000km: ${formatNumber(newLicenseWith1000)}</small><br>
                <small>+5000km: ${formatNumber(newLicenseWith5000)}</small><br>
                <small>+10000km: ${formatNumber(newLicenseWith10000)}</small>
            </div>
        `;
        
        // Update status badge (column 8)
        row.cells[8].innerHTML = getStatusBadge(vehicle.remainingKm);
    }
}

function populateFleetTable() {
    const tbody = document.querySelector("#fleetTable tbody");
    tbody.innerHTML = '';

    fleetData.forEach((vehicle, index) => {
        const row = tbody.insertRow();
        
        // Vehicle Description
        row.insertCell(0).textContent = vehicle.vehicleDescription;
        
        // Fleet Number
        row.insertCell(1).textContent = vehicle.fleetNumber;
        
        // Registration
        row.insertCell(2).textContent = vehicle.regPlate;
        
        // License Valid To
        row.insertCell(3).textContent = formatNumber(vehicle.rucPaidTo);
        
        // Current Odometer
        row.insertCell(4).textContent = vehicle.currentOdometer ? formatNumber(vehicle.currentOdometer) : '--';
        
        // Get Reading button
        const getReadingCell = row.insertCell(5);
        getReadingCell.innerHTML = `<button class="btn-get-reading" onclick="getOdometerReading(${index})">Get Reading</button>`;
        
        // Remaining km
        row.insertCell(6).textContent = vehicle.remainingKm !== undefined ? formatNumber(Math.max(0, vehicle.remainingKm)) : '--';
        
        // New License Options
        const newLicenseWith1000 = vehicle.rucPaidTo + 1000;
        const newLicenseWith5000 = vehicle.rucPaidTo + 5000;
        const newLicenseWith10000 = vehicle.rucPaidTo + 10000;
        
        row.insertCell(7).innerHTML = `
            <div class="license-options">
                <small>+1000km: ${formatNumber(newLicenseWith1000)}</small><br>
                <small>+5000km: ${formatNumber(newLicenseWith5000)}</small><br>
                <small>+10000km: ${formatNumber(newLicenseWith10000)}</small>
            </div>
        `;
        
        // Status
        row.insertCell(8).innerHTML = getStatusBadge(vehicle.remainingKm);
        
        // Actions
        row.insertCell(9).innerHTML = `
            <button class="btn-renew" onclick="openRenewalModal(${index})">Renew</button>
        `;
    });
}

// Event Handlers
async function getOdometerReading(vehicleIndex) {
    const vehicle = fleetData[vehicleIndex];
    
    try {
        showLoading();
        
        if (!vehicle.deviceId) {
            // Try to find device first
            const devices = await getDevices();
            matchVehiclesToDevices(devices);
        }
        
        if (!vehicle.deviceId) {
            showError(`No Geotab device found for vehicle ${vehicle.regPlate}`);
            return;
        }
        
        const odometerData = await getOdometerData(vehicle.deviceId);
        if (odometerData) {
            vehicle.currentOdometer = Math.round(odometerData.value);
            vehicle.remainingKm = vehicle.rucPaidTo - vehicle.currentOdometer;
            vehicle.lastUpdated = odometerData.dateTime;
            
            updateTableRow(vehicleIndex, vehicle);
            saveFleetData();
            updateSummaryCards();
            updateAlerts();
        } else {
            showError(`No recent odometer data found for vehicle ${vehicle.regPlate}`);
        }
    } catch (error) {
        console.error("Failed to get odometer reading:", error);
        showError("Failed to get odometer reading: " + error.message);
    } finally {
        hideLoading();
    }
}

function openRenewalModal(vehicleIndex) {
    selectedVehicleIndex = vehicleIndex;
    const vehicle = fleetData[vehicleIndex];
    
    document.getElementById("modalVehicleName").textContent = vehicle.vehicleDescription;
    document.getElementById("modalCurrentLimit").textContent = formatNumber(vehicle.rucPaidTo);
    document.getElementById("modalCurrentOdometer").textContent = vehicle.currentOdometer ? formatNumber(vehicle.currentOdometer) : '--';
    
    document.getElementById("renewalModal").classList.remove("hidden");
}

// Modal event handlers
document.addEventListener("DOMContentLoaded", function() {
    // Close modal
    document.getElementById("closeModal").addEventListener("click", function() {
        document.getElementById("renewalModal").classList.add("hidden");
    });
    
    document.getElementById("cancelRenewal").addEventListener("click", function() {
        document.getElementById("renewalModal").classList.add("hidden");
    });
    
    // Option card selection
    document.querySelectorAll(".option-card").forEach(card => {
        card.addEventListener("click", function() {
            // Remove selection from other cards
            document.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));
            
            // Select this card
            this.classList.add("selected");
            
            // Show renewal summary
            const value = parseInt(this.dataset.value);
            const vehicle = fleetData[selectedVehicleIndex];
            const newLimit = vehicle.rucPaidTo + value;
            
            document.getElementById("newLicenseLimit").textContent = formatNumber(newLimit);
            document.querySelector(".renewal-summary").classList.remove("hidden");
            document.getElementById("confirmRenewal").disabled = false;
        });
    });
    
    // Confirm renewal
    document.getElementById("confirmRenewal").addEventListener("click", function() {
        const selectedOption = document.querySelector(".option-card.selected");
        if (selectedOption && selectedVehicleIndex !== null) {
            const value = parseInt(selectedOption.dataset.value);
            const vehicle = fleetData[selectedVehicleIndex];
            
            // Update vehicle data
            vehicle.rucPaidTo += value;
            vehicle.remainingKm = vehicle.rucPaidTo - (vehicle.currentOdometer || 0);
            
            // Update UI
            updateTableRow(selectedVehicleIndex, vehicle);
            saveFleetData();
            updateSummaryCards();
            updateAlerts();
            
            // Close modal
            document.getElementById("renewalModal").classList.add("hidden");
            
            // Reset modal state
            document.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));
            document.querySelector(".renewal-summary").classList.add("hidden");
            document.getElementById("confirmRenewal").disabled = true;
        }
    });
    
    // Refresh button
    document.getElementById("refreshBtn").addEventListener("click", function() {
        updateOdometerData();
    });
    
    // Dismiss error
    document.getElementById("dismissError").addEventListener("click", function() {
        hideError();
    });
});

// Initialize the add-in
function initialize(api, state, callback) {
    geotabApi = api;
    currentUser = state.user;
    
    console.log("RUC License Management Add-In initialized");
    console.log("User:", currentUser.name);
    
    showLoading();
    
    // Load fleet data and populate table
    loadFleetData()
        .then(() => {
            populateFleetTable();
            updateSummaryCards();
            updateAlerts();
            updateLastUpdated();
            hideLoading();
            
            // Set up auto-refresh
            refreshInterval = setInterval(updateOdometerData, REFRESH_INTERVAL);
            
            console.log("Add-in ready with", fleetData.length, "vehicles");
        })
        .catch(error => {
            console.error("Failed to initialize add-in:", error);
            showError("Failed to load fleet data: " + error.message);
            hideLoading();
        });
    
    if (callback) {
        callback();
    }
}

// Focus and blur handlers for Geotab add-in lifecycle
function focus() {
    console.log("Add-in gained focus");
    updateLastUpdated();
}

function blur() {
    console.log("Add-in lost focus");
}

// Clean up when add-in is unloaded
window.addEventListener("beforeunload", function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
