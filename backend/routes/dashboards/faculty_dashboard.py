from flask import Blueprint, render_template

faculty_dashboard_bp = Blueprint('faculty_dashboard', __name__)

# Faculty Dashboard Navigation
@faculty_dashboard_bp.route('/faculty-dashboard')
@faculty_dashboard_bp.route('/faculty-dashboard.html')
def faculty_dashboard():
    """Serve Faculty Dashboard - for approving/denying events"""
    return render_template('faculty-dashboard.html')

# Faculty Dashboard specific routes
@faculty_dashboard_bp.route('/faculty-dashboard/pending-events')
def faculty_pending_events():
    """View pending events for approval"""
    return render_template('faculty-dashboard.html')

@faculty_dashboard_bp.route('/faculty-dashboard/approved-events')
def faculty_approved_events():
    """View approved events"""
    return render_template('faculty-dashboard.html')

@faculty_dashboard_bp.route('/faculty-dashboard/denied-events')
def faculty_denied_events():
    """View denied events"""
    return render_template('faculty-dashboard.html')