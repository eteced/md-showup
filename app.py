import os
from flask import Flask, render_template, request, jsonify
import auth
import file_service
import config

app = Flask(__name__)


@app.before_request
def check_auth():
    return auth.require_auth()


@app.route("/")
def index():
    return render_template("files.html")


@app.route("/view/<path:relpath>")
def view_file(relpath):
    return render_template("viewer.html")


@app.route("/api/login", methods=["POST"])
def login():
    return auth.handle_login()


@app.route("/api/logout", methods=["POST"])
def logout():
    return auth.handle_logout()


@app.route("/api/files")
def list_files():
    return file_service.handle_list_files()


@app.route("/api/file/<path:relpath>")
def get_file(relpath):
    return file_service.handle_get_file(relpath)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=False)
