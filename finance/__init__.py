from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db=SQLAlchemy()
login_manager= LoginManager()
login_manager.login_view="auth.login"
login_manager.login_message = None 

def create_app():
    app=Flask(__name__, instance_relative_config=False)
    app.config.from_object("config.Config")

    db.init_app(app)
    login_manager.init_app(app)

    from .auth.routes import auth_bp
    from .dashboard.routes import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    with app.app_context():
        db.create_all()
        
        try:
            from sqlalchemy import text
            result = db.session.execute(text("PRAGMA table_info(customer)"))
            cols = [row[1] for row in result.fetchall()]
            if 'date' not in cols:
                db.session.execute(text("ALTER TABLE customer ADD COLUMN date DATETIME DEFAULT CURRENT_TIMESTAMP"))
                db.session.commit()
        except Exception:
       
            db.session.rollback()
    
    return app

from .models import User 
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
   

