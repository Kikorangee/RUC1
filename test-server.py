#!/usr/bin/env python3
"""
Simple HTTP server for testing the RUC License Management Add-In
Run this to test the add-in locally before deploying to production
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler with CORS support for testing"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers for testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

def main():
    """Start the test server"""
    
    # Change to the add-in directory
    os.chdir(DIRECTORY)
    
    print(f"RUC License Management Add-In Test Server")
    print(f"=========================================")
    print(f"Directory: {DIRECTORY}")
    print(f"Port: {PORT}")
    print(f"")
    print(f"Starting server...")
    
    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print(f"✓ Server started successfully!")
            print(f"")
            print(f"Test URLs:")
            print(f"  Main Add-In: http://localhost:{PORT}/index.html")
            print(f"  Fleet Data:  http://localhost:{PORT}/RUC_Data.json")
            print(f"  Config:      http://localhost:{PORT}/config.json")
            print(f"")
            print(f"For MyGeotab Add-In configuration, use:")
            print(f"  HTML: http://localhost:{PORT}/index.html")
            print(f"  CSS:  http://localhost:{PORT}/style.css")
            print(f"  JS:   http://localhost:{PORT}/main.js")
            print(f"")
            print(f"Press Ctrl+C to stop the server")
            print(f"")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n✓ Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"✗ Error: Port {PORT} is already in use")
            print(f"  Try stopping other servers or use a different port")
        else:
            print(f"✗ Error starting server: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
