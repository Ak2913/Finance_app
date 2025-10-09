from flask import Blueprint, render_template, redirect, url_for, flash,request
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import or_, func
from finance.models import db, User
from finance.forms import LoginForm, RegistrationForm

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/login", methods=["GET","POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.dashboard')) 
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter(func.lower(User.username) == form.username.data.lower() ).first()

        if user and check_password_hash(user.password, form.password.data):
            login_user(user)
            return redirect(url_for("dashboard.dashboard"))  
        else:
            flash("Invalid username or password", "danger")
    return render_template("auth/login.html", form=form)

@auth_bp.route("/register", methods=["GET","POST"])
def register():
    if request.method == 'POST':
        username = request.form.get('username').strip()
        email = request.form.get('email').strip()
        password = request.form.get('password').strip()
        confirm_password = request.form.get('confirm_password').strip()  # optional

        
        if not username or not email or not password:
            flash("All fields are required!", "danger")
            return redirect(url_for('auth.register'))

        if password != confirm_password:
            flash("Passwords do not match!", "danger")
            return redirect(url_for('auth.register'))

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash("Email is already registered!", "warning")
            return redirect(url_for('auth.register'))

    
        new_user = User(
            username=username,
            email=email,
            password=generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
        )

        db.session.add(new_user)
        db.session.commit()

        flash("Registration successful! Please log in.", "success")
        return redirect(url_for('auth.login'))  

    return render_template('auth/register.html')
@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))
