# CampusConnect

CampusConnect is a Flask-based web application to manage student clubs, events, and coordinators. It provides user authentication, role-based access (student, student-coordinator, faculty-coordinator), event submission/approval workflows, and public club pages.

**Repository layout (partial)**

- backend/ — Flask app, blueprints, static files and templates
- run_app.py — helper script to run the backend server
- requirements.txt — Python dependencies



**Tech Stack**
- Language: Python 3.10.x
- Web framework: Flask (2.3.3)
- Database: MySQL (accessed via PyMySQL)
- Frontend: Server-rendered HTML templates + static CSS/JS
- Auth & Security: bcrypt password hashing; server-side sessions persisted to the MySQL database

Quick start (Windows)

1. Install dependencies:

```powershell
pip install -r requirements.txt
```

2. Set required environment variables in the same PowerShell session:

```powershell
$env:MYSQLHOST='localhost'
$env:MYSQLUSER='youruser'
$env:MYSQLPASSWORD='yourpassword'
$env:MYSQLDATABASE='campusconnect'
$env:MYSQLPORT='3306'
```

3. Ensure the MySQL schema/tables exist (create `users`, `sessions`, `clubs`, `events`, etc.).

4. Run the app:

```powershell
python run_app.py
# or
python -m backend.app
```

That's it — the server listens on `http://localhost:3000` by default.




