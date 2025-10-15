from . import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


class Customer(db.Model):
    __tablename__ = 'customer'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    contact = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    id_proof = db.Column(db.String(255), nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    date = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)


class Payment(db.Model):
    __tablename__ = 'payment'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    cheque_number = db.Column(db.String(50), nullable=True)
    cheque_file = db.Column(db.String(255), nullable=True)
    date = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    probation_period = db.Column(db.String(50), nullable=True, default="3 months")
    status = db.Column(db.String(20), nullable=False, default="Pending")
    interest_rate = db.Column(db.Float, nullable=True, default=0.0)
    pending_amount = db.Column(db.Float, nullable=True, default=0.0)
    transactions = db.relationship("Transaction", backref="payment", cascade="all, delete")



class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payment.id'), nullable=False)
    user_id = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    deposit_amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)