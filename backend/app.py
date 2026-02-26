import os
import re
import threading
import json
import pyodbc
import time
import datetime
import csv
import io
import urllib.parse
import itertools
import requests
import bcrypt
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.utils import secure_filename
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
# Load hidden variables from the .env file
load_dotenv()

# Fetch the key securely
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("No API key found. Please make sure you have a .env file with GEMINI_API_KEY set.")

genai.configure(api_key=GEMINI_API_KEY)


SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"
# Force Python to find the exact 'backend' folder path automatically
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

if not os.path.exists(UPLOAD_FOLDER): 
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = 'hima.yasser2004@gmail.com'
app.config['MAIL_PASSWORD'] = 'lqqzwvayhtaaumzt'
mail = Mail(app)

print("✅ System Ready. Running lightweight Cloud AI Mode.")

def get_db_connection():
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;Login Timeout=60;"
    for attempt in range(5):
        try:
            return pyodbc.connect(conn_str)
        except pyodbc.Error as e:
            if attempt == 4: raise e
            time.sleep(2)
    return None

# --- THE NATIVE MULTIMODAL CLOUD AI ---
def run_gemini_audio_analysis(file_path):
    print(f"⏳ Uploading media to Gemini API: {file_path}")
    try:
        # Detect if it's an mp4 and force Google to treat it as pure audio
        forced_mime = "audio/mp4" if file_path.lower().endswith(".mp4") else None

        # 1. Upload the file natively with the forced mime type
        audio_file = genai.upload_file(path=file_path, mime_type=forced_mime)

        # 2. Wait for Google's servers to process the file
        print(f"⏳ Waiting for Google servers to process media...", end="")
        while audio_file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            # Refresh the file status
            audio_file = genai.get_file(audio_file.name)

        if audio_file.state.name == "FAILED":
            print("\n❌ Google servers failed to process this file format.")
            return None
            
        print("\n🧠 Media processed! Gemini is analyzing...")

        # 3. Use the fast Flash model
        model = genai.GenerativeModel('gemini-2.5-flash')

        
        # 3. Apply the Ultimate Category-Based HR Prompt (Calibrated for C1 Spontaneity)
        prompt = """
        You are an expert CEFR English Examiner and Technical Recruiter. Listen to the candidate's audio natively.
        Evaluate their English proficiency and provide individual CEFR grades for Fluency, Pronunciation, and Grammar, plus an Overall grade.

        SCORING RUBRIC (Applies to all categories):
        - 0-25: A1 & A2 (Beginner)
        - 26-45: B1 (Intermediate)
        - 46-60: B1+ (Strong Intermediate)
        - 61-75: B2 (Upper Intermediate)
        - 76-95: C1 (Advanced)
        - 96-100: C2 (Mastery)

        CRITICAL GRADING RULES:
        1. THE STORYTELLER ALLOWANCE (Protects C1): If a candidate is highly spontaneous, speaking unscripted, and easily telling a detailed story about their background, DO NOT penalize their fluency for using 'um' or 'uh' to remember dates, numbers, or company names. Furthermore, non-idiomatic phrasing (e.g., 'they hold the company' or 'the last January') are minor translation quirks, NOT foundational grammar errors. A strong storyteller with these traits should be C1.
        2. THE ACCENT FORGIVENESS: A noticeable regional accent DOES NOT cap pronunciation at B1+ unless it makes the words actually incomprehensible. If you can easily understand them despite the accent, they deserve B2 or C1.
        3. THE FOUNDATIONAL GRAMMAR CAP (Protects B1+): Only cap grammar at B1/B1+ if the candidate drops crucial verbs (e.g., 'this my last year', 'I looking forward') or completely breaks sentence structure. 
        4. SCRIPT READING PENALTY: If the candidate sounds like they are reading a rehearsed script rather than speaking spontaneously, cap their fluency and overall grade at B2 (max score 75).
        5. STRICT JSON FORMATTING: Use ONLY single quotes inside the JSON string values. DO NOT copy the placeholder values below.

        Provide a summary of their speech. Return ONLY valid JSON in this EXACT format (replace the bracketed placeholders with your actual assessment):
        {
            "overall_level": "[Insert Level here, e.g. B2]",
            "overall_score": [Insert Integer Score here, e.g. 68],
            "fluency_level": "[Insert Level here]",
            "pronunciation_level": "[Insert Level here]",
            "grammar_level": "[Insert Level here]",
            "summary": "[Insert detailed summary here...]",
            "transcript": "[Insert transcript here...]"
        }
        """

        # --- AUTO-RETRY LOGIC ---
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"🧠 Gemini is analyzing the audio natively (Attempt {attempt + 1})...")
                response = model.generate_content([audio_file, prompt])
                
                print(f" raw AI Output: {response.text}")
                audio_file.delete() # Clean up
                return response.text

            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "Quota" in error_msg:
                    print(f"⚠️ Hit Rate Limit. Waiting 30 seconds before retrying...")
                    time.sleep(30) # Wait for the quota to reset
                else:
                    print(f"❌ Unhandled Gemini Error: {error_msg}")
                    break # Break if it's a different kind of error

        audio_file.delete()
        return None

    except Exception as e:
        print(f"❌ Gemini Setup Error: {e}")
        return None

# --- WORKER ---
def ai_worker(app_id, file_path):
    print(f"🤖 Processing App #{app_id} with Gemini API...")
    try:
        ai_response = run_gemini_audio_analysis(file_path)

        if ai_response:
            match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if match:
                json_str = match.group()
                json_str = json_str.replace('```json', '').replace('```', '').strip()
            else:
                print("⚠️ AI didn't output JSON cleanly. Recovering...")
                json_str = '{"overall_level": "B1", "overall_score": 60, "fluency_level": "B1", "pronunciation_level": "B1", "grammar_level": "B1", "summary": "Format failed.", "transcript": "Check raw logs"}'

            ai_data = json.loads(json_str)
            
            # Format the new variables
            overall_grade = f"{ai_data['overall_level']} ({ai_data['overall_score']})"
            fluency_grade = ai_data.get('fluency_level', 'N/A')
            pronunciation_grade = ai_data.get('pronunciation_level', 'N/A')
            grammar_grade = ai_data.get('grammar_level', 'N/A')
            transcript = ai_data.get('transcript', 'Transcript not provided.')

            print(f"✅ FINAL OVERALL GRADE: {overall_grade}")
            print(f"📊 BREAKDOWN -> Fluency: {fluency_grade} | Pronunciation: {pronunciation_grade} | Grammar: {grammar_grade}")

            conn = get_db_connection()
            if conn:
                c = conn.cursor()
                # Update the SQL execution to save the 3 new columns!
                c.execute(
                    """UPDATE JobApplications 
                       SET Transcription=?, AI_Rating=?, AI_Summary=?, SpeechRate=0,
                           Grammar_Rating=?, Fluency_Rating=?, Pronunciation_Rating=?
                       WHERE ApplicationID=?""",
                    (transcript, overall_grade, ai_data['summary'], 
                     grammar_grade, fluency_grade, pronunciation_grade, app_id)
                )
                conn.commit()
                conn.close()
        else:
            print("❌ AI returned no response.")

    except Exception as e:
        print(f"❌ Worker Error: {e}")

# --- ROUTES ---
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        full_name = data.get('fullName')
        email = data.get('email')
        password = data.get('password')

        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute("SELECT Email FROM Users WHERE Email=?", (email,))
            if c.fetchone(): return jsonify({"error": "Email already exists"}), 400

            hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            c.execute("INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)", (full_name, email, hashed_pw))
            conn.commit()
            conn.close()
            return jsonify({"message": "Signup successful"}), 201
            
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute("SELECT FullName, Email, PasswordHash, IsAdmin FROM Users WHERE Email=?", (email,))
            user_row = c.fetchone()
            conn.close()

            if user_row:
                stored_hash = user_row[2]
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                    return jsonify({
                        "message": "Login successful", 
                        "user": {"name": user_row[0], "email": user_row[1], "isAdmin": bool(user_row[3])}
                    }), 200
            
            return jsonify({"error": "Invalid email or password"}), 401
                
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
        response = requests.get(url, timeout=5)
        if response.status_code != 200: return jsonify([])

        csv_content = response.content.decode('utf-8-sig')
        raw_data = list(csv.reader(io.StringIO(csv_content)))
        transposed_data = list(map(list, itertools.zip_longest(*raw_data, fillvalue="")))

        jobs = []
        for i, col in enumerate(transposed_data):
            if i == 0 or len(col) < 10: continue
            jobs.append({
                "id": i, "title": col[2].strip(), "company": col[1].strip(),
                "location": col[8].strip() or "Remote", "salary": col[6].strip() or "Competitive",
                "requirements": col[3].strip() + "\n" + col[7].strip(),
                "description": col[10].strip(), "logo": (col[1].strip()[:2]).upper()
            })
        return jsonify(jobs)
    except: return jsonify([])

@app.route('/api/dashboard/<email>', methods=['GET'])
def get_user_dashboard(email):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM JobApplications WHERE Email=? ORDER BY SubmittedAt DESC", (email,))
        cols = [x[0] for x in c.description]
        data = [dict(zip(cols, r)) for r in c.fetchall()]
        conn.close()
        return jsonify(data)
    except: return jsonify([])

@app.route('/api/apply', methods=['POST'])
def apply():
    try:
        f = request.files['voiceRecord']
        fn = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{f.filename}")
        f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))

        conn = get_db_connection()
        c = conn.cursor()
        d = request.form
        c.execute(
            "INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,GETDATE())",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'), fn))
        conn.commit()
        conn.close()
        return jsonify({"message": "OK"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/analyze/<int:id>', methods=['POST'])
def analyze(id):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT VoiceRecordPath FROM JobApplications WHERE ApplicationID=?", (id,))
        r = c.fetchone()
        conn.close()
        if r:
            threading.Thread(target=ai_worker, args=(id, os.path.join(app.config['UPLOAD_FOLDER'], r[0]))).start()
            return jsonify({"message": "Started"})
        return jsonify({"error": "404"}), 404
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/applications', methods=['GET'])
def apps():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM JobApplications ORDER BY SubmittedAt DESC")
        cols = [x[0] for x in c.description]
        data = [dict(zip(cols, r)) for r in c.fetchall()]
        conn.close()
        return jsonify(data)
    except: return jsonify([])

@app.route('/uploads/<fn>')
def file(fn): return send_from_directory(app.config['UPLOAD_FOLDER'], fn)

if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)