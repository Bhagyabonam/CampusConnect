from flask import Blueprint, render_template

navigation_bp = Blueprint('navigation', __name__)

# General Navigation routes - serve main pages
@navigation_bp.route('/')
@navigation_bp.route('/index.html')
def index():
    return render_template('index.html')

@navigation_bp.route('/login')
@navigation_bp.route('/login.html')
def login():
    return render_template('login.html')

@navigation_bp.route('/signup')
@navigation_bp.route('/signup.html')
def signup():
    return render_template('signup.html')

@navigation_bp.route('/about-us')
@navigation_bp.route('/about-us.html')
def about_us():
    return render_template('about-us.html')

@navigation_bp.route('/account')
@navigation_bp.route('/account.html')
def account():
    return render_template('account.html')

@navigation_bp.route('/faq')
@navigation_bp.route('/faq.html')
def faq():
    return render_template('faq.html')

# Club pages
@navigation_bp.route('/cultural-club')
@navigation_bp.route('/cultural-club.html')
def cultural_club():
    return render_template('cultural-club.html')

@navigation_bp.route('/sports-club')
@navigation_bp.route('/sports-club.html')
def sports_club():
    return render_template('sports-club.html')

@navigation_bp.route('/tech-club')
@navigation_bp.route('/tech-club.html')
def tech_club():
    return render_template('tech-club.html')