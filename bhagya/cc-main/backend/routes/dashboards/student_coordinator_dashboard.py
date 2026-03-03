from flask import Blueprint, render_template

student_coordinator_dashboard_bp = Blueprint('student_coordinator_dashboard', __name__)

# Student Coordinator Dashboard Navigation
@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard')
@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard.html')
def student_coordinator_dashboard():
    """Serve Student Coordinator Dashboard - for creating and managing events"""
    return render_template('student-coordinator-dashboard.html')

# Student Coordinator Dashboard specific routes
@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard/create-event')
def create_event():
    """Create new event form"""
    return render_template('student-coordinator-dashboard.html')

@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard/my-events')
def my_events():
    """View coordinator's events"""
    return render_template('student-coordinator-dashboard.html')

@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard/pending-approval')
def pending_approval():
    """View events pending faculty approval"""
    return render_template('student-coordinator-dashboard.html')

@student_coordinator_dashboard_bp.route('/student-coordinator-dashboard/approved-events')
def approved_events():
    """View approved events"""
    return render_template('student-coordinator-dashboard.html')