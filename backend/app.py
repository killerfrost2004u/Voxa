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

        
        # 3. Apply the Ultimate Category-Based HR Prompt (Expanded with Plus Levels)
        prompt = """
        You are an expert CEFR English Examiner and Technical Recruiter. Listen to the candidate's audio natively.
        Evaluate their English proficiency and provide individual CEFR grades for Fluency, Pronunciation, and Grammar, plus an Overall grade.

        SCORING RUBRIC (Applies to all categories):
        - 0-25: A1 & A2 (Beginner)
        - 26-40: B1 (Intermediate)
        - 41-50: B1+ (Strong Intermediate)
        - 51-65: B2 (Upper Intermediate)
        - 66-75: B2+ (Advanced Intermediate) - Flawless basic grammar, very clear accent, confident flow, but lacks the rich vocabulary or highly complex storytelling of C1.
        - 76-85: C1 (Advanced) - Highly fluent, natural rhythm, minor preposition quirks allowed if spontaneous storytelling is strong.
        - 86-95: C1+ (Strong Advanced) - Extremely compelling vocabulary, near-flawless execution, exceptional native-like rhythm and expression.
        - 96-100: C2 (Mastery)

        CRITICAL GRADING RULES:
        1. THE STORYTELLER ALLOWANCE (Protects C1/C1+): If a candidate is highly spontaneous and easily telling a detailed story, DO NOT penalize fluency for using 'um' or 'uh' to remember facts. Non-idiomatic phrasing (e.g., 'they hold the company') are minor translation quirks, NOT foundational errors. A strong storyteller belongs in C1 or C1+.
        2. B2 vs B2+ vs C1: If a candidate has perfect grammar and clear pronunciation but sounds slightly rehearsed or uses mostly standard vocabulary, give them a B2+. If they use rich idioms and complex spontaneous structures, push them to C1 or C1+.
        3. THE ACCENT FORGIVENESS: A noticeable regional accent DOES NOT cap pronunciation at B1+ unless it makes the words actually incomprehensible. If easily understood, they deserve B2, B2+, or C1.
        4. THE FOUNDATIONAL GRAMMAR CAP (Protects B1+): Only cap grammar at B1/B1+ if the candidate drops crucial verbs (e.g., 'this my last year', 'I looking forward') or completely breaks sentence structure. 
        5. SCRIPT READING PENALTY: If the candidate sounds like they are reading a rehearsed script, cap their fluency and overall grade at B2 or B2+ maximum.
        6. STRICT JSON FORMATTING: Use ONLY single quotes inside the JSON string values. DO NOT copy the placeholder values below.

        Provide a summary of their speech. Return ONLY valid JSON in this EXACT format (replace the bracketed placeholders with your actual assessment):
        {
            "overall_level": "[Insert Level here, e.g. C1+]",
            "overall_score": [Insert Integer Score here, e.g. 88],
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
                # --- NEW: Trigger WhatsApp Bot ---
                # Fetch the candidate's details from the database
                conn2 = get_db_connection()
                c2 = conn2.cursor()
                c2.execute("SELECT FullName, WhatsApp, JobTitle FROM JobApplications WHERE ApplicationID=?", (app_id,))
                candidate_data = c2.fetchone()
                conn2.close()
            
                if candidate_data and candidate_data[1]:
                    c_name = candidate_data[0].split()[0] # Get first name
                    c_whatsapp = candidate_data[1]
                    c_job = candidate_data[2]
                
                    print(f"🤖 AI Finished. Handing over to WhatsApp Bot for {c_name}...")
                    process_job_offer(app_id, ai_data['overall_level'], c_name, c_whatsapp, c_job)
        else:
            print("❌ AI returned no response.")

    except Exception as e:
        print(f"❌ Worker Error: {e}")


# --- WHATSAPP BOT ENGINE ---
def send_whatsapp_message(to_number, message_body):
    try:
        # Format number for Twilio (e.g., +201234567890 -> whatsapp:+201234567890)
        # Assuming the user inputted their number with the country code
        if not to_number.startswith('+'):
            to_number = '+' + to_number
            
        formatted_number = f"whatsapp:{to_number}"
        
        client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        message = client.messages.create(
            from_=os.getenv("TWILIO_WHATSAPP_NUMBER"),
            body=message_body,
            to=formatted_number
        )
        print(f"📱 WhatsApp sent to {to_number}! Message SID: {message.sid}")
    except Exception as e:
        print(f"❌ Failed to send WhatsApp: {e}")

def process_job_offer(application_id, ai_overall_level, candidate_name, whatsapp_number, applied_job_title):
    # This is a basic matching logic. You can make this as complex as you want!
    
    # Let's say the job they applied for requires C1.
    requires_c1 = ["Closer", "Acquisition Specialist", "Senior Cold Caller"]
    
    is_high_level_job = any(job in applied_job_title for job in requires_c1)
    
    if is_high_level_job and ai_overall_level in ["C1", "C1+", "C2"]:
        # Scenario B: They applied for a hard job and are qualified!
        msg = f"🎉 Hello {candidate_name}! Congratulations, Dark Wolves has reviewed your voice intro and you passed our C1 English requirement!\n\nYou are officially accepted for the '{applied_job_title}' position. Please reply 'ACCEPT' to begin onboarding, or 'DECLINE' if you are no longer interested."
        
    elif is_high_level_job and ai_overall_level in ["B1+", "B2", "B2+"]:
        # Scenario A: They applied for a hard job, but their English is B2.
        alternative_job = "Junior Lead Generation Specialist"
        msg = f"🐺 Hello {candidate_name}. Thank you for applying to Dark Wolves!\n\nWhile your English level ({ai_overall_level}) is great, the '{applied_job_title}' role requires a C1 level. However, we were very impressed by your fluency and would like to offer you a position as a '{alternative_job}' instead!\n\nWould you like to accept this alternative offer? Reply 'ACCEPT' or 'DECLINE'."
        
    elif not is_high_level_job and ai_overall_level in ["B1+", "B2", "B2+", "C1", "C1+", "C2"]:
        # They applied for a standard job and meet the requirements
         msg = f"🎉 Hello {candidate_name}! Congratulations, you are officially accepted for the '{applied_job_title}' position at Dark Wolves!\n\nPlease reply 'ACCEPT' to begin onboarding, or 'DECLINE' if you are no longer interested."
    else:
        # Scenario C: They scored below B1+
        msg = f"Hello {candidate_name}. Thank you for applying to Dark Wolves for the '{applied_job_title}' role. Unfortunately, we require a minimum B1+ English proficiency for our current openings. We encourage you to apply again in the future!"

    # Send the message!
    send_whatsapp_message(whatsapp_number, msg)

# --- ROUTES ---
@app.route('/api/whatsapp/reply', methods=['POST'])
def whatsapp_reply():
    # Get the message the candidate sent
    incoming_msg = request.values.get('Body', '').strip().lower()
    sender_number = request.values.get('From', '')

    # Create a Twilio response object
    resp = MessagingResponse()
    msg = resp.message()

    if 'accept' in incoming_msg:
        # Here you could write an SQL command to update their status in the DB to "Accepted"
        msg.body("🐺 Awesome! Welcome to the pack. Our HR team will reach out shortly with your contract and onboarding details.")
    elif 'decline' in incoming_msg:
        # Here you could update their status to "Declined"
        msg.body("Understood. Thank you for your time, and we wish you the best of luck in your career!")
    else:
        msg.body("I didn't quite catch that. Please reply with 'ACCEPT' or 'DECLINE'.")

    return str(resp)


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