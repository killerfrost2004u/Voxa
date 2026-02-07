from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc
import bcrypt
import requests
import csv
import io
import urllib.parse
import itertools

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"

# --- DATABASE CONNECTION ---
conn_str = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER_NAME};"
    f"DATABASE=DarkWolvesDB;"
    f"Trusted_Connection=yes;"
    f"TrustServerCertificate=yes;"
)


def get_db_connection():
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return None


# --- HELPER: CLEAN TEXT TO LIST ---
def clean_text_list(text):
    """Splits text into a clean list of bullet points."""
    if not text: return []
    # Replace common separators with newlines
    text = text.replace('\r', '\n').replace('•', '\n').replace('-', '\n')
    lines = text.split('\n')

    cleaned_items = []
    for line in lines:
        line = line.strip()
        # Remove common bullet characters at the start
        for char in ['*', '-', '•', '🔹', '✅', '🛑', '👉', '📝', '✨']:
            if line.startswith(char):
                line = line[1:].strip()

        if line and len(line) > 2:  # Ignore tiny junk lines
            cleaned_items.append(line)
    return cleaned_items


# --- ROUTES ---

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        # 1. Fetch CSV
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"

        print(f"📥 Fetching sheet data...")
        response = requests.get(url)
        response.raise_for_status()

        # 2. Parse & Transpose
        csv_content = response.content.decode('utf-8-sig')
        raw_data = list(csv.reader(io.StringIO(csv_content)))
        transposed_data = list(map(list, itertools.zip_longest(*raw_data, fillvalue="")))

        jobs = []

        # 3. Extract Data
        for i, col in enumerate(transposed_data):
            if i == 0: continue  # Skip labels
            if len(col) < 10: continue

            company = col[1].strip()
            title = col[2].strip()

            if not company or not title: continue

            # Clean up the Hours (remove excessive spaces)
            raw_hours = col[4].strip()
            clean_hours = " ".join(raw_hours.split())

            # Process Requirements into a List
            # Combining "Account Type" (Row 3) and "Who can apply" (Row 7)
            reqs_list = clean_text_list(col[3]) + clean_text_list(col[7])

            jobs.append({
                "id": i,
                "title": title,
                "company": company,
                "location": col[8].strip() or "Remote",
                "salary": col[6].strip() or "Competitive",
                "type": "Full Time",
                "hours": clean_hours or "Not Specified",
                "training": col[9].strip(),
                "requirements": reqs_list,  # Now sending a List []
                "description": col[10].strip(),
                "logo": (company[:2]).upper()
            })

        print(f"📤 Sent {len(jobs)} jobs.")
        return jsonify(jobs)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


# ... (Auth Routes remain unchanged, keep them here) ...
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
        cursor.execute("SELECT UserID FROM Users WHERE Email = ?", (data['email'],))
        if cursor.fetchone(): return jsonify({"error": "Email already exists"}), 409
        cursor.execute("INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)",
                       (data['fullName'], data['email'], hashed_pw))
        conn.commit()
        return jsonify({"message": "User created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        conn = get_db_connection()
        if not conn: return jsonify({"error": "Database Connection Failed"}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT UserID, FullName, PasswordHash FROM Users WHERE Email = ?", (data['email'],))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.PasswordHash.encode('utf-8')):
            return jsonify({"message": "Success", "user": {"name": user.FullName}}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)