#!/usr/bin/env python3
"""
Simple script to run the CampusConnect application
"""

import os
import sys
import subprocess

def main():
    print("Starting CampusConnect Application...")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if not os.path.exists(backend_dir):
        print("❌ Backend directory not found!")
        return False
    
    os.chdir(backend_dir)
    print(f"✅ Changed to directory: {backend_dir}")
    
    # Check if app.py exists
    if not os.path.exists('app.py'):
        print("❌ app.py not found in backend directory!")
        return False
    
    print("✅ Found app.py")
    
    # Try to run the application
    try:
        print("🚀 Starting Flask application...")
        print("📍 Server will be available at: http://localhost:3000")
        print("💡 Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Run the application
        subprocess.run([sys.executable, 'app.py'], check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start application: {e}")
        return False
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        return True
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Application started successfully!")
    else:
        print("\n❌ Failed to start application")
        sys.exit(1)