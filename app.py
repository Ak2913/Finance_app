from finance import create_app
from flask import render_template,request
from flask_migrate import Migrate
from finance.models import db
from flask import Flask, jsonify, request, render_template, redirect, url_for

app = create_app()


migrate = Migrate(app, db)

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        return f"Logged in as: {username}" 
    return render_template("login.html")




if __name__ == "__main__":
    app.run(debug=True)
