from flask import Blueprint, render_template

event_workflow_bp = Blueprint('event_workflow', __name__)

# Event Workflow Navigation Routes
@event_workflow_bp.route('/events/create')
def create_event_workflow():
    """Navigate to event creation (Student Coordinator)"""
    return render_template('student-coordinator-dashboard.html')

@event_workflow_bp.route('/events/pending')
def pending_events_workflow():
    """Navigate to pending events (Faculty Coordinator)"""
    return render_template('faculty-dashboard.html')

@event_workflow_bp.route('/events/approve/<int:event_id>')
def approve_event_workflow(event_id):
    """Navigate to approve event (Faculty Coordinator)"""
    return render_template('faculty-dashboard.html')

@event_workflow_bp.route('/events/deny/<int:event_id>')
def deny_event_workflow(event_id):
    """Navigate to deny event (Faculty Coordinator)"""
    return render_template('faculty-dashboard.html')

@event_workflow_bp.route('/events/view-approved')
def view_approved_events():
    """Navigate to view approved events (Students & Coordinators)"""
    # Could redirect based on user role, but for now serve student dashboard
    return render_template('student-dashboard.html')

@event_workflow_bp.route('/events/view-my-events')
def view_my_events():
    """Navigate to view coordinator's events"""
    return render_template('student-coordinator-dashboard.html')