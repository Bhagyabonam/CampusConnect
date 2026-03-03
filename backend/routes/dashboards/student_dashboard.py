from flask import Blueprint, render_template

student_dashboard_bp = Blueprint('student_dashboard', __name__)

# Student Dashboard Navigation
@student_dashboard_bp.route('/student-dashboard')
@student_dashboard_bp.route('/student-dashboard.html')
def student_dashboard():
    """Serve Student Dashboard - shows approved events"""
    return render_template('student-dashboard.html')

# Student Dashboard specific routes
@student_dashboard_bp.route('/student-dashboard/events')
def student_dashboard_events():
    """Redirect or serve events view for students"""
    return render_template('student-dashboard.html')

@student_dashboard_bp.route('/student-dashboard/profile')
def student_dashboard_profile():
    """Student profile view"""
    return render_template('student-dashboard.html')

@student_dashboard_bp.route('/student-dashboard/wishlist')
def student_dashboard_wishlist():
    """Student wishlist view"""
    return render_template('student-dashboard.html')