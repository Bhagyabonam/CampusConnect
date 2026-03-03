from flask import Blueprint, jsonify, request
from datetime import datetime
import pymysql
import json
from config import get_db_connection
from routes.auth_guard import require_roles, ROLE_STUDENT_COORDINATOR, ROLE_FACULTY_COORDINATOR

def convert_timedelta(obj):
    """Convert timedelta objects to string format for JSON serialization"""
    if isinstance(obj, dict):
        return {key: convert_timedelta(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_timedelta(item) for item in obj]
    elif hasattr(obj, 'total_seconds'):
        # This is a timedelta object
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

api_bp = Blueprint('api', __name__)

# ==================== USER ENDPOINTS (using your MySQL Workbench schema) ====================

@api_bp.route('/users/<student_number>', methods=['GET'])
def get_user(student_number):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users 
                WHERE student_number = %s
            """, (student_number,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            return jsonify(convert_timedelta(user))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/users/email/<path:email>', methods=['GET'])
def get_user_by_email(email):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users 
                WHERE email = %s
            """, (email,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            return jsonify(convert_timedelta(user))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    student_number = data.get('student_number')
    email = data.get('email')
    name = data.get('name')
    role = data.get('role', 'student')

    if not student_number or not email:
        return jsonify({"error": "Student number and email are required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if user already exists
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM users 
                WHERE student_number = %s OR email = %s
            """, (student_number, email))
            
            if cursor.fetchone()['count'] > 0:
                return jsonify({"error": "Email or student number already exists"}), 409
            
            # Insert new user (using default password for now)
            cursor.execute("""
                INSERT INTO users (student_number, email, name, role, password_hash) 
                VALUES (%s, %s, %s, %s, %s)
            """, (student_number, email, name, role, '$2b$12$dummy.hash.for.demo'))
            
            connection.commit()
            
            # Return the created user
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users 
                WHERE student_number = %s
            """, (student_number,))
            
            user = cursor.fetchone()
            return jsonify(convert_timedelta(user)), 201
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/users', methods=['GET'])
def get_all_users():
    """Get all users"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users
                ORDER BY created_at DESC
            """)
            
            users = cursor.fetchall()
            return jsonify(convert_timedelta(users))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

# ==================== DATA ENDPOINTS ====================

@api_bp.route('/data', methods=['GET'])
def get_data():
    return jsonify({"message": "Database connection active"})

@api_bp.route('/data', methods=['POST'])
def save_data():
    return jsonify({"success": True, "message": "Data saved successfully"})

# ==================== CLUBS ENDPOINTS ====================

@api_bp.route('/clubs', methods=['GET'])
def get_all_clubs():
    """Get all clubs"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, created_at 
                FROM clubs
                ORDER BY name ASC
            """)
            
            clubs = cursor.fetchall()
            return jsonify(convert_timedelta(clubs))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/clubs/<int:club_id>', methods=['GET'])
def get_club(club_id):
    """Get a specific club by ID"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, description, created_at 
                FROM clubs
                WHERE id = %s
            """, (club_id,))
            
            club = cursor.fetchone()
            if not club:
                return jsonify({"error": "Club not found"}), 404
            
            return jsonify(convert_timedelta(club))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/clubs', methods=['POST'])
def create_club():
    """Create a new club"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')

    if not name:
        return jsonify({"error": "Club name is required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if club already exists
            cursor.execute("SELECT COUNT(*) as count FROM clubs WHERE name = %s", (name,))
            
            if cursor.fetchone()['count'] > 0:
                return jsonify({"error": "Club already exists"}), 409
            
            # Insert new club
            cursor.execute("""
                INSERT INTO clubs (name, description) 
                VALUES (%s, %s)
            """, (name, description))
            
            connection.commit()
            
            # Return the created club
            cursor.execute("""
                SELECT id, name, description, created_at 
                FROM clubs 
                WHERE name = %s
            """, (name,))
            
            club = cursor.fetchone()
            return jsonify(convert_timedelta(club)), 201
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/club-content', methods=['GET'])
def get_public_club_content():
    """Get public club page content and sub-clubs by slug from MySQL."""
    slug = (request.args.get('slug') or '').strip().lower()
    if not slug:
        return jsonify({"error": "slug query parameter is required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT slug, name, description, hero_image_url
                FROM club_public_content
                WHERE slug = %s
                LIMIT 1
            """, (slug,))
            club = cursor.fetchone()

            if not club:
                return jsonify({"error": f"No public club content found for slug '{slug}'"}), 404

            cursor.execute("""
                SELECT
                    subclub_key,
                    title,
                    short_description,
                    full_description,
                    members,
                    activities,
                    image_url,
                    sort_order
                FROM club_public_subclubs
                WHERE club_slug = %s
                ORDER BY sort_order ASC, id ASC
            """, (slug,))
            sub_clubs = cursor.fetchall()

            return jsonify({
                "club": convert_timedelta(club),
                "sub_clubs": convert_timedelta(sub_clubs)
            })

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/gallery-images', methods=['GET'])
def get_home_gallery_images():
    """Get active home gallery images ordered for public home page."""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, title, image_url, display_order, is_active
                FROM home_gallery_images
                WHERE is_active = 1
                ORDER BY display_order ASC, id ASC
            """)
            images = cursor.fetchall()
            return jsonify(convert_timedelta(images))
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

# ==================== EVENT MANAGEMENT ENDPOINTS (using your MySQL Workbench schema) ====================

@api_bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()
    title = data.get('title')
    club_id = data.get('club_id')
    category = data.get('category')
    date = data.get('date')
    time = data.get('time')
    location = data.get('location')
    description = data.get('description')
    banner_url = data.get('banner_url', '')
    form_link = data.get('form_link')
    coordinator_id = data.get('coordinator_id')

    if not all([title, club_id, category, date, time, location, description, form_link, coordinator_id]):
        return jsonify({"error": "All fields are required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO events (title, club_id, category, date, time, location, description, banner_url, form_link, coordinator_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (title, club_id, category, date, time, location, description, banner_url, form_link, coordinator_id))
            
            connection.commit()
            
            # Get the created event with coordinator details
            event_id = cursor.lastrowid
            cursor.execute("""
                SELECT e.id, e.title, e.club_id, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s
            """, (event_id,))
            
            event = cursor.fetchone()
            return jsonify({"success": True, "message": "Event submitted for approval", "event": convert_timedelta(event)}), 201
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/pending', methods=['GET'])
def get_pending_events():
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.status = 'pending'
                ORDER BY e.created_at DESC
            """)
            
            pending_events = cursor.fetchall()
            return jsonify(convert_timedelta(pending_events))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/<int:event_id>/approve', methods=['PUT'])
def approve_event(event_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if event exists and is pending
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s AND e.status = 'pending'
            """, (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return jsonify({"error": "Event not found or already processed"}), 404
            
            # Update event status to approved
            cursor.execute("""
                UPDATE events 
                SET status = 'approved', approved_at = NOW()
                WHERE id = %s
            """, (event_id,))
            
            connection.commit()
            
            # Convert event to proper format for JSON serialization
            event['status'] = 'approved'
            event['approved_at'] = datetime.now().isoformat()
            
            return jsonify({
                "success": True, 
                "message": "Event approved successfully! Event is now visible to all students.",
                "event": convert_timedelta(event)
            })
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/<int:event_id>/deny', methods=['PUT'])
def deny_event(event_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if event exists and is pending
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, c.name as club_name, u.name as coordinator_name
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s AND e.status = 'pending'
            """, (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return jsonify({"error": "Event not found or already processed"}), 404
            
            # Get rejection reason from request body
            data = request.get_json()
            rejection_reason = data.get('rejection_reason', '')
            
            # Update event status to denied with rejection reason
            cursor.execute("""
                UPDATE events 
                SET status = 'denied', denied_at = NOW(), rejection_reason = %s
                WHERE id = %s
            """, (rejection_reason, event_id))
            
            connection.commit()
            
            # Add denied_at and rejection_reason fields to the event
            event['status'] = 'denied'
            event['denied_at'] = datetime.now().isoformat()
            event['rejection_reason'] = rejection_reason
            
            return jsonify({"success": True, "message": "Event denied", "event": convert_timedelta(event)})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events', methods=['GET'])
def get_all_events():
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at, e.approved_at, e.denied_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                ORDER BY e.created_at DESC
            """)
            
            all_events = cursor.fetchall()
            return jsonify(convert_timedelta(all_events))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/coordinator/<student_number>', methods=['GET'])
def get_coordinator_events(student_number):
    """Get events created by a specific coordinator"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at, e.approved_at, e.denied_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE u.student_number = %s
                ORDER BY e.created_at DESC
            """, (student_number,))
            
            coordinator_events = cursor.fetchall()
            return jsonify(convert_timedelta(coordinator_events))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    """Get a specific event by ID"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.club_id, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at, e.approved_at, e.denied_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s
            """, (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return jsonify({"error": "Event not found"}), 404
            
            return jsonify(convert_timedelta(event))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an event (only pending events can be updated)"""
    data = request.get_json()
    title = data.get('title')
    club_id = data.get('club_id')
    category = data.get('category')
    date = data.get('date')
    time = data.get('time')
    location = data.get('location')
    description = data.get('description')
    banner_url = data.get('banner_url', '')
    form_link = data.get('form_link')

    if not all([title, club_id, category, date, time, location, description, form_link]):
        return jsonify({"error": "All fields are required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if event exists and is pending
            cursor.execute("SELECT status FROM events WHERE id = %s", (event_id,))
            event = cursor.fetchone()
            
            if not event:
                return jsonify({"error": "Event not found"}), 404
            
            if event['status'] != 'pending':
                return jsonify({"error": "Only pending events can be edited"}), 400
            
            # Update the event
            cursor.execute("""
                UPDATE events 
                SET title = %s, club_id = %s, category = %s, date = %s, time = %s, 
                    location = %s, description = %s, banner_url = %s, form_link = %s
                WHERE id = %s
            """, (title, club_id, category, date, time, location, description, banner_url, form_link, event_id))
            
            connection.commit()
            
            # Return the updated event
            cursor.execute("""
                SELECT e.id, e.title, e.club_id, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, e.created_at,
                       c.name as club_name, u.name as coordinator_name, u.email as coordinator_email
                FROM events e
                JOIN clubs c ON e.club_id = c.id
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s
            """, (event_id,))
            
            updated_event = cursor.fetchone()
            return jsonify({"success": True, "message": "Event updated successfully", "event": convert_timedelta(updated_event)}), 200
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()


@api_bp.route('/analytics/coordinator', methods=['GET'])
@require_roles(ROLE_STUDENT_COORDINATOR)
def get_coordinator_analytics():
    """Get analytics for the currently authenticated student coordinator."""
    from flask import g

    coordinator_id = g.current_user.get('id')

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_events,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_events,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_events,
                    COALESCE(SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END), 0) AS denied_events
                FROM events
                WHERE coordinator_id = %s
                """,
                (coordinator_id,)
            )
            analytics = cursor.fetchone() or {
                'total_events': 0,
                'pending_events': 0,
                'approved_events': 0,
                'denied_events': 0
            }
            return jsonify(convert_timedelta(analytics))

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()


@api_bp.route('/analytics/faculty', methods=['GET'])
@require_roles(ROLE_FACULTY_COORDINATOR)
def get_faculty_analytics():
    """Get analytics for faculty coordinator dashboard."""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_events,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_events,
                    COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_events,
                    COALESCE(SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END), 0) AS denied_events
                FROM events
                """
            )
            analytics = cursor.fetchone() or {
                'total_events': 0,
                'pending_events': 0,
                'approved_events': 0,
                'denied_events': 0
            }
            return jsonify(convert_timedelta(analytics))

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

# ==================== WISHLIST ENDPOINTS (using your MySQL Workbench schema) ====================

@api_bp.route('/wishlist/<student_number>', methods=['GET'])
def get_wishlist(student_number):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, u2.name as coordinator_name
                FROM wishlist w
                JOIN events e ON w.event_id = e.id
                JOIN users u ON w.user_id = u.id
                JOIN users u2 ON e.coordinator_id = u2.id
                WHERE u.student_number = %s
                ORDER BY w.added_at DESC
            """, (student_number,))
            
            wishlist = cursor.fetchall()
            return jsonify(convert_timedelta(wishlist))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/wishlist', methods=['POST'])
def add_to_wishlist():
    data = request.get_json()
    student_number = data.get('student_number')
    event_id = data.get('event_id')

    if not student_number or not event_id:
        return jsonify({"error": "Student number and event ID are required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE student_number = %s", (student_number,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Check if event exists and is approved
            cursor.execute("SELECT COUNT(*) as count FROM events WHERE id = %s AND status = 'approved'", (event_id,))
            if cursor.fetchone()['count'] == 0:
                return jsonify({"error": "Event not found or not approved"}), 404
            
            # Add to wishlist
            cursor.execute("""
                INSERT INTO wishlist (user_id, event_id) 
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE added_at = NOW()
            """, (user['id'], event_id))
            
            connection.commit()
            return jsonify({"success": True, "message": "Event added to wishlist"})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/wishlist/<student_number>/<int:event_id>', methods=['DELETE'])
def remove_from_wishlist(student_number, event_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Get user ID
            cursor.execute("SELECT id FROM users WHERE student_number = %s", (student_number,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            cursor.execute("""
                DELETE FROM wishlist 
                WHERE user_id = %s AND event_id = %s
            """, (user['id'], event_id))
            
            connection.commit()
            return jsonify({"success": True, "message": "Event removed from wishlist"})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

# ==================== REGISTRATION ENDPOINTS (using your MySQL Workbench schema) ====================

@api_bp.route('/registrations/<student_number>', methods=['GET'])
def get_registrations(student_number):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.title, e.category, e.date, e.time, e.location, e.description, 
                       e.banner_url, e.form_link, e.status, u2.name as coordinator_name
                FROM event_registrations r
                JOIN events e ON r.event_id = e.id
                JOIN users u ON r.user_id = u.id
                JOIN users u2 ON e.coordinator_id = u2.id
                WHERE u.student_number = %s
                ORDER BY r.registered_at DESC
            """, (student_number,))
            
            registrations = cursor.fetchall()
            return jsonify(convert_timedelta(registrations))
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/registrations/event/<int:event_id>', methods=['GET'])
def get_event_registrations_for_coordinator(event_id):
    """Get all students registered for a specific event (coordinator-owned event)."""
    coordinator_student_number = request.args.get('coordinator_student_number')

    if not coordinator_student_number:
        return jsonify({"error": "coordinator_student_number is required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            # Validate coordinator
            cursor.execute("""
                SELECT id, role
                FROM users
                WHERE student_number = %s
            """, (coordinator_student_number,))
            coordinator = cursor.fetchone()

            if not coordinator:
                return jsonify({"error": "Coordinator not found"}), 404

            if coordinator['role'] != 'student-coordinator':
                return jsonify({"error": "Only student coordinators can view event registrations"}), 403

            # Validate event ownership
            cursor.execute("""
                SELECT id, coordinator_id, title
                FROM events
                WHERE id = %s
            """, (event_id,))
            event = cursor.fetchone()

            if not event:
                return jsonify({"error": "Event not found"}), 404

            if event['coordinator_id'] != coordinator['id']:
                return jsonify({"error": "You can view registrations only for your own events"}), 403

            # Get registered student details
            cursor.execute("""
                SELECT
                    u.id,
                    u.name,
                    u.student_number,
                    u.email,
                    r.registered_at
                FROM event_registrations r
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = %s
                ORDER BY r.registered_at DESC
            """, (event_id,))

            registrations = cursor.fetchall()
            return jsonify(convert_timedelta(registrations))

    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/registrations', methods=['POST'])
def register_for_event():
    data = request.get_json()
    student_number = data.get('student_number')
    event_id = data.get('event_id')

    if not student_number or not event_id:
        return jsonify({"error": "Student number and event ID are required"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE student_number = %s", (student_number,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Check if event exists and is approved
            cursor.execute("SELECT COUNT(*) as count FROM events WHERE id = %s AND status = 'approved'", (event_id,))
            if cursor.fetchone()['count'] == 0:
                return jsonify({"error": "Event not found or not approved"}), 404
            
            # Register for event
            cursor.execute("""
                INSERT INTO event_registrations (user_id, event_id, event_title)
                SELECT %s, %s, title FROM events WHERE id = %s
                ON DUPLICATE KEY UPDATE registered_at = NOW()
            """, (user['id'], event_id, event_id))
            
            connection.commit()
            return jsonify({"success": True, "message": "Successfully registered for event"})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/registrations/<student_number>/<int:event_id>', methods=['DELETE'])
def unregister_from_event(student_number, event_id):
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Get user ID
            cursor.execute("SELECT id FROM users WHERE student_number = %s", (student_number,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            cursor.execute("""
                DELETE FROM event_registrations 
                WHERE user_id = %s AND event_id = %s
            """, (user['id'], event_id))
            
            connection.commit()
            return jsonify({"success": True, "message": "Successfully unregistered from event"})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@api_bp.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event by ID (only for coordinators to delete their own events)"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if event exists and get coordinator info
            cursor.execute("""
                SELECT e.id, e.title, e.status, e.date, e.coordinator_id, u.student_number
                FROM events e
                JOIN users u ON e.coordinator_id = u.id
                WHERE e.id = %s
            """, (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return jsonify({"error": "Event not found"}), 404
            
            event_date = event.get('date')
            if not event_date:
                return jsonify({"error": "Event date is missing. Cannot validate delete eligibility."}), 400

            today = datetime.now().date()
            is_completed = event_date < today

            if is_completed:
                return jsonify({"error": "Completed events cannot be deleted"}), 400

            status = (event.get('status') or '').lower()
            if status == 'approved':
                can_delete = True
            elif status in ['pending', 'denied']:
                can_delete = True
            else:
                can_delete = False

            if not can_delete:
                return jsonify({"error": "Only pending, denied, or approved upcoming events can be deleted"}), 400
            
            # Delete from wishlist first (foreign key constraint)
            cursor.execute("DELETE FROM wishlist WHERE event_id = %s", (event_id,))
            
            # Delete from registrations first (foreign key constraint)
            cursor.execute("DELETE FROM event_registrations WHERE event_id = %s", (event_id,))
            
            # Delete the event
            cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
            
            connection.commit()
            return jsonify({"success": True, "message": f"Event '{event['title']}' deleted successfully"})
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()
