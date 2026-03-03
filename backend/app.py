from flask import Flask, send_file
from flask_cors import CORS
import os
from .routes.navigation import navigation_bp
from .routes.api import api_bp
from .routes.auth import auth_bp
from .routes.dashboards.student_dashboard import student_dashboard_bp
from .routes.dashboards.faculty_dashboard import faculty_dashboard_bp
from .routes.dashboards.student_coordinator_dashboard import student_coordinator_dashboard_bp
from .routes.dashboards.event_workflow import event_workflow_bp
from .config import init_db, seed_data

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get('PORT', 3000))

# Register blueprints
app.register_blueprint(navigation_bp)
app.register_blueprint(api_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(student_dashboard_bp)
app.register_blueprint(faculty_dashboard_bp)
app.register_blueprint(student_coordinator_dashboard_bp)
app.register_blueprint(event_workflow_bp)

# Serve static files fallback for legacy root paths
@app.route('/<path:filename>')
def serve_static(filename):
    # Don't serve files for API routes
    if filename.startswith('api/') or filename.startswith('auth/'):
        return "Not found", 404
    
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    file_path = os.path.join(static_dir, filename)

    if not os.path.exists(file_path):
        if filename == 'style.css':
            file_path = os.path.join(static_dir, 'css', 'style.css')
        elif filename == 'script.js':
            file_path = os.path.join(static_dir, 'js', 'script.js')

    if os.path.exists(file_path):
        return send_file(file_path)
    else:
        return "File not found", 404

# Health check
@app.route('/health')
def health():
    return {"status": "ok"}

if __name__ == '__main__':
    # Initialize database
    print("Initializing database...")
    if init_db():
        seed_data()
        print("Database setup complete!")
    else:
        print("Failed to initialize database!")
    
    app.run(host='0.0.0.0', port=PORT, debug=True)
