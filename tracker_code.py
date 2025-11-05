from flask import Flask, render_template, jsonify, request, session, flash, redirect, url_for, Response,send_file
from pymongo import MongoClient
from urllib.parse import quote_plus
from bson.json_util import dumps
from pymongo import ReturnDocument
from datetime import timedelta
import os, secrets
import pandas as pd
from dotenv import load_dotenv
import io

if os.environ.get("FLASK_ENV") != "production":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

app = Flask(__name__)

# -------------------------
# Session Configuration
# -------------------------
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False  # set True when using HTTPS
)

# -------------------------------
# MongoDB Configuration
# -------------------------------
MONGO_USER = os.getenv('MONGODB_USER')
MONGO_PASS = os.getenv('MONGODB_PASSWORD')
CLUSTER_HOST = "cluster0.nmn50.mongodb.net"
DB_NAME = "instrument_data"
COLLECTION_NAME = "instrument_data"

uri = f"mongodb+srv://{quote_plus(MONGO_USER)}:{quote_plus(MONGO_PASS)}@{CLUSTER_HOST}/?retryWrites=true&w=majority"

# ✅ Use one shared MongoDB client (connection pooling)
mongoclient = MongoClient(
    uri,
    maxPoolSize=50,                 # adjust based on concurrency
    minPoolSize=0,
    serverSelectionTimeoutMS=5000,  # fail fast if unreachable
)
db_user = mongoclient["user_database"]
db_instrument = mongoclient[DB_NAME]
collection_users = db_user["users"]
collection_instruments = db_instrument[COLLECTION_NAME]

# ✅ Optional indexes (idempotent)
try:
    collection_instruments.create_index("sr_no")
    collection_instruments.create_index("user_name")
except Exception:
    pass


# -------------------------------
# Login & Authentication
# -------------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            flash("Please enter username and password", "danger")
            return render_template('login.html')

        user_doc = collection_users.find_one({'username': username})
        if not user_doc:
            flash("Invalid credentials", "danger")
            return render_template('login.html')

        if user_doc.get('password') == password:
            session['user'] = username
            session['name'] = user_doc.get('name', username)
            flash("Login successful", "success")
            return redirect(url_for('home'))
        else:
            flash("Invalid credentials", "danger")
            return render_template('login.html')

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('name', None)
    flash("Logged out", "info")
    return redirect(url_for('login'))


# -------------------------------
# Routes
# -------------------------------
@app.route('/')
def home():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/username')
def get_username():
    if 'user' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"username": session['user']}), 200


@app.route('/instrument-tracking')
def instrument_tracking():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('instrument_tracking.html')

@app.route('/pump-calculation')
def pump_calculation():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('pump_calculation.html')

# --------------------------------------
# MY TOOL-KIT SECTION
# --------------------------------------
@app.route('/instrument-data-owned-by-me')
def fetched_instrument_data_owned_by_me():
    if 'user' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        username = session['name']
        data = list(collection_instruments.find({"user_name": username}))
        return Response(dumps(data), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/data-for-removing-instrument', methods=['POST'])
def receive_data_for_removing_tool():
    if 'user' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        data = request.get_json()
        query = {"sr_no": data['sr_no']}
        update = {"$set": data}
        result = collection_instruments.update_one(query, update)

        return jsonify({
            "status": "success",
            "message": f"Updated {result.modified_count} document(s)" if result.matched_count else "No matching record found",
            "received": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------
# ADD INSTRUMENT SECTION
# --------------------------------------
@app.route('/instrument-data')
def fetched_instrument_data():
    try:
        data = list(collection_instruments.find({"user_name": "Available"}))
        return Response(dumps(data), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/all-instrument-data')
def all_instrument_data():
    try:
        data = list(collection_instruments.find())
        return Response(dumps(data), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/receive-data-for-add-instrument', methods=['POST'])
def receive_data():
    if 'user' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    try:
        data = request.get_json()
        query = {"sr_no": data['sr_no']}
        update = {"$set": data}
        result = collection_instruments.update_one(query, update)

        return jsonify({
            "status": "success",
            "message": f"Updated {result.modified_count} document(s)" if result.matched_count else "No matching record found",
            "received": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------
# ONBOARD NEW INSTRUMENT
# --------------------------------------
@app.route('/instrument-data-to-onboard-new-instrument')
def fetched_instrument_data_for_new_onboarding():
    try:
        data = list(collection_instruments.find({}, {"_id": 1, "instrument_id": 1, "sr_no": 1}))
        return Response(dumps(data), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/data-for-adding-new-instrument', methods=['POST'])
def add_new_instrument():
    try:
        data = request.get_json()
        collection_instruments.insert_one(data)
        return jsonify({"status": "success", "message": "Instrument added successfully!"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# --------------------------------------
# INSTRUMENT STATUS
# --------------------------------------
@app.route('/all-instrument-data_for_status')
def all_instrument_data_for_status():
    try:
        data = list(collection_instruments.find())
        return Response(dumps(data), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/download-instruments')
def download_instruments():
    try:
        # Replace this with your real DB query; I use a placeholder list-of-dicts
        # data = list(collection_instruments.find())
        data = list(collection_instruments.find())

        df = pd.DataFrame(data)

        # drop columns you don't want in the excel (example)
        df = df.drop(columns=['_id', 'instrument_id', 'calibration_Certificate'], errors='ignore')

        # create excel in-memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Instruments')

        output.seek(0)

        # send file as attachment
        return send_file(
            output,
            as_attachment=True,
            download_name='instruments.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        # helpful JSON error on failure
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Run Flask app
# -------------------------------   
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug, host='0.0.0.0', port=port)
