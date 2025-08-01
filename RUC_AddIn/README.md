# RUC License Management Add-In for MyGeotab

A professional Road User Charge (RUC) license management module that integrates directly with MyGeotab to monitor vehicle odometer readings and provide timely alerts for license renewals.

## Features

- **Real-time Monitoring**: Automatically fetches live odometer data from Geotab devices
- **Smart Alerts**: Notifies when vehicles are within 2000km of license expiry
- **License Renewal**: Easy renewal process with 1000km, 5000km, or 10000km options
- **Professional UI**: Clean, modern interface integrated into MyGeotab
- **Data Persistence**: Maintains renewal history and settings across sessions
- **Fleet Overview**: Comprehensive dashboard with summary cards and detailed table

## Installation

### Prerequisites

- MyGeotab account with appropriate permissions
- Access to System > Settings > Add-Ins in MyGeotab
- Fleet data in the provided format (RUC_Data.json)

### Step 1: Prepare Your Fleet Data

Ensure your `RUC_Data.json` file contains your fleet information in the following format:

```json
[
  {
    "vehicleDescription": "Transport Trailers 4A 2002",
    "fleetNumber": 1,
    "regPlate": "589AT",
    "rucPaidTo": 13002.0
  }
]
```

### Step 2: Host the Add-In Files

1. Upload all files to a web server accessible from your MyGeotab environment:
   - `config.json`
   - `index.html`
   - `style.css`
   - `main.js`
   - `RUC_Data.json`

2. Ensure HTTPS is enabled for security

### Step 3: Install in MyGeotab

1. Log in to your MyGeotab database
2. Navigate to **System** > **Settings** > **Add-Ins** tab
3. Click **+ Add-In**
4. Copy the contents of `config.json` and paste into the Add-In Configuration window
5. Update the file URLs in the configuration to point to your hosted files
6. Click **Done**
7. Under **Installed Add-Ins**, select **Yes** for "Allow unverified Add-Ins"
8. Click **Save**

### Step 4: Configure File URLs

Update the `config.json` file with your server URLs:

```json
{
  "name": "RUC License Management",
  "supportEmail": "Francis@directt.co.nz",
  "version": "1.0.0",
  "items": [{
    "page": "rucLicenseManagement",
    "click": "rucLicenseManagement",
    "menuName": {
      "en": "RUC License Management"
    },
    "icon": "rucLicenseManagement",
    "version": "1.0.0"
  }],
  "files": {
    "rucLicenseManagement.html": "https://yourserver.com/path/index.html",
    "rucLicenseManagement.css": "https://yourserver.com/path/style.css",
    "rucLicenseManagement.js": "https://yourserver.com/path/main.js"
  },
  "key": "RUC-LICENSE-MGMT-2025"
}
```

## Usage

### Accessing the Add-In

1. After installation, refresh your MyGeotab page
2. Look for "RUC License Management" in the main navigation menu
3. Click to open the add-in

### Dashboard Overview

The main dashboard provides:

- **Summary Cards**: Total vehicles, alert count, and active licenses
- **Alert Section**: Vehicles requiring immediate attention (within 2000km of expiry)
- **Fleet Table**: Comprehensive view of all vehicles with current status
- **Status Bar**: Connection status and last update time

### Monitoring Alerts

- **Critical (Red)**: Vehicles with ≤500km remaining
- **Warning (Yellow)**: Vehicles with ≤2000km remaining  
- **OK (Green)**: Vehicles with >2000km remaining

### Renewing Licenses

1. Click the **"Renew License"** button for any vehicle showing a warning or critical status
2. Select from three renewal options:
   - **1,000 km**: Standard renewal
   - **5,000 km**: Economy option
   - **10,000 km**: Best value option
3. Review the renewal summary
4. Click **"Confirm Renewal"** to update the license

### Data Refresh

- Automatic refresh every 5 minutes
- Manual refresh using the "Refresh Data" button
- Data updates when the add-in gains focus

## Technical Details

### API Integration

The add-in integrates with MyGeotab APIs:

- **Device API**: Retrieves fleet device information
- **StatusData API**: Fetches real-time odometer readings
- **Diagnostic API**: Uses odometer diagnostic data

### Data Storage

- Initial fleet data loaded from `RUC_Data.json`
- License renewals stored in browser localStorage
- Persistent across browser sessions

### Device Matching

The system automatically matches vehicles to Geotab devices using:
- Registration plate matching
- Fleet number matching
- Device name pattern recognition

## Configuration

### Customizing Alert Threshold

To change the 2000km alert threshold, modify the `ALERT_THRESHOLD` constant in `main.js`:

```javascript
const ALERT_THRESHOLD = 2000; // Change this value as needed
```

### Adjusting Refresh Interval

To change the automatic refresh frequency, modify the `REFRESH_INTERVAL` constant:

```javascript
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
```

### Adding Custom Renewal Options

To add or modify renewal options, update the option cards in `index.html`:

```html
<div class="option-card" data-value="15000">
  <div class="option-title">15,000 km</div>
  <div class="option-price">Premium</div>
</div>
```

## Troubleshooting

### Common Issues

1. **No Data Showing**
   - Verify `RUC_Data.json` is accessible
   - Check browser console for errors
   - Ensure MyGeotab API permissions are correct

2. **Device Matching Problems**
   - Review device names in MyGeotab
   - Update matching logic in `matchVehiclesToDevices()` function
   - Check registration plate formats

3. **Connection Issues**
   - Verify HTTPS hosting
   - Check CORS settings on your server
   - Ensure MyGeotab can access your hosted files

### Error Messages

- **"Geotab API is not available"**: Add-in not properly initialized
- **"Failed to load fleet data"**: Issue with RUC_Data.json file
- **"Failed to update vehicle data"**: API connectivity or permission issue

### Debug Mode

For testing outside MyGeotab environment, the add-in includes a mock API mode that activates when the Geotab object is not available.

## Support

For technical support or questions:

- **Email**: Francis@directt.co.nz
- **Database**: UCCNZ

## Version History

### v1.0.0 (Current)
- Initial release
- Real-time odometer monitoring
- License renewal functionality
- Professional UI with alerts and dashboard
- MyGeotab integration

## Security Considerations

- All API credentials are handled by MyGeotab's authentication system
- No sensitive data is stored in the add-in code
- License renewal data is stored locally in the browser
- HTTPS required for production deployment

## License

This add-in is developed for Direct Transport Ltd and is intended for internal use with their MyGeotab environment.
