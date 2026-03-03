#!/usr/bin/env python3
"""
Setup and run script for CampusConnect
Handles dependency installation and application startup
"""

import subprocess
import sys
import os

def install_dependencies():
    """Install required Python dependencies"""
    print("Installing dependencies...")
    try:
        # Install bcrypt
        subprocess.check_call([sys.executable, "-m", "pip", "install", "bcrypt"])
        print("✅ bcrypt installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def check_dependencies():
    """Check if all dependencies are installed"""
    try:
        import bcrypt
        print("✅ bcrypt is available")
        return True
    except ImportError:
        print("❌ bcrypt is not installed")
        return False

def run_application():
    """Run the Flask application"""
    print("\n" + "="*50)
    print("🚀 Starting CampusConnect Application")
    print("="*50)
    print("Server will be available at: http://localhost:3000")
    print("Press Ctrl+C to stop the server")
    print("="*50)
    
    try:
        # Import and run the app
        from app import app
        app.run(host='0.0.0.0', port=3000, debug=True)
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        return False
    
    return True

def main():
    """Main setup and run function"""
    print("CampusConnect Setup and Run Script")
    print("="*40)
    
    # Check if we're in the right directory
    if not os.path.exists('app.py'):
        print("❌ Error: app.py not found. Please run this script from the backend directory.")
        return False
    
    # Check if dependencies are already installed
    if not check_dependencies():
        print("\nInstalling missing dependencies...")
        if not install_dependencies():
            print("❌ Failed to install dependencies. Please install manually:")
            print("   pip install bcrypt")
            return False
    
    # Run the application
    return run_application()

if __name__ == "__main__":
    main()