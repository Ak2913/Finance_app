from flask import Blueprint, render_template, request, redirect, url_for, jsonify, flash
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
from finance.models import db, Customer, Payment, Transaction
from datetime import datetime

dashboard_bp = Blueprint("dashboard", __name__)

UPLOAD_FOLDER = "finance/static/uploads"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_next_user_id():
    last = Customer.query.filter(Customer.user_id.like("U%")) \
        .order_by(Customer.user_id.desc()).first()
    if last and last.user_id[1:].isdigit():
        next_num = int(last.user_id[1:]) + 1
    else:
        next_num = 1
    return f"U{next_num:04d}"

from datetime import datetime, timedelta

@dashboard_bp.route("/")
@login_required
def dashboard():
    from_date = request.args.get("fromDate")
    to_date = request.args.get("toDate")
    range_filter = request.args.get("range")


    start_date = None
    end_date = None


    if from_date and to_date:
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)


    elif range_filter:
        today = datetime.today()
        if range_filter == "monthly":
            start_date = today.replace(day=1)
            end_date = today
        elif range_filter == "quarterly":
            start_date = today - timedelta(days=90)
            end_date = today
        elif range_filter == "six_month":
            start_date = today - timedelta(days=180)
            end_date = today
        elif range_filter == "yearly":
            start_date = today - timedelta(days=365)
            end_date = today

    
    payments_query = Payment.query
    if start_date and end_date:
        payments_query = payments_query.filter(Payment.date >= start_date, Payment.date <= end_date)

    payments = payments_query.all()

   
    total_investment = sum((p.amount or 0) for p in payments)
    
   
    total_profit = 0
    for p in payments:
        if p.probation_period and p.interest_rate:
            probation_months = int(p.probation_period.split(' ')[0]) if p.probation_period.split(' ')[0].isdigit() else 0
            interest_amount = (p.amount or 0) * (p.interest_rate / 100) * probation_months
            total_profit += interest_amount
    
    avg_percentage = (total_profit / total_investment * 100) if total_investment > 0 else 0
    
    remaining_amount = 0
    for p in payments:
        
        probation_months = int(p.probation_period.split(' ')[0]) if p.probation_period and p.probation_period.split(' ')[0].isdigit() else 0
        interest_amount = (p.amount or 0) * (p.interest_rate or 0) / 100 * probation_months
        total_payable = (p.amount or 0) + interest_amount
        
     
        total_deposits = db.session.query(db.func.coalesce(db.func.sum(Transaction.deposit_amount), 0)).filter(Transaction.payment_id == p.id).scalar() or 0
        
        
        remaining_amount += max(0, total_payable - total_deposits)
    
    total_customers = Customer.query.count()
    
 
    completed_customers = db.session.query(Customer).join(Payment, Customer.user_id == Payment.user_id).filter(Payment.status == "Done").distinct().count()
    
   
    pending_customers = db.session.query(Customer).join(Payment, Customer.user_id == Payment.user_id).filter(Payment.status == "Pending").distinct().count()

    return render_template(
        "dashboard/dashboard.html",
        user=current_user,
        total_investment=total_investment,
        total_profit=total_profit,
        avg_percentage=avg_percentage,
        remaining_amount=remaining_amount,
        total_customers=total_customers,
        completed_payment=completed_customers,
        pending_payment=pending_customers,
    )


@dashboard_bp.route("/users", methods=["GET", "POST"])
@login_required
def users():
    if request.method == "POST":
        user_id = (request.form.get("userId") or "").strip()
        name = request.form.get("name")
        address = request.form.get("address")
        email = request.form.get("email")
        contact = request.form.get("contact")
        status = request.form.get("status")

        id_file = request.files.get("idProof")
        photo_file = request.files.get("photo")

        id_filename = ""
        photo_filename = ""

        if id_file and allowed_file(id_file.filename):
            id_filename = secure_filename(id_file.filename)
            id_file.save(os.path.join(UPLOAD_FOLDER, id_filename))

        if photo_file and allowed_file(photo_file.filename):
            photo_filename = secure_filename(photo_file.filename)
            photo_file.save(os.path.join(UPLOAD_FOLDER, photo_filename))

        if not user_id:
            user_id = generate_next_user_id()

        customer = Customer(
            user_id=user_id,
            name=name,
            address=address,
            email=email,
            contact=contact,
            status=status,
            id_proof=id_filename,
            photo=photo_filename
        )
        db.session.add(customer)
        db.session.commit()

        return redirect(url_for("dashboard.users"))

    customers = Customer.query.all()
    users = [{
        "user_id": c.user_id,
        "name": c.name,
        "address": c.address,
        "email": c.email,
        "contact": c.contact,
        "status": c.status,
        "id_proof": c.id_proof or "",
        "photo": c.photo or "",
    } for c in customers]
    return render_template("dashboard/users.html", users=users)


@dashboard_bp.route("/users/edit", methods=["POST"])
@login_required
def edit_user():
    original_user_id = request.form.get("originalUserId")
    user_id = request.form.get("userId")
    name = request.form.get("name")
    address = request.form.get("address")
    email = request.form.get("email")
    contact = request.form.get("contact")
    status = request.form.get("status")

    id_file = request.files.get("idProof")
    photo_file = request.files.get("photo")

    id_filename = None
    photo_filename = None

    if id_file and allowed_file(id_file.filename):
        id_filename = secure_filename(id_file.filename)
        id_file.save(os.path.join(UPLOAD_FOLDER, id_filename))

    if photo_file and allowed_file(photo_file.filename):
        photo_filename = secure_filename(photo_file.filename)
        photo_file.save(os.path.join(UPLOAD_FOLDER, photo_filename))

    customer = Customer.query.filter_by(user_id=original_user_id).first()
    if customer:
        customer.user_id = user_id
        customer.name = name
        customer.address = address
        customer.email = email
        customer.contact = contact
        customer.status = status
        if id_filename is not None:
            customer.id_proof = id_filename
        if photo_filename is not None:
            customer.photo = photo_filename
        db.session.commit()

    return redirect(url_for("dashboard.users"))


@dashboard_bp.route("/payment_management")
@login_required
def payment_management():
    payments = Payment.query.order_by(Payment.date.desc()).all()
    enriched = []
    date_str = request.form.get("paymentDate")
    if date_str:
            
            date = datetime.strptime(date_str, "%Y-%m-%dT%H:%M")
    else:
            date = datetime.utcnow()  
    for p in payments:
        total_deposit = db.session.query(db.func.coalesce(db.func.sum(Transaction.deposit_amount), 0)).filter(Transaction.payment_id == p.id).scalar() or 0
       
        try:
            months = int(str(p.probation_period).split()[0])
        except Exception:
            months = 0
        monthly_rate = (p.interest_rate or 0)
        total_interest = (p.amount or 0) * monthly_rate / 100 * months
        total_due = (p.amount or 0) + total_interest
        pending = max(0, total_due - total_deposit)
        enriched.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": p.name,
            "amount": p.amount,
            "monthly_interest": monthly_rate,
            "pending": pending,
            "date": p.date,
            "probation_period": p.probation_period,
            "cheque_number": p.cheque_number,
            "status": p.status,
        })
    return render_template("dashboard/payment_management.html", user=current_user, payments=enriched)


@dashboard_bp.route("/payment_management", methods=["POST"])
@login_required
def add_payment():
    user_id = request.form.get("userId")
    name = request.form.get("name")
    amount = float(request.form.get("amount") or 0)
    cheque_number = request.form.get("chequeNumber")
    interest_rate = float(request.form.get("interestRate") or 0)
    probation_period = request.form.get("probationPeriod")
    cheque_file = request.files.get("chequeFile")

    cheque_filename = None
    if cheque_file and allowed_file(cheque_file.filename):
        cheque_filename = secure_filename(cheque_file.filename)
        cheque_file.save(os.path.join(UPLOAD_FOLDER, cheque_filename))

    payment = Payment(
        user_id=user_id,
        name=name,
        amount=float(amount or 0),
        interest_rate=interest_rate,
        cheque_number=cheque_number,
        probation_period=probation_period or "3 months",
        cheque_file=cheque_filename,
        status="Pending"
    

    )
    db.session.add(payment)
    db.session.commit()
    return redirect(url_for("dashboard.payment_management"))


@dashboard_bp.route("/payments/<int:payment_id>/transactions", methods=["POST"])
@login_required
def create_transaction(payment_id: int):
    payment = Payment.query.get_or_404(payment_id)
    deposit_amount = float(request.form.get("depositAmount") or 0)
    txn = Transaction(
        payment_id=payment.id,
        user_id=payment.user_id,
        name=payment.name,
        total_amount=payment.amount,
        deposit_amount=deposit_amount,
    )
    db.session.add(txn)
    db.session.commit()

    total_deposit = db.session.query(db.func.coalesce(db.func.sum(Transaction.deposit_amount), 0)).filter(Transaction.payment_id == payment.id).scalar() or 0
    if total_deposit  >= payment.amount:
        payment.status = "Done"
        customer = Customer.query.filter_by(user_id=payment.user_id).first()
        if customer:
            customer.status = "Inactive"
    else:
        payment.status = "Pending"
    db.session.commit()
    return redirect(url_for('dashboard.payment_management'))


@dashboard_bp.route("/payments/<int:payment_id>/transactions/list")
@login_required
def list_transactions(payment_id: int):
    txns = Transaction.query.filter_by(payment_id=payment_id).order_by(Transaction.date.asc()).all()
    if not txns:
        return jsonify([])
    return jsonify([
        {
            "user_id": t.user_id,
            "name": t.name,
            "total_amount": t.total_amount,
            "deposit_amount": t.deposit_amount,
            "date": t.date.strftime('%Y-%m-%d %H:%M')
        }
        for t in txns
    ])


@dashboard_bp.route("/payments/<int:payment_id>/delete", methods=["POST"])
@login_required
def delete_payment(payment_id: int):
    payment = Payment.query.get_or_404(payment_id)
    Transaction.query.filter_by(payment_id=payment.id).delete()
    db.session.delete(payment)
    db.session.commit()
    return redirect(url_for('dashboard.payment_management'))


@dashboard_bp.route("/api/customer/<user_id>")
@login_required
def api_get_customer(user_id: str):
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"user_id": customer.user_id, "name": customer.name})

@dashboard_bp.route("/statistics")
@login_required
def statistics():
    return render_template("dashboard/statistics.html", user=current_user)




@dashboard_bp.route('/users/<user_id>/delete', methods=['POST'])
@login_required
def delete_user(user_id):
    customer = Customer.query.filter_by(user_id=user_id).first()
    if not customer:
        return jsonify({"success": False, "error": "User not found"})

    payments = Payment.query.filter_by(user_id=user_id).all()
    for p in payments:
        Transaction.query.filter_by(payment_id=p.id).delete()
        db.session.delete(p)

    db.session.delete(customer)
    db.session.commit()
    return jsonify({"success": True})




@dashboard_bp.route("/api/dashboard_statistics", methods=["GET"])
@login_required
def dashboard_statistics():
    from datetime import datetime, timedelta

    from_date = request.args.get("fromDate")
    to_date = request.args.get("toDate")
    range_filter = request.args.get("range")

    start_date = None
    end_date = None

    if from_date and to_date:
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
    elif range_filter:
        today = datetime.today()
        if range_filter == "monthly":
            start_date = today.replace(day=1)
            end_date = today
        elif range_filter == "quarterly":
            start_date = today - timedelta(days=90)
            end_date = today
        elif range_filter == "six_month":
            start_date = today - timedelta(days=180)
            end_date = today
        elif range_filter == "yearly":
            start_date = today - timedelta(days=365)
            end_date = today

    payments_query = Payment.query
    if start_date and end_date:
        payments_query = payments_query.filter(Payment.date >= start_date, Payment.date <= end_date)

    payments = payments_query.all()

    total_investment = sum(p.amount for p in payments)
    total_profit = 0
    avg_percentage = 0
    remaining_amount = sum(
        (p.amount or 0) -
        db.session.query(db.func.coalesce(db.func.sum(Transaction.deposit_amount), 0))
        .filter(Transaction.payment_id == p.id).scalar()
        for p in payments
    )

    return jsonify({
        "total_investment": total_investment,
        "total_profit": total_profit,
        "avg_percentage": round(avg_percentage, 2),
        "remaining_amount": remaining_amount
    })
