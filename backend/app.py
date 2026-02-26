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

# --- CONFIGURATION ---
# 🔑 PASTE YOUR GEMINI API KEY HERE:
GEMINI_API_KEY = "AIzaSyDMz4l0qQ1Veo7wcbYeQhANh5JXaQx_2s8"
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
    print(f"⏳ Uploading audio to Gemini API: {file_path}")
    try:
        # 1. Upload the audio file natively
        audio_file = genai.upload_file(path=file_path)

        # 2. Use the fast Flash model
        model = genai.GenerativeModel('gemini-2.5-flash')

        
        # 3. Apply a Recruiter prompt prioritizing Spontaneous Fluency & Clear Accent
        prompt = """
        You are an expert CEFR English Examiner and Technical Recruiter. Listen to the candidate's audio natively.
        Evaluate their English proficiency, making SPONTANEOUS FLUENCY and a CLEAR ACCENT (Pronunciation) your absolute highest priorities.

        SCORING RUBRIC (Score must be out of 100):
        - 0-25: A1 & A2 (Beginner) - Very broken English, highly hesitant, difficult to understand.
        - 26-45: B1 (Intermediate) - Heavy accent that impedes clarity, struggles to find words, very choppy flow.
        - 46-60: B1+ (Strong Intermediate) - Good overall communication, but has noticeable language hesitation or a thick accent that requires effort for a native speaker to understand.
        - 61-75: B2 (Upper Intermediate) - Very good spontaneous fluency AND a clear, easily understandable accent. May still make foundational grammatical errors (e.g., 'this my last year' or 'I looking'), but their confident flow and clear accent completely compensate for it.
        - 76-95: C1 (Advanced) - Highly fluent, natural conversational rhythm, rich vocabulary, extremely clear and near-neutral accent. Spontaneous and completely comfortable.
        - 96-100: C2 (Mastery) - Near-native, flawless accent, effortless.

        CRITICAL GRADING RULES:
        1. ACCENT & FLUENCY OVER GRAMMAR: A candidate CAN achieve a B2 despite foundational grammar mistakes ONLY IF they have an excellent, confident flow AND a very clear, easy-to-understand accent. 
        2. THE ACCENT PENALTY: If the candidate has a heavy, thick, or distracting accent that makes them hard to understand, you MUST cap them at B1 or B1+, even if their grammar and vocabulary are perfect.
        3. SCRIPT READING PENALTY: Listen to their intonation. If the candidate sounds like they are reading from a prepared script or reciting a highly memorized text (flat, robotic intonation, lack of natural conversational rhythm), DO NOT grade them higher than B1+ or B2. True advanced English requires spontaneous thought.
        4. THOUGHT VS LANGUAGE HESITATION: 'Um' to remember a date or job history is totally fine. Stuttering because they don't know the English word lowers the fluency grade.
        5. Match the Score: Your 'score' number MUST fall exactly within the range of the 'level' in the rubric above.
        6. STRICT JSON FORMATTING: Do NOT use double quotes inside your summary or transcript values. If you need to quote the speaker, use single quotes (e.g., they said 'hello').

        Provide a summary of their speech. Explicitly mention their fluency, their accent/pronunciation clarity, whether they sound spontaneous or scripted, and note their grammar. Return ONLY valid JSON in this exact format:
        {"level": "B2", "score": 68, "summary": "They had a 'minor' error...", "transcript": "..."}
        """
        print("🧠 Gemini is analyzing the audio natively...")
        response = model.generate_content([audio_file, prompt])

        print(f" raw AI Output: {response.text}")
        
        # Clean up the file from Google's servers
        audio_file.delete()
        
        return response.text
    except Exception as e:
        print(f"❌ Gemini Error: {e}")
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
                json_str = '{"level": "B1", "score": 60, "summary": "System processed natively but format failed.", "transcript": "Check raw logs"}'

            ai_data = json.loads(json_str)
            final_grade = f"{ai_data['level']} ({ai_data['score']})"
            transcript = ai_data.get('transcript', 'Transcript not provided.')

            print(f"✅ FINAL GRADE: {final_grade}")

            conn = get_db_connection()
            if conn:
                c = conn.cursor()
                c.execute(
                    "UPDATE JobApplications SET Transcription=?, AI_Rating=?, AI_Summary=?, SpeechRate=0 WHERE ApplicationID=?",
                    (transcript, final_grade, ai_data['summary'], app_id))
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