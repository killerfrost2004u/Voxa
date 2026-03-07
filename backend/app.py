import os
import re
import threading
import json
import psycopg2 # NEW: Postgres Connector
import time
import datetime
import urllib.parse
import bcrypt
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
from twilio.twiml.messaging_response import MessagingResponse

# --- CONFIGURATION ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("No API key found. Please make sure you have a .env file with GEMINI_API_KEY set.")

genai.configure(api_key=GEMINI_API_KEY)

# NEW: Your Live Neon Cloud Database URL
DATABASE_URL = "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

if not os.path.exists(UPLOAD_FOLDER): 
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

print("✅ System Ready. Connected to Neon Cloud Postgres.")

def get_db_connection():
    for attempt in range(5):
        try:
            return psycopg2.connect(DATABASE_URL)
        except psycopg2.Error as e:
            if attempt == 4: raise e
            time.sleep(2)
    return None

# --- THE NATIVE MULTIMODAL CLOUD AI ---
def run_gemini_audio_analysis(file_path):
    print(f"⏳ Uploading media to Gemini API: {file_path}")
    try:
        forced_mime = "audio/mp4" if file_path.lower().endswith(".mp4") else None
        audio_file = genai.upload_file(path=file_path, mime_type=forced_mime)

        print(f"⏳ Waiting for Google servers to process media...", end="")
        while audio_file.state.name == "PROCESSING":
            print(".", end="", flush=True)
            time.sleep(2)
            audio_file = genai.get_file(audio_file.name)

        if audio_file.state.name == "FAILED":
            print("\n❌ Google servers failed to process this file format.")
            return None
            
        print("\n🧠 Media processed! Gemini is analyzing...")

        model = genai.GenerativeModel('gemini-2.5-flash')

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

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content([audio_file, prompt])
                audio_file.delete() 
                return response.text
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "Quota" in error_msg:
                    time.sleep(30) 
                else:
                    break 

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
                json_str = match.group().replace('```json', '').replace('```', '').strip()
            else:
                json_str = '{"overall_level": "B1", "overall_score": 60, "summary": "Format failed."}'

            ai_data = json.loads(json_str)
            
            overall_grade = f"{ai_data['overall_level']} ({ai_data['overall_score']})"
            fluency_grade = ai_data.get('fluency_level', 'N/A')
            pronunciation_grade = ai_data.get('pronunciation_level', 'N/A')
            grammar_grade = ai_data.get('grammar_level', 'N/A')
            accent_profile = ai_data.get('accent_profile', 'Not Specified') 
            transcript = ai_data.get('transcript', 'Transcript not provided.')

            conn = get_db_connection()
            if conn:
                c = conn.cursor()
                c.execute(
                    """UPDATE "JobApplications" 
                       SET "Transcription"=%s, "AI_Rating"=%s, "AI_Summary"=%s, "SpeechRate"=0,
                           "Grammar_Rating"=%s, "Fluency_Rating"=%s, "Pronunciation_Rating"=%s, "Accent_Profile"=%s, 
                           "Status"='Analyzed'
                       WHERE "ApplicationID"=%s""",
                    (transcript, overall_grade, ai_data['summary'], 
                     grammar_grade, fluency_grade, pronunciation_grade, accent_profile, app_id)
                )
                conn.commit()
                conn.close()
    except Exception as e:
        print(f"❌ Worker Error: {e}")

# --- ROUTES ---
@app.route('/api/admin/send-offer/<int:id>', methods=['POST'])
def send_offer(id):
    return jsonify({"message": "WhatsApp simulated for now."}), 200

@app.route('/api/jobs', methods=['GET'])
def get_public_jobs():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT * FROM "Jobs" WHERE "Status" = 'Active'""")
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
        return jsonify([])

@app.route('/api/admin/jobs', methods=['GET', 'POST'])
def handle_admin_jobs():
    conn = get_db_connection()
    c = conn.cursor()
    
    if request.method == 'GET':
        c.execute("""SELECT * FROM "Jobs" ORDER BY "JobID" DESC""")
        cols = [column[0] for column in c.description]
        jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(jobs)
        
    if request.method == 'POST':
        d = request.get_json()
        c.execute(
            """INSERT INTO "Jobs" ("CompanyName", "JobTitle", "AccountType", "WorkingHours", "InterviewTime", "SalaryPackage", "TargetAudience", "Location", "Training", "OfferDetails", "Status", "RequiresSecondLanguage") 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
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
                """UPDATE "Jobs" 
                   SET "CompanyName"=%s, "JobTitle"=%s, "AccountType"=%s, "WorkingHours"=%s, 
                       "InterviewTime"=%s, "SalaryPackage"=%s, "TargetAudience"=%s, 
                       "Location"=%s, "Training"=%s, "OfferDetails"=%s, "RequiresSecondLanguage"=%s
                   WHERE "JobID"=%s""",
                (data.get('companyName'), data.get('jobTitle'), data.get('accountType'), 
                 data.get('workingHours'), data.get('interviewTime'), data.get('salaryPackage'), 
                 data.get('targetAudience'), data.get('location'), data.get('training'), 
                 data.get('offerDetails'), int(data.get('requiresSecondLanguage', 0)), id)
            )
        else:
            c.execute("""UPDATE "Jobs" SET "Status"=%s WHERE "JobID"=%s""", (data.get('status'), id))
        conn.commit()
        conn.close()
        return jsonify({"message": "Job updated"})
        
    if request.method == 'DELETE':
        c.execute("""DELETE FROM "Jobs" WHERE "JobID"=%s""", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Job deleted"})

@app.route('/api/admin/applications/<int:id>/status', methods=['PUT'])
def update_application_status(id):
    try:
        data = request.get_json()
        c = get_db_connection().cursor()
        c.execute("""UPDATE "JobApplications" SET "Status"=%s, "ValidatorFeedback"=%s, "Human_Rating"=%s WHERE "ApplicationID"=%s""", 
                  (data.get('status'), data.get('feedback', ''), data.get('humanGrade', ''), id))
        c.connection.commit()
        c.connection.close()
        return jsonify({"message": "Validation saved!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data.get('email') or not data.get('password') or not data.get('fullName'):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""SELECT "UserID" FROM "Users" WHERE "Email" = %s""", (data.get('email'),))
        if c.fetchone():
            return jsonify({"error": "Email already exists"}), 400
            
        hashed_pw = bcrypt.hashpw(data.get('password').encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        c.execute("""
            INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "TeamName")
            VALUES (%s, %s, %s, %s, %s)
        """, (data.get('fullName'), data.get('email'), hashed_pw, data.get('role', 'Recruiter'), data.get('teamName', 'Dark Wolves')))
        
        conn.commit()
        conn.close()
        return jsonify({"message": f"User {data.get('fullName')} created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute("""SELECT "Email" FROM "Users" WHERE "Email"=%s""", (data.get('email'),))
            if c.fetchone(): return jsonify({"error": "Email already exists"}), 400

            hashed_pw = bcrypt.hashpw(data.get('password').encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            c.execute("""INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "TeamName") VALUES (%s, %s, %s, 'Candidate', 'None')""", 
                      (data.get('fullName'), data.get('email'), hashed_pw))
            conn.commit()
            conn.close()
            return jsonify({"message": "Signup successful"}), 201
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute("""SELECT "FullName", "Email", "PasswordHash", "Role", "TeamName" FROM "Users" WHERE "Email"=%s""", (data.get('email'),))
            user_row = c.fetchone()
            conn.close()

            if user_row and bcrypt.checkpw(data.get('password').encode('utf-8'), user_row[2].encode('utf-8')):
                role = user_row[3] if len(user_row) > 3 else 'Candidate'
                return jsonify({
                    "message": "Login successful", 
                    "user": {"name": user_row[0], "email": user_row[1], "role": role, "team": user_row[4], "isAdmin": role in ['Admin', 'SuperAdmin']}
                }), 200
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/<email>', methods=['GET'])
def get_user_dashboard(email):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT * FROM "JobApplications" WHERE "Email"=%s ORDER BY "SubmittedAt" DESC""", (email,))
        cols = [x[0] for x in c.description]
        data = [dict(zip(cols, r)) for r in c.fetchall()]
        conn.close()
        return jsonify(data)
    except: return jsonify([])

@app.route('/api/apply', methods=['POST'])
def apply():
    try:
        f = request.files['voiceRecord']
        fn = f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.ogg"
        f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))

        fn2 = None
        if 'voiceRecord2' in request.files:
            f2 = request.files['voiceRecord2']
            fn2 = f"VOICE2_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.ogg"
            f2.save(os.path.join(app.config['UPLOAD_FOLDER'], fn2))

        conn = get_db_connection()
        c = conn.cursor()
        d = request.form
        c.execute(
            """INSERT INTO "JobApplications" 
            ("JobTitle", "Company", "FullName", "Email", "Phone", "WhatsApp", "EnglishLevel", "Experience", 
             "Gender", "GraduationStatus", "MilitaryStatus", "NationalID", "Nationality", "Address", 
             "DateOfBirth", "FacultyUniversity", "VoiceRecordPath", "VoiceRecordPath2", "SubmittedAt", "RecruiterSource") 
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,%s)""",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'), d.get('dob') or None, d.get('faculty'), 
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
        c.execute("""SELECT "VoiceRecordPath" FROM "JobApplications" WHERE "ApplicationID"=%s""", (id,))
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
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT "FullName", "Role", "TeamName", "UnitName" FROM "Users" WHERE "Email"=%s""", (user_email,))
        user_data = c.fetchone()
        
        if user_data:
            u_name, u_role, u_team, u_unit = user_data
            if u_role in ['Admin', 'SuperAdmin', 'CEO']:
                c.execute("""SELECT * FROM "JobApplications" ORDER BY "SubmittedAt" DESC""")
            elif u_role == 'UnitManager':
                c.execute("""SELECT a.* FROM "JobApplications" a LEFT JOIN "Users" u ON a."RecruiterSource" = u."FullName" WHERE u."UnitName" = %s ORDER BY a."SubmittedAt" DESC""", (u_unit,))
            elif u_role == 'Leader':
                c.execute("""SELECT a.* FROM "JobApplications" a LEFT JOIN "Users" u ON a."RecruiterSource" = u."FullName" WHERE u."TeamName" = %s ORDER BY a."SubmittedAt" DESC""", (u_team,))
            else:
                c.execute("""SELECT * FROM "JobApplications" WHERE "RecruiterSource" = %s ORDER BY "SubmittedAt" DESC""", (u_name,))

            cols = [x[0] for x in c.description]
            data = [dict(zip(cols, r)) for r in c.fetchall()]
            conn.close()
            return jsonify(data)
        return jsonify([])
    except Exception as e: return jsonify([])

@app.route('/api/validator/applications', methods=['GET'])
def get_validator_applications():
    agency = request.args.get('agency', 'Unknown')
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT a."ApplicationID", a."FullName", a."Email", a."Phone", a."JobTitle", a."Company", a."RecruiterSource", 
                   a."AI_Rating", a."AI_Summary", a."VoiceRecordPath", a."VoiceRecordPath2",
                   v."HumanGrade" AS "AgencyGrade", v."ValidatorNotes"
            FROM "JobApplications" a
            LEFT JOIN "ValidatorGrades" v ON a."ApplicationID" = v."ApplicationID" AND v."AgencyName" = %s
            ORDER BY a."SubmittedAt" DESC
        """, (agency,))
        cols = [column[0] for column in c.description]
        data = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(data)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/validator/grade', methods=['POST'])
def submit_validator_grade():
    data = request.get_json()
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT "GradeID" FROM "ValidatorGrades" WHERE "ApplicationID" = %s AND "AgencyName" = %s""", 
                  (data.get('applicationId'), data.get('agencyName')))
        if c.fetchone():
            c.execute("""UPDATE "ValidatorGrades" SET "HumanGrade" = %s, "ValidatorNotes" = %s, "GradedAt" = CURRENT_TIMESTAMP WHERE "ApplicationID" = %s AND "AgencyName" = %s""", 
                      (data.get('grade'), data.get('notes', ''), data.get('applicationId'), data.get('agencyName')))
        else:
            c.execute("""INSERT INTO "ValidatorGrades" ("ApplicationID", "AgencyName", "HumanGrade", "ValidatorNotes") VALUES (%s, %s, %s, %s)""", 
                      (data.get('applicationId'), data.get('agencyName'), data.get('grade'), data.get('notes', '')))
        conn.commit()
        conn.close()
        return jsonify({"message": "Grade saved"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/all-agency-grades', methods=['GET'])
def get_all_agency_grades():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT a."FullName", a."Email", a."JobTitle", v."AgencyName", v."HumanGrade", v."ValidatorNotes", 
                   TO_CHAR(v."GradedAt", 'Mon DD, YYYY') as "GradedAt"
            FROM "ValidatorGrades" v
            INNER JOIN "JobApplications" a ON v."ApplicationID" = a."ApplicationID"
            ORDER BY v."GradedAt" DESC
        """)
        cols = [column[0] for column in c.description]
        data = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(data)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/uploads/<fn>')
def file(fn): return send_from_directory(app.config['UPLOAD_FOLDER'], fn)

if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)