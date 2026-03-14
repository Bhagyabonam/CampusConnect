from flask import Blueprint, jsonify, request, make_response, session
import pymysql
from ..config import get_db_connection
import bcrypt
import uuid
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['student_number', 'email', 'name', 'role', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
    
    student_number = data.get('student_number')
    email = data.get('email')
    name = data.get('name')
    role = data.get('role')
    password = data.get('password')
    
    # Validate role
    valid_roles = ['student', 'student-coordinator', 'faculty-coordinator']
    if role not in valid_roles:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
    
    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
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
            
            # Insert new user
            cursor.execute("""
                INSERT INTO users (student_number, email, name, role, password_hash) 
                VALUES (%s, %s, %s, %s, %s)
            """, (student_number, email, name, role, password_hash))
            
            connection.commit()
            
            # Return the created user (without password hash)
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users 
                WHERE student_number = %s
            """, (student_number,))
            
            user = cursor.fetchone()
            return jsonify({
                "success": True, 
                "message": "User registered successfully",
                "user": user
            }), 201
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()


@auth_bp.route('/me', methods=['GET'])
def me():
    """Return current authenticated user based on Flask session or session cookie."""
    flask_user_id = session.get('user_id')
    connection = get_db_connection()
    if not connection:
        return jsonify({}), 204

    try:
        with connection.cursor() as cursor:
            # Prefer Flask session user id when available
            if flask_user_id:
                cursor.execute("""
                    SELECT id, student_number, email, name, role, created_at
                    FROM users
                    WHERE id = %s
                """, (flask_user_id,))
                row = cursor.fetchone()
                if row:
                    user = {
                        'id': row.get('id'),
                        'student_number': row.get('student_number'),
                        'email': row.get('email'),
                        'name': row.get('name'),
                        'role': row.get('role'),
                        'created_at': row.get('created_at')
                    }
                    return jsonify(user)

            # Fallback to cookie-backed sessions stored in DB
            session_id = request.cookies.get('session_id')
            if not session_id:
                return jsonify({}), 204

            cursor.execute("""
                SELECT u.id, u.student_number, u.email, u.name, u.role, u.created_at, s.expires_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.session_id = %s
            """, (session_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({}), 204

            # Check expiry
            expires_at = row.get('expires_at')
            if expires_at and expires_at < datetime.datetime.utcnow():
                try:
                    cursor.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
                    connection.commit()
                except Exception:
                    pass
                return jsonify({}), 204

            user = {
                'id': row.get('id'),
                'student_number': row.get('student_number'),
                'email': row.get('email'),
                'name': row.get('name'),
                'role': row.get('role'),
                'created_at': row.get('created_at')
            }
            return jsonify(user)
    except Exception:
        return jsonify({}), 204
    finally:
        connection.close()


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({"success": True}), 200

    connection = get_db_connection()
    if connection:
        try:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
                connection.commit()
        except Exception:
            pass
        finally:
            connection.close()

    resp = make_response(jsonify({"success": True}))
    # Clear cookie
    resp.set_cookie('session_id', '', expires=0, path='/')
    return resp

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Get user by email
            cursor.execute("""
                SELECT id, student_number, email, name, role, password_hash, created_at 
                FROM users 
                WHERE email = %s
            """, (email,))
            
            user = cursor.fetchone()
            
            if not user:
                return jsonify({"error": "Invalid email or password"}), 401
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({"error": "Invalid email or password"}), 401
            
            # Remove password hash from response
            user.pop('password_hash', None)

            # Create server-side session persisted to MySQL
            # Also store user id in Flask session for convenience
            try:
                session['user_id'] = user['id']
            except Exception:
                # If Flask session cannot be set, continue — server-side sessions still work
                pass
            session_id = uuid.uuid4().hex
            now = datetime.datetime.utcnow()
            expires = now + datetime.timedelta(days=7)

            try:
                with connection.cursor() as cur2:
                    cur2.execute("""
                        INSERT INTO sessions (session_id, user_id, created_at, expires_at)
                        VALUES (%s, %s, %s, %s)
                    """, (session_id, user['id'], now, expires))
                    connection.commit()
            except Exception:
                # If session insert fails, continue without session
                pass

            resp = make_response(jsonify({
                "success": True,
                "message": "Login successful",
                "user": user
            }))
            # Set HttpOnly cookie with session id; adjust SameSite/Secure as needed for production
            resp.set_cookie('session_id', session_id, httponly=True, samesite='Lax', path='/', max_age=7*24*3600)
            return resp
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Reset password when user forgets it"""
    data = request.get_json() or {}

    email = data.get('email')
    student_number = data.get('student_number')
    new_password = data.get('new_password')

    if not email or not student_number or not new_password:
        return jsonify({"error": "Email, student number, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500

    try:
        with connection.cursor() as cursor:
            # Validate user exists
            cursor.execute("""
                SELECT id
                FROM users
                WHERE email = %s AND student_number = %s
            """, (email, student_number))

            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "No user found with provided email and student number"}), 404

            # Update password hash
            new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute("""
                UPDATE users
                SET password_hash = %s
                WHERE id = %s
            """, (new_password_hash, user['id']))

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Password updated successfully. Please login with your new password."
            })

    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/profile/<student_number>', methods=['GET'])
def get_profile(student_number):
    """Get user profile by student number"""
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
            
            return jsonify(user)
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/profile/email/<path:email>', methods=['GET'])
def get_profile_by_email(email):
    """Get user profile by email"""
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
            
            return jsonify(user)
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/users', methods=['GET'])
def get_all_users():
    """Get all users (for admin purposes)"""
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
            return jsonify(users)
            
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update user information"""
    data = request.get_json()
    
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cursor.fetchone():
                return jsonify({"error": "User not found"}), 404
            
            # Update user
            update_fields = []
            values = []
            
            if 'name' in data:
                update_fields.append("name = %s")
                values.append(data['name'])
            
            if 'email' in data:
                update_fields.append("email = %s")
                values.append(data['email'])
            
            if 'role' in data:
                valid_roles = ['student', 'student-coordinator', 'faculty-coordinator']
                if data['role'] not in valid_roles:
                    return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
                update_fields.append("role = %s")
                values.append(data['role'])
            
            if update_fields:
                values.append(user_id)
                query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(query, values)
                connection.commit()
            
            # Return updated user
            cursor.execute("""
                SELECT id, student_number, email, name, role, created_at 
                FROM users 
                WHERE id = %s
            """, (user_id,))
            
            user = cursor.fetchone()
            return jsonify({
                "success": True,
                "message": "User updated successfully",
                "user": user
            })
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()

@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user account"""
    connection = get_db_connection()
    if not connection:
        return jsonify({"error": "Database connection failed"}), 500
    
    try:
        with connection.cursor() as cursor:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cursor.fetchone():
                return jsonify({"error": "User not found"}), 404
            
            # Delete user (CASCADE will handle related records)
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            connection.commit()
            
            return jsonify({
                "success": True,
                "message": "User deleted successfully"
            })
            
    except Exception as e:
        connection.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        connection.close()