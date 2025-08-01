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

    // Load from JSON file
    fetch("RUC_Data.json")
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
    // Update remaining km (column 5)
    row.cells[5].textContent = vehicle.remainingKm !== undefined ? formatNumber(Math.max(0, vehicle.remainingKm)) : '--';
    
    // Update license options (column 6)
    const newLicenseWith1000 = vehicle.rucPaidTo + 1000;
    const newLicenseWith5000 = vehicle.rucPaidTo + 5000;
    const newLicenseWith10000 = vehicle.rucPaidTo + 10000;
    
    row.cells[6].innerHTML = `
      <div class="license-options">
        <small>+1000km: ${formatNumber(newLicenseWith1000)}</small><br>
        <small>+5000km: ${formatNumber(newLicenseWith5000)}</small><br>
        <small>+10000km: ${formatNumber(newLicenseWith10000)}</small>
      </div>
    `;
    
    // Update status badge (column 7)
    row.cells[7].innerHTML = getStatusBadge(vehicle.remainingKm);
  }
}

function populateFleetTable() {
  const tbody = document.querySelector("#fleetTable tbody");
  tbody.innerHTML = "";

  fleetData.forEach((vehicle, index) => {
    const tr = document.createElement("tr");
    
    // Calculate what the new license limit would be with different renewal options
    const newLicenseWith1000 = vehicle.rucPaidTo + 1000;
    const newLicenseWith5000 = vehicle.rucPaidTo + 5000;
    const newLicenseWith10000 = vehicle.rucPaidTo + 10000;
    
    tr.innerHTML = `
      <td>${vehicle.vehicleDescription}</td>
      <td>${vehicle.fleetNumber}</td>
      <td>${vehicle.regPlate}</td>
      <td>${formatNumber(vehicle.rucPaidTo)}</td>
      <td>${vehicle.currentOdometer ? formatNumber(vehicle.currentOdometer) : '--'}</td>
      <td>${vehicle.remainingKm !== undefined ? formatNumber(Math.max(0, vehicle.remainingKm)) : '--'}</td>
      <td class="new-license-preview">
        <div class="license-options">
          <small>+1000km: ${formatNumber(newLicenseWith1000)}</small><br>
          <small>+5000km: ${formatNumber(newLicenseWith5000)}</small><br>
          <small>+10000km: ${formatNumber(newLicenseWith10000)}</small>
        </div>
      </td>
      <td>${getStatusBadge(vehicle.remainingKm)}</td>
      <td>
        <button class="btn-renew" data-index="${index}">
          Renew License
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });

  // Attach event listeners to renew buttons
  document.querySelectorAll(".btn-renew").forEach(btn => {
    btn.addEventListener("click", handleRenewalClick);
  });
}

// Modal Functions
function showRenewalModal(vehicleIndex) {
  selectedVehicleIndex = vehicleIndex;
  const vehicle = fleetData[vehicleIndex];
  
  document.getElementById("modalVehicleName").textContent = 
    `${vehicle.vehicleDescription} (${vehicle.regPlate})`;
  document.getElementById("modalCurrentLimit").textContent = formatNumber(vehicle.rucPaidTo);
  document.getElementById("modalCurrentOdometer").textContent = 
    vehicle.currentOdometer ? formatNumber(vehicle.currentOdometer) : 'Unknown';
  
  // Reset modal state
  document.querySelectorAll(".option-card").forEach(card => {
    card.classList.remove("selected");
  });
  document.getElementById("confirmRenewal").disabled = true;
  document.querySelector(".renewal-summary").classList.add("hidden");
  
  document.getElementById("renewalModal").classList.remove("hidden");
}

function hideRenewalModal() {
  document.getElementById("renewalModal").classList.add("hidden");
  selectedVehicleIndex = null;
}

function handleRenewalClick(event) {
  const index = parseInt(event.target.getAttribute("data-index"));
  showRenewalModal(index);
}

function handleRenewalConfirm() {
  if (selectedVehicleIndex === null) return;
  
  const selectedOption = document.querySelector(".option-card.selected");
  if (!selectedOption) return;
  
  const increment = parseInt(selectedOption.getAttribute("data-value"));
  const vehicle = fleetData[selectedVehicleIndex];
  
  // Store the old license limit for the success message
  const oldLimit = vehicle.rucPaidTo;
  
  // IMPORTANT: Add the purchased amount to the existing license (don't replace it)
  // This preserves any remaining balance from the current license
  vehicle.rucPaidTo += increment;
  vehicle.remainingKm = vehicle.rucPaidTo - (vehicle.currentOdometer || 0);
  
  // Save updated data
  saveFleetData();
  
  // Update UI - need to repopulate the entire table to show new license options
  populateFleetTable();
  updateSummaryCards();
  updateAlerts();
  
  // Hide modal and show success message
  hideRenewalModal();
  
  // Show detailed success notification
  const successMsg = `License renewed for ${vehicle.vehicleDescription}! Added ${formatNumber(increment)}km. New limit: ${formatNumber(vehicle.rucPaidTo)}km (was ${formatNumber(oldLimit)}km)`;
  console.log(successMsg);
  
  // Temporarily show success in the status bar
  const statusBar = document.getElementById("lastUpdated");
  const originalText = statusBar.textContent;
  statusBar.textContent = "✓ " + successMsg;
  statusBar.style.color = "#28a745";
  
  setTimeout(() => {
    statusBar.textContent = originalText;
    statusBar.style.color = "";
  }, 7000);
}

// Event Listeners
function setupEventListeners() {
  // Refresh button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    updateOdometerData();
  });
  
  // Error dismiss button
  document.getElementById("dismissError").addEventListener("click", hideError);
  
  // Modal controls
  document.getElementById("closeModal").addEventListener("click", hideRenewalModal);
  document.getElementById("cancelRenewal").addEventListener("click", hideRenewalModal);
  document.getElementById("confirmRenewal").addEventListener("click", handleRenewalConfirm);
  
  // Option card selection
  document.querySelectorAll(".option-card").forEach(card => {
    card.addEventListener("click", () => {
      // Remove selection from other cards
      document.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));
      
      // Select this card
      card.classList.add("selected");
      
      // Enable confirm button
      document.getElementById("confirmRenewal").disabled = false;
      
      // Show renewal summary
      const increment = parseInt(card.getAttribute("data-value"));
      const vehicle = fleetData[selectedVehicleIndex];
      const newLimit = vehicle.rucPaidTo + increment;
      
      document.getElementById("newLicenseLimit").textContent = formatNumber(newLimit);
      document.querySelector(".renewal-summary").classList.remove("hidden");
    });
  });
  
  // Close modal when clicking outside
  document.getElementById("renewalModal").addEventListener("click", (event) => {
    if (event.target.id === "renewalModal") {
      hideRenewalModal();
    }
  });
}

// Initialization Functions
async function initializeAddin(api, state, callback) {
  try {
    console.log("Initializing RUC License Management Add-In");
    
    // Set global API reference
    geotabApi = api;
    currentUser = state.user;
    
    showLoading();
    
    // Load fleet data
    await loadFleetData();
    
    // Setup UI
    setupEventListeners();
    populateFleetTable();
    updateSummaryCards();
    
    // Initial data update
    await updateOdometerData();
    
    // Setup periodic refresh
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(updateOdometerData, REFRESH_INTERVAL);
    
    hideLoading();
    console.log("RUC License Management Add-In initialized successfully");
    
    if (callback) callback();
    
  } catch (error) {
    console.error("Failed to initialize add-in:", error);
    hideLoading();
    showError("Failed to initialize: " + error.message);
    if (callback) callback();
  }
}

function cleanup() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  console.log("RUC License Management Add-In cleanup completed");
}

// Geotab Add-In Lifecycle
if (typeof geotab !== "undefined") {
  geotab.addin = geotab.addin || {};
  geotab.addin.rucLicenseManagement = function () {
    return {
      initialize: function (api, state, callback) {
        initializeAddin(api, state, callback);
      },
      
      focus: function (api, state) {
        console.log("Add-in gained focus");
        // Refresh data when user returns to the add-in
        if (geotabApi) {
          updateOdometerData();
        }
      },
      
      blur: function (api, state) {
        console.log("Add-in lost focus");
        // Could pause updates here if needed
      }
    };
  };
} else {
  // For testing outside of Geotab environment
  console.warn("Geotab object not found - running in test mode");
  
  // Mock API for testing
  const mockApi = {
    call: function(method, params) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (method === "Get" && params.typeName === "Device") {
            // Mock device data
            resolve([
              { id: "device1", name: "589AT - Transport Trailer" },
              { id: "device2", name: "E560P - Transfleet" },
              { id: "device3", name: "5578C - Morgan Lowloader" }
            ]);
          } else if (method === "Get" && params.typeName === "StatusData") {
            // Mock odometer data
            resolve([
              { data: Math.random() * 100000 + 50000, dateTime: new Date().toISOString() }
            ]);
          } else {
            resolve([]);
          }
        }, 500);
      });
    }
  };
  
  // Initialize in test mode
  setTimeout(() => {
    initializeAddin(mockApi, { user: { name: "Test User" } });
  }, 1000);
}
