import os
import re  # <--- Added this missing import
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pyodbc
import bcrypt
import requests
import csv
import io
import urllib.parse
import itertools
from werkzeug.utils import secure_filename
import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"

# File Upload Config
UPLOAD_FOLDER = 'uploads'
# Added audio extensions
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'wav', 'mp3', 'ogg', 'webm'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# --- HELPER: CLEAN TEXT ---
def clean_text_list(text):
    if not text: return []
    text = text.replace('\r', '\n').replace('•', '\n').replace(' - ', '\n')
    lines = text.split('\n')
    cleaned_items = []
    for line in lines:
        parts = re.split(r'\s{2,}', line)
        for part in parts:
            part = part.strip()
            for char in ['*', '-', '•', '🔹', '✅', '🛑', '👉', '📝', '✨', '>', '▪', '▪️']:
                if part.startswith(char):
                    part = part[1:].strip()
            if part and len(part) > 1:
                cleaned_items.append(part)
    return cleaned_items


# --- ROUTES ---

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
        response = requests.get(url)
        response.raise_for_status()

        csv_content = response.content.decode('utf-8-sig')
        raw_data = list(csv.reader(io.StringIO(csv_content)))
        transposed_data = list(map(list, itertools.zip_longest(*raw_data, fillvalue="")))

        jobs = []
        for i, col in enumerate(transposed_data):
            if i == 0: continue
            if len(col) < 10: continue

            company = col[1].strip()
            title = col[2].strip()
            if not company or not title: continue

            raw_hours = col[4].strip()
            clean_hours = " ".join(raw_hours.split())

            search_text = (title + " " + clean_hours + " " + col[10]).lower()
            types = []
            if "part time" in search_text or "part-time" in search_text:
                types.append("Part Time")
            else:
                types.append("Full Time")
            if "rotational" in search_text:
                types.append("Rotational")
            final_type = " / ".join(types)

            reqs_list = clean_text_list(col[3]) + clean_text_list(col[7])

            jobs.append({
                "id": i,
                "title": title,
                "company": company,
                "location": col[8].strip() or "Remote",
                "salary": col[6].strip() or "Competitive",
                "type": final_type,
                "hours": clean_hours or "Not Specified",
                "training": col[9].strip(),
                "requirements": reqs_list,
                "description": col[10].strip(),
                "logo": (company[:2]).upper()
            })
        return jsonify(jobs)
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        hashed_pw = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500
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
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT UserID, FullName, Email, PasswordHash, IsAdmin FROM Users WHERE Email = ?",
                       (data['email'],))
        user = cursor.fetchone()

        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.PasswordHash.encode('utf-8')):
            return jsonify({
                "message": "Success",
                "user": {
                    "name": user.FullName,
                    "email": user.Email,
                    "isAdmin": bool(user.IsAdmin)
                }
            }), 200

        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/contact', methods=['POST'])
def contact_us():
    try:
        data = request.json
        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500
        cursor = conn.cursor()
        cursor.execute("INSERT INTO ContactMessages (FullName, Email, Subject, Message) VALUES (?, ?, ?, ?)",
                       (data['name'], data['email'], data['subject'], data['message']))
        conn.commit()
        return jsonify({"message": "Message received"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


# --- FILE SERVE ROUTE ---
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- APPLY ROUTE (With Voice Record) ---
@app.route('/api/apply', methods=['POST'])
def apply_for_job():
    try:
        data = request.form
        file = request.files.get('voiceRecord')

        # Validation
        if not file or file.filename == '':
            return jsonify({"error": "Voice recording is required"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type."}), 400

        # Save File
        filename = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500

        cursor = conn.cursor()

        military_status = data.get('militaryStatus', 'Not Applicable')
        whatsapp = data.get('whatsapp', '')

        # Insert VoiceRecordPath instead of ResumePath
        query = """
            INSERT INTO JobApplications 
            (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, 
             Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        cursor.execute(query, (
            data['title'], data['company'], data['name'], data['email'], data['phone'],
            whatsapp, data['english'], data['experience'], data['gender'], data['gradStatus'],
            military_status, data['nationalId'], data['nationality'], data['address'], filename
        ))
        conn.commit()

        print(f"🚀 New Application with Voice Note: {data['name']}")
        return jsonify({"message": "Application submitted successfully"}), 201

    except Exception as e:
        print(f"❌ Apply Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/dashboard/<email>', methods=['GET'])
def get_user_dashboard(email):
    try:
        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500
        cursor = conn.cursor()
        cursor.execute(
            "SELECT JobTitle, Company, SubmittedAt FROM JobApplications WHERE Email = ? ORDER BY SubmittedAt DESC",
            (email,))
        applications = []
        for row in cursor.fetchall():
            applications.append({
                "title": row.JobTitle, "company": row.Company,
                "date": row.SubmittedAt.strftime('%Y-%m-%d'), "status": "Applied"
            })
        return jsonify({"applications": applications})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


@app.route('/api/admin/applications', methods=['GET'])
def get_all_applications():
    try:
        admin_email = request.headers.get('X-Admin-Email')
        if not admin_email: return jsonify({"error": "Unauthorized"}), 401

        conn = get_db_connection()
        if not conn: return jsonify({"error": "DB Connection Failed"}), 500

        cursor = conn.cursor()
        cursor.execute("SELECT IsAdmin FROM Users WHERE Email = ?", (admin_email,))
        user = cursor.fetchone()
        if not user or not user.IsAdmin: return jsonify({"error": "Access Denied"}), 403

        cursor.execute("SELECT * FROM JobApplications ORDER BY SubmittedAt DESC")
        columns = [column[0] for column in cursor.description]
        applications = []
        for row in cursor.fetchall():
            app_dict = dict(zip(columns, row))
            if 'SubmittedAt' in app_dict and app_dict['SubmittedAt']:
                app_dict['SubmittedAt'] = app_dict['SubmittedAt'].strftime('%Y-%m-%d %H:%M:%S')
            applications.append(app_dict)

        return jsonify(applications)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn: conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)