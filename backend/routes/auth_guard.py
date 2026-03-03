from functools import wraps
from flask import jsonify, request, g, session
from config import get_db_connection
import datetime


ROLE_STUDENT_COORDINATOR = 'student-coordinator'
ROLE_FACULTY_COORDINATOR = 'faculty-coordinator'


def _get_current_user():
    flask_user_id = session.get('user_id')

    connection = get_db_connection()
    if not connection:
        return None

    try:
        with connection.cursor() as cursor:
            if flask_user_id:
                cursor.execute(
                    """
                    SELECT id, student_number, email, name, role
                    FROM users
                    WHERE id = %s
                    """,
                    (flask_user_id,)
                )
                user = cursor.fetchone()
                if user:
                    return user

            session_id = request.cookies.get('session_id')
            if not session_id:
                return None

            cursor.execute(
                """
                SELECT u.id, u.student_number, u.email, u.name, u.role, s.expires_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.session_id = %s
                """,
                (session_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None

            expires_at = row.get('expires_at')
            if expires_at and expires_at < datetime.datetime.utcnow():
                try:
                    cursor.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
                    connection.commit()
                except Exception:
                    pass
                return None

            return {
                'id': row.get('id'),
                'student_number': row.get('student_number'),
                'email': row.get('email'),
                'name': row.get('name'),
                'role': row.get('role')
            }
    except Exception:
        return None
    finally:
        connection.close()


def require_roles(*allowed_roles):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user = _get_current_user()
            if not user:
                return jsonify({'error': 'Unauthorized'}), 401

            user_role = user.get('role')
            if allowed_roles and user_role not in allowed_roles:
                return jsonify({'error': 'Forbidden'}), 403

            g.current_user = user
            return func(*args, **kwargs)

        return wrapper

    return decorator
