from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import bcrypt
import requests
import csv
import io

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# 1. Database Connection
# IMPORTANT: Replace 'localhost\SQLEXPRESS' with your actual server name if different.
# If you are not sure, run 'osql -L' in cmd to find it.
SERVER_NAME = r'localhost\SQLEXPRESS'

conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER_NAME};"
    f"DATABASE=DarkWolvesDB;"
    f"Trusted_Connection=yes;"
    f"TrustServerCertificate=yes;"
)

# 2. Google Sheet Configuration
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=0"


def get_db_connection():
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return None


# --- NEW ROUTE: Fetch Jobs from Google Sheet ---
@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        # 1. Download the sheet as CSV
        response = requests.get(SHEET_URL)
        response.raise_for_status()

        # 2. Parse the CSV data
        # Use 'utf-8-sig' to handle potential BOM characters from Excel/Google Sheets
        csv_file = io.StringIO(response.content.decode('utf-8-sig'))
        reader = csv.DictReader(csv_file)

        jobs = []
        for i, row in enumerate(reader):
            # Safe parsing with defaults
            company_name = row.get("Company Name", "N/A")

            jobs.append({
                "id": i + 1,
                "title": row.get("Role", "N/A"),
                "company": company_name,
                "location": row.get("Location", "Remote"),
                "salary": row.get("Salary", "Competitive"),
                "type": row.get("Type", "Full Time"),
                # Create a fake logo from the first 2 letters of company name
                "logo": (company_name[:2] if company_name else "DW").upper()
            })

        return jsonify(jobs)

    except Exception as e:
        print(f"Sheet Error: {e}")
        return jsonify({"error": "Failed to load jobs from sheet"}), 500


# --- Auth Routes ---
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if not data or not all(k in data for k in ('fullName', 'email', 'password')):
            return jsonify({"error": "Missing fields"}), 400

        hashed_pw = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        if not conn: return jsonify({"error": "Database Connection Failed"}), 500

        cursor = conn.cursor()
        # Check if email exists
        cursor.execute("SELECT UserID FROM Users WHERE Email = ?", (data['email'],))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 409

        cursor.execute("INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)",
                       (data['fullName'], data['email'], hashed_pw))
        conn.commit()
        return jsonify({"message": "User created"}), 201
    except Exception as e:
        print(f"Signup Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        if not data or not all(k in data for k in ('email', 'password')):
            return jsonify({"error": "Missing fields"}), 400

        conn = get_db_connection()
        if not conn: return jsonify({"error": "Database Connection Failed"}), 500

        cursor = conn.cursor()
        cursor.execute("SELECT UserID, FullName, PasswordHash FROM Users WHERE Email = ?", (data['email'],))
        user = cursor.fetchone()

        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.PasswordHash.encode('utf-8')):
            return jsonify({"message": "Success", "user": {"name": user.FullName}}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)