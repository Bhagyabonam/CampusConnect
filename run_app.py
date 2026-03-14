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
    
    # Run the backend as a module so relative imports work correctly
    # (use `python -m backend.app` to preserve package context)
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if not os.path.exists(backend_dir):
        print("❌ Backend directory not found!")
        return False

    print(f"✅ Backend directory found: {backend_dir}")

    # Try to run the application as a module to avoid relative-import errors
    try:
        print("🚀 Starting Flask application (module mode)...")
        print("📍 Server will be available at: http://localhost:3000")
        print("💡 Press Ctrl+C to stop the server")
        print("=" * 50)

        subprocess.run([sys.executable, '-m', 'backend.app'], check=True)
        
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