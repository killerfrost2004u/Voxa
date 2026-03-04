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
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
import gspread
from google.oauth2.service_account import Credentials

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

        # 3. Apply the Ultimate HR Prompt (Strictly Calibrated to the Recruiter's Ear)
        prompt = """
        You are an expert CEFR English Examiner and Technical Recruiter. Listen to the candidate's audio natively.
        Evaluate their English proficiency and provide individual CEFR grades for Fluency, Pronunciation, and Grammar, plus an Overall grade.

        SCORING RUBRIC:
        - 0-25: A1 & A2 (Beginner)
        - 26-40: B1 (Intermediate)
        - 41-50: B1+ (Strong Intermediate)
        - 51-65: B2 (Upper Intermediate)
        - 66-75: B2+ (Advanced Intermediate)
        - 76-85: C1 (Advanced)
        - 86-95: C1+ (Strong Advanced)
        - 96-100: C2 (Mastery)

        CRITICAL GRADING CALIBRATION (YOU MUST FOLLOW THESE 4 PROFILES STRICTLY):
        1. THE C1+ EXECUTIVE (Score 86-95): High-speed, highly confident, native-like rhythm, uses industry jargon smoothly. EXTREMELY IMPORTANT: If they possess this level of fluency, IGNORE minor grammar or preposition slips (like 'get it sorted out' or 'negotiating in the deals'). Their Overall Grade MUST be C1+.
        2. THE C1 FLUENT STORYTELLER (Score 76-85): Speaks fluently, clearly, and confidently, but has a noticeable regional accent and makes direct translation errors (e.g., 'they hold the company', 'in a university'). Because fluency and pronunciation are the top priority, their Overall Grade MUST be C1. Do NOT drop them to B2.
        3. THE SCRIPT READER PENALTY (Score 51-65): LISTEN CAREFULLY TO THE INTONATION. If a candidate has absolutely flawless grammar and rich vocabulary but sounds like they are reading from a prepared piece of paper (monotonous, rhythmic pacing, lack of spontaneous 'thinking' pauses, unnatural breathing), you MUST penalize them. True C1 requires spontaneous thought. If they are reading, their Overall Grade MUST be B2 (max score 65), even if their grammar is C2 level. You MUST mention that they sound rehearsed in the summary.
        4. THE B1+ GRAMMAR DROPPER (Score 41-50): If the candidate has a good accent and confidence, but consistently drops foundational verbs ('this my last year', 'I looking forward') or articles, their Overall Grade MUST be capped at B1+. 
        
        5. ACCENT PROFILING: Explicitly name their accent (e.g., 'Clear Egyptian'). A strong but clear accent does not lower the grade.
        6. STRICT JSON FORMATTING: Use ONLY single quotes inside the JSON string values.

        7. CLIENT PANEL: Write a highly professional, 2-3 sentence summary designed to be sent to a corporate client. Highlight their strengths, accent, and overall communication confidence.
        8. CONSTRUCTIVE FEEDBACK: Write a single, polite sentence offering a specific tip on how they can improve their spoken English based on their audio.

        Provide a summary of their speech detailing their fluency, grammar, and ACCENT PROFILE. Return ONLY valid JSON in this EXACT format:
        {
            "overall_level": "[Insert Level here]",
            "overall_score": [Insert Integer Score here],
            "fluency_level": "[Insert Level here]",
            "pronunciation_level": "[Insert Level here]",
            "grammar_level": "[Insert Level here]",
            "accent_profile": "[Insert 2-3 words max, e.g., 'Clear Egyptian']",
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
            accent_profile = ai_data.get('accent_profile', 'Not Specified') 
            transcript = ai_data.get('transcript', 'Transcript not provided.')
            client_panel = ai_data.get('client_panel', 'No panel generated.') 
            constructive_feedback = ai_data.get('constructive_feedback', 'Keep practicing!') 

            print(f"✅ FINAL OVERALL GRADE: {overall_grade}")
            print(f"📊 BREAKDOWN -> Fluency: {fluency_grade} | Pronunciation: {pronunciation_grade} | Grammar: {grammar_grade}")

            conn = get_db_connection()
            if conn:
                c = conn.cursor()
                c.execute(
                    """UPDATE JobApplications 
                       SET Transcription=?, AI_Rating=?, AI_Summary=?, SpeechRate=0,
                           Grammar_Rating=?, Fluency_Rating=?, Pronunciation_Rating=?, Accent_Profile=?, 
                           ClientPanel=?, ConstructiveFeedback=?, Status='Analyzed'
                       WHERE ApplicationID=?""",
                    (transcript, overall_grade, ai_data['summary'], 
                     grammar_grade, fluency_grade, pronunciation_grade, accent_profile, app_id)
                )
                conn.commit()
                conn.close()
                
                # Fetch the candidate's details from the database
                conn2 = get_db_connection()
                c2 = conn2.cursor()
                c2.execute("SELECT FullName, WhatsApp, JobTitle FROM JobApplications WHERE ApplicationID=?", (app_id,))
                candidate_data = c2.fetchone()
                conn2.close()
            
                if candidate_data and candidate_data[1]:
                    c_name = candidate_data[0].split()[0]
                    c_whatsapp = candidate_data[1]
                    c_job = candidate_data[2]
        else:
            print("❌ AI returned no response.")

    except Exception as e:
        print(f"❌ Worker Error: {e}")

# --- WHATSAPP BOT ENGINE (MOCKED FOR BUDGET) ---
def send_whatsapp_message(to_number, message_body):
    print(f"🛑 [BUDGET MODE] WhatsApp disabled. Would have sent message to {to_number}:")
    print(message_body)
    return True

def process_job_offer_manual(candidate_name, whatsapp_number, job_title, decision, custom_job="", job_data=None, ai_feedback=""):
    print(f"🛑 [BUDGET MODE] Processing {decision} for {candidate_name}...")
    msg = f"Simulated {decision} message for {candidate_name}."
    send_whatsapp_message(whatsapp_number, msg)
    return True

# --- GOOGLE SHEETS AUTO-EXPORT (MOCKED FOR BUDGET) ---
def export_to_google_sheet(app_id):
    print(f"🛑 [BUDGET MODE] Google Sheets disabled. Would have exported Application ID: {app_id}")
    return True

# --- ROUTES ---

@app.route('/api/admin/send-offer/<int:id>', methods=['POST'])
def send_offer(id):
    try:
        data = request.get_json()
        decision = data.get('decision')
        custom_job = data.get('customJob', '')

        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT FullName, WhatsApp, JobTitle, ConstructiveFeedback FROM JobApplications WHERE ApplicationID=?", (id,))
        app_row = c.fetchone()
        
        if not app_row or not app_row[1]:
            conn.close()
            return jsonify({"error": "Candidate data or WhatsApp number not found"}), 404
            
        c_name = app_row[0].split()[0]
        c_whatsapp = app_row[1]
        c_job = app_row[2]
        ai_feedback = app_row[3] or "Keep practicing your pronunciation!" 

        c.execute("SELECT CompanyName, AccountType, WorkingHours, SalaryPackage, Location, Training, OfferDetails FROM Jobs WHERE JobTitle=?", (c_job,))
        job_row = c.fetchone()
        
        job_data = None
        if job_row:
            job_data = {
                "CompanyName": job_row[0], "AccountType": job_row[1], "WorkingHours": job_row[2],
                "SalaryPackage": job_row[3], "Location": job_row[4], "Training": job_row[5], "OfferDetails": job_row[6]
            }
        conn.close()

        success = process_job_offer_manual(c_name, c_whatsapp, c_job, decision, custom_job, job_data, ai_feedback)
        if success:
            return jsonify({"message": "WhatsApp message sent successfully!"}), 200
        return jsonify({"error": "Invalid decision"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_public_jobs():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM Jobs WHERE Status = 'Active'")
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()

        formatted_jobs = []
        for j in raw_jobs:
            formatted_jobs.append({
                "id": j.get("JobID"),
                "title": j.get("JobTitle", "Unknown Title"),
                "company": j.get("CompanyName", "Dark Wolves"),
                "location": j.get("Location") or "Remote",
                "salary": j.get("SalaryPackage") or "Competitive",
                "requirements": f"Account: {j.get('AccountType', 'N/A')} | Hours: {j.get('WorkingHours', 'N/A')} | Target: {j.get('TargetAudience', 'N/A')}",
                "description": j.get("OfferDetails", ""),
                "logo": j.get("CompanyName", "DW")[:2].upper(),
                "bilingual": bool(j.get("RequiresSecondLanguage", False))
            })

        return jsonify(formatted_jobs)
    except Exception as e: 
        print(f"Error loading jobs: {e}")
        return jsonify([])

@app.route('/api/admin/jobs', methods=['GET', 'POST'])
def handle_admin_jobs():
    conn = get_db_connection()
    c = conn.cursor()
    
    if request.method == 'GET':
        c.execute("SELECT * FROM Jobs ORDER BY JobID DESC")
        cols = [column[0] for column in c.description]
        jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(jobs)
        
    if request.method == 'POST':
        d = request.get_json()
        c.execute(
            """INSERT INTO Jobs (CompanyName, JobTitle, AccountType, WorkingHours, InterviewTime, SalaryPackage, TargetAudience, Location, Training, OfferDetails, Status, RequiresSecondLanguage) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (d.get('companyName'), d.get('jobTitle'), d.get('accountType'), d.get('workingHours'), 
             d.get('interviewTime'), d.get('salaryPackage'), d.get('targetAudience'), d.get('location'), 
             d.get('training'), d.get('offerDetails'), d.get('status', 'Active'), int(d.get('requiresSecondLanguage', 0)))
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Job added"}), 201

@app.route('/api/admin/jobs/<int:id>', methods=['PUT', 'DELETE'])
def update_delete_job(id):
    conn = get_db_connection()
    c = conn.cursor()
    if request.method == 'PUT':
        data = request.get_json()
        
        if 'jobTitle' in data:
            c.execute(
                """UPDATE Jobs 
                   SET CompanyName=?, JobTitle=?, AccountType=?, WorkingHours=?, 
                       InterviewTime=?, SalaryPackage=?, TargetAudience=?, 
                       Location=?, Training=?, OfferDetails=?, RequiresSecondLanguage=?
                   WHERE JobID=?""",
                (data.get('companyName'), data.get('jobTitle'), data.get('accountType'), 
                 data.get('workingHours'), data.get('interviewTime'), data.get('salaryPackage'), 
                 data.get('targetAudience'), data.get('location'), data.get('training'), 
                 data.get('offerDetails'), int(data.get('requiresSecondLanguage', 0)), id)
            )
        else:
            c.execute("UPDATE Jobs SET Status=? WHERE JobID=?", (data.get('status'), id))
            
        conn.commit()
        conn.close()
        return jsonify({"message": "Job updated successfully"})
        
    if request.method == 'DELETE':
        c.execute("DELETE FROM Jobs WHERE JobID=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Job deleted"})

@app.route('/api/admin/applications/<int:id>/status', methods=['PUT'])
def update_application_status(id):
    try:
        data = request.get_json()
        new_status = data.get('status')
        feedback = data.get('feedback', '')
        human_grade = data.get('humanGrade', '')
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("UPDATE JobApplications SET Status=?, ValidatorFeedback=?, Human_Rating=? WHERE ApplicationID=?", 
                  (new_status, feedback, human_grade, id))
        conn.commit()
        conn.close()
        
        if new_status == 'Accepted':
            threading.Thread(target=export_to_google_sheet, args=(id,)).start()
        
        return jsonify({"message": "Validation saved!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/whatsapp/reply', methods=['POST'])
def whatsapp_reply():
    incoming_msg = request.values.get('Body', '').strip().lower()
    resp = MessagingResponse()
    msg = resp.message()

    if 'accept' in incoming_msg:
        msg.body("🐺 Awesome! Welcome to the pack. Our HR team will reach out shortly with your contract and onboarding details.")
    elif 'decline' in incoming_msg:
        msg.body("Understood. Thank you for your time, and we wish you the best of luck in your career!")
    else:
        msg.body("I didn't quite catch that. Please reply with 'ACCEPT' or 'DECLINE'.")

    return str(resp)

# --- USER MANAGEMENT ROUTES ---
@app.route('/api/admin/users', methods=['POST'])
def create_user():
    data = request.get_json()
    full_name = data.get('fullName')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'Recruiter')
    team_name = data.get('teamName', 'Dark Wolves') 
    
    if not email or not password or not full_name:
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT UserID FROM Users WHERE Email = ?", (email,))
        if c.fetchone():
            conn.close()
            return jsonify({"error": "Email already exists"}), 400
            
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        c.execute("""
            INSERT INTO Users (FullName, Email, PasswordHash, Role, TeamName)
            VALUES (?, ?, ?, ?, ?)
        """, (full_name, email, hashed_pw, role, team_name))
        
        conn.commit()
        conn.close()
        return jsonify({"message": f"User {full_name} created successfully as {role}"}), 201
        
    except Exception as e:
        print(f"Error creating user: {e}")
        return jsonify({"error": str(e)}), 500

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
            c.execute("INSERT INTO Users (FullName, Email, PasswordHash, Role, TeamName) VALUES (?, ?, ?, 'Candidate', 'None')", (full_name, email, hashed_pw))
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
            # MODIFIED: Now pulls Role and TeamName to power the Smart Routing
            c.execute("SELECT FullName, Email, PasswordHash, Role, TeamName FROM Users WHERE Email=?", (email,))
            user_row = c.fetchone()
            conn.close()

            if user_row:
                stored_hash = user_row[2]
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                    
                    role = user_row[3] if len(user_row) > 3 else 'Candidate'
                    team = user_row[4] if len(user_row) > 4 else ''
                    
                    return jsonify({
                        "message": "Login successful", 
                        "user": {
                            "name": user_row[0], 
                            "email": user_row[1], 
                            "role": role,
                            "team": team,
                            "isAdmin": role in ['Admin', 'SuperAdmin']
                        }
                    }), 200
            
            return jsonify({"error": "Invalid email or password"}), 401
                
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

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

        fn2 = None
        if 'voiceRecord2' in request.files:
            f2 = request.files['voiceRecord2']
            if f2.filename:
                fn2 = secure_filename(f"VOICE2_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{f2.filename}")
                f2.save(os.path.join(app.config['UPLOAD_FOLDER'], fn2))

        conn = get_db_connection()
        c = conn.cursor()
        d = request.form
        c.execute(
            """INSERT INTO JobApplications 
            (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, 
             Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, 
             DateOfBirth, FacultyUniversity, VoiceRecordPath, VoiceRecordPath2, SubmittedAt, RecruiterSource) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,GETDATE(),?)""",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'),
             d.get('dob'), d.get('faculty'), 
             fn, fn2, d.get('ref', 'Direct/Organic')))
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
        user_email = request.args.get('email')
        if not user_email: return jsonify([])

        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT FullName, Role, TeamName, UnitName FROM Users WHERE Email=?", (user_email,))
        user_data = c.fetchone()
        
        if not user_data: 
            conn.close()
            return jsonify([])
            
        u_name, u_role, u_team, u_unit = user_data

        if u_role in ['Admin', 'SuperAdmin', 'CEO']:
            c.execute("SELECT * FROM JobApplications ORDER BY SubmittedAt DESC")
            
        elif u_role == 'UnitManager':
            c.execute("""
                SELECT a.* FROM JobApplications a
                LEFT JOIN Users u ON a.RecruiterSource = u.FullName
                WHERE u.UnitName = ? ORDER BY a.SubmittedAt DESC
            """, (u_unit,))
            
        elif u_role == 'Leader':
            c.execute("""
                SELECT a.* FROM JobApplications a
                LEFT JOIN Users u ON a.RecruiterSource = u.FullName
                WHERE u.TeamName = ? ORDER BY a.SubmittedAt DESC
            """, (u_team,))
            
        else:
            c.execute("SELECT * FROM JobApplications WHERE RecruiterSource = ? ORDER BY SubmittedAt DESC", (u_name,))

        cols = [x[0] for x in c.description]
        data = [dict(zip(cols, r)) for r in c.fetchall()]
        conn.close()
        return jsonify(data)
    except Exception as e:
        print(f"Error loading apps: {e}")
        return jsonify([])

@app.route('/uploads/<fn>')
def file(fn): return send_from_directory(app.config['UPLOAD_FOLDER'], fn)

if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)