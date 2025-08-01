# RUC License Management Add-In - Deployment Guide

This guide provides step-by-step instructions for deploying the RUC License Management Add-In to your MyGeotab environment.

## Pre-Deployment Checklist

- [ ] MyGeotab account with admin privileges
- [ ] Web server with HTTPS support
- [ ] Fleet data prepared in JSON format
- [ ] Geotab API credentials verified (Database: UCCNZ, Username: Francis@directt.co.nz)

## Deployment Steps

### Step 1: Test Locally (Optional but Recommended)

1. **Start the test server:**
   ```bash
   cd RUC_AddIn
   python3 test-server.py
   ```

2. **Open in browser:**
   - Navigate to `http://localhost:8000/index.html`
   - Verify the interface loads correctly
   - Check that fleet data displays properly
   - Test the mock functionality

3. **Verify files are accessible:**
   - `http://localhost:8000/config.json`
   - `http://localhost:8000/RUC_Data.json`
   - `http://localhost:8000/style.css`
   - `http://localhost:8000/main.js`

### Step 2: Upload to Production Server

1. **Choose a hosting solution:**
   - Internal web server
   - Cloud hosting (AWS S3, Azure Blob Storage, etc.)
   - CDN service

2. **Upload all files:**
   ```
   /your-domain.com/ruc-addin/
   ├── index.html
   ├── style.css
   ├── main.js
   ├── RUC_Data.json
   └── config.json
   ```

3. **Ensure HTTPS is enabled:**
   - MyGeotab requires HTTPS for add-ins
   - Verify SSL certificate is valid
   - Test all file URLs in browser

### Step 3: Configure MyGeotab Add-In

1. **Update config.json with production URLs:**
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
       "rucLicenseManagement.html": "https://your-domain.com/ruc-addin/index.html",
       "rucLicenseManagement.css": "https://your-domain.com/ruc-addin/style.css",
       "rucLicenseManagement.js": "https://your-domain.com/ruc-addin/main.js"
     },
     "key": "RUC-LICENSE-MGMT-2025"
   }
   ```

2. **Install in MyGeotab:**
   - Log in to MyGeotab (Database: UCCNZ)
   - Navigate to **System** → **Settings** → **Add-Ins**
   - Click **+ Add-In**
   - Paste the updated config.json content
   - Click **Done**
   - Enable "Allow unverified Add-Ins"
   - Click **Save**

### Step 4: Verify Installation

1. **Check add-in appears in menu:**
   - Refresh MyGeotab page
   - Look for "RUC License Management" in navigation

2. **Test functionality:**
   - Click on the add-in menu item
   - Verify fleet data loads
   - Check that device matching works
   - Test license renewal process

3. **Monitor for errors:**
   - Open browser developer tools
   - Check console for JavaScript errors
   - Verify API calls are successful

## Production Configuration

### Server Requirements

- **HTTPS**: Required by MyGeotab
- **CORS**: Configure if needed for cross-origin requests
- **Caching**: Set appropriate cache headers for static files
- **Compression**: Enable gzip compression for better performance

### Security Considerations

1. **File Permissions:**
   - Ensure files are readable by web server
   - Restrict write access to prevent tampering

2. **Access Control:**
   - Consider IP restrictions if needed
   - Monitor access logs for unusual activity

3. **Data Protection:**
   - Fleet data contains sensitive information
   - Ensure server is properly secured
   - Regular security updates

### Performance Optimization

1. **File Optimization:**
   - Minify CSS and JavaScript files
   - Optimize images if any are added
   - Enable compression

2. **Caching Strategy:**
   ```
   Cache-Control: public, max-age=3600  # For static files
   Cache-Control: no-cache              # For RUC_Data.json
   ```

3. **CDN Usage:**
   - Consider using a CDN for better global performance
   - Ensure HTTPS is maintained

## Monitoring and Maintenance

### Health Checks

Create a simple health check endpoint to monitor add-in availability:

```javascript
// Add to main.js for monitoring
window.rucAddInHealth = {
  version: "1.0.0",
  status: "healthy",
  lastUpdate: new Date().toISOString(),
  fleetCount: fleetData.length
};
```

### Log Monitoring

Monitor for common issues:
- Failed API calls to MyGeotab
- Device matching failures
- Data loading errors
- User interface errors

### Update Process

1. **Backup current version**
2. **Test updates locally**
3. **Deploy to staging environment**
4. **Update production files**
5. **Verify functionality**
6. **Update version number in config.json**

## Troubleshooting

### Common Deployment Issues

1. **Add-in doesn't appear in menu:**
   - Check config.json syntax
   - Verify file URLs are accessible
   - Ensure HTTPS is working

2. **Files not loading:**
   - Check CORS settings
   - Verify file permissions
   - Test URLs directly in browser

3. **API errors:**
   - Verify MyGeotab credentials
   - Check user permissions
   - Review API call syntax

### Error Codes

- **404 Not Found**: File URL incorrect or file missing
- **403 Forbidden**: Permission issue or CORS problem
- **500 Server Error**: Server configuration issue
- **Mixed Content**: HTTP content on HTTPS page

### Support Contacts

- **Technical Issues**: Francis@directt.co.nz
- **MyGeotab Support**: Contact Geotab support team
- **Server Issues**: Contact your IT/hosting provider

## Rollback Plan

If issues occur after deployment:

1. **Immediate Actions:**
   - Disable the add-in in MyGeotab settings
   - Restore previous version files
   - Notify users of temporary unavailability

2. **Investigation:**
   - Review error logs
   - Test in staging environment
   - Identify root cause

3. **Resolution:**
   - Fix identified issues
   - Re-test thoroughly
   - Re-deploy with monitoring

## Success Criteria

The deployment is successful when:

- [ ] Add-in appears in MyGeotab navigation
- [ ] Fleet data loads correctly (86 vehicles)
- [ ] Device matching works for available vehicles
- [ ] Alerts display for vehicles within 2000km of expiry
- [ ] License renewal process completes successfully
- [ ] Data persists across browser sessions
- [ ] No JavaScript errors in console
- [ ] Performance is acceptable (< 3 seconds load time)

## Post-Deployment Tasks

1. **User Training:**
   - Provide training to fleet managers
   - Document common workflows
   - Create user guides

2. **Monitoring Setup:**
   - Set up uptime monitoring
   - Configure error alerting
   - Regular health checks

3. **Feedback Collection:**
   - Gather user feedback
   - Monitor usage patterns
   - Plan future enhancements

## Next Steps

After successful deployment:

1. **Monitor Usage:**
   - Track add-in usage metrics
   - Monitor for errors or issues
   - Collect user feedback

2. **Plan Enhancements:**
   - Additional reporting features
   - Integration with accounting systems
   - Mobile optimization

3. **Regular Maintenance:**
   - Update fleet data as needed
   - Apply security patches
   - Performance optimization
