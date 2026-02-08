import os
import re
import threading
import json
import whisper
import ollama
import spacy
import librosa
import torch
import pyodbc
import bcrypt
import requests
import csv
import io
import urllib.parse
import itertools
import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail, Message  # Added for email support
from werkzeug.utils import secure_filename

# --- INITIALIZE DARK WOLVES AI ENGINE ---
print("⏳ Loading Dark Wolves AI Engine...")
try:
    nlp = spacy.load("en_core_web_sm")
    # Detect GPU for Whisper
    device = "cuda" if torch.cuda.is_available() else "cpu"
    stt_model = whisper.load_model("base", device=device)
    print(f"✅ AI Engine Ready. Running on: {device.upper()}")
except Exception as e:
    print(f"❌ Initialization Error: {e}")

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"
UPLOAD_FOLDER = 'uploads'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- EMAIL CONFIGURATION ---
# Replace 'your-app-password-here' with your 16-character Google App Password
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'darkwolvesagency@gmail.com'
app.config['MAIL_PASSWORD'] = 'ksww svkd hqpd ugqp'
mail = Mail(app)


def get_db_connection():
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;"
    return pyodbc.connect(conn_str)


# --- THE SCIENTIST: LINGUISTIC ANALYSIS ---
def analyze_speech(file_path, transcript):
    # 1. Calculate Speech Rate (Words Per Minute)
    audio_duration = librosa.get_duration(path=file_path)
    word_count = len(transcript.split())
    wpm = (word_count / audio_duration) * 60 if audio_duration > 0 else 0

    # 2. Calculate Vocabulary Richness
    doc = nlp(transcript)
    unique_words = len(set([t.text.lower() for t in doc if t.is_alpha]))

    return {
        "wpm": round(wpm, 1),
        "unique_words": unique_words,
        "duration": round(audio_duration, 1)
    }


# --- THE BRAIN: LOCAL AI WORKER ---
def ai_worker(app_id, file_path):
    print(f"🤖 Processing AI Analysis for App #{app_id}...")
    try:
        # Step 1: Local Transcription
        result = stt_model.transcribe(file_path)
        transcript = result['text']

        # Step 2: Extract Metrics
        metrics = analyze_speech(file_path, transcript)

        # Step 3: Local LLM Judgment (Llama 3.2)
        prompt = f"""
        Analyze this interview transcript:
        Transcript: "{transcript}"
        Metrics: Speed: {metrics['wpm']} WPM, Unique Words: {metrics['unique_words']}, Duration: {metrics['duration']}s.

        Task:
        1. Rate CEFR Level (A1-C2).
        2. Give a Dark Wolves Score (1-100).
        3. 1-sentence summary of personality/fluency.

        RESPONSE MUST BE ONLY JSON: {{"level": "B2", "score": 82, "summary": "Example text."}}
        """

        response = ollama.chat(model='llama3.2', messages=[{'role': 'user', 'content': prompt}])

        # Parse JSON safely
        match = re.search(r'\{.*\}', response['message']['content'], re.DOTALL)
        if match:
            ai_data = json.loads(match.group())

            # Step 4: Update Database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE JobApplications 
                SET Transcription = ?, AI_Rating = ?, AI_Summary = ?, SpeechRate = ?
                WHERE ApplicationID = ?
            """, (transcript, f"{ai_data['level']} ({ai_data['score']}/100)", ai_data['summary'], metrics['wpm'],
                  app_id))
            conn.commit()
            conn.close()
            print(f"✅ AI Analysis complete for App {app_id}")

    except Exception as e:
        print(f"❌ AI Worker Error: {e}")


# --- HELPER: CLEAN TEXT ---
def clean_text_list(text):
    if not text: return []
    text = text.replace('\r', '\n').replace('•', '\n').replace(' - ', '\n')
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        parts = re.split(r'\s{2,}', line)
        for part in parts:
            part = part.strip()
            if part and len(part) > 1: cleaned.append(part)
    return cleaned


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
            if i == 0 or len(col) < 10: continue
            company = col[1].strip()
            title = col[2].strip()
            if not company or not title: continue
            jobs.append({
                "id": i, "title": title, "company": company,
                "location": col[8].strip() or "Remote", "salary": col[6].strip() or "Competitive",
                "type": "Full Time", "training": col[9].strip(),
                "requirements": clean_text_list(col[3]) + clean_text_list(col[7]),
                "description": col[10].strip(), "logo": (company[:2]).upper()
            })
        return jsonify(jobs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/apply', methods=['POST'])
def apply():
    try:
        data = request.form
        file = request.files.get('voiceRecord')
        filename = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        conn = get_db_connection()
        cursor = conn.cursor()

        # Full insert with all your form fields
        query = """
            INSERT INTO JobApplications 
            (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, 
             Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE());
            SELECT SCOPE_IDENTITY();
        """
        cursor.execute(query, (
            data.get('title'), data.get('company'), data.get('name'), data.get('email'),
            data.get('phone'), data.get('whatsapp'), data.get('english'), data.get('experience'),
            data.get('gender'), data.get('gradStatus'), data.get('militaryStatus', 'N/A'),
            data.get('nationalId'), data.get('nationality'), data.get('address'), filename
        ))
        new_id = int(cursor.fetchone()[0])
        conn.commit()
        conn.close()

        # Start AI process in background
        threading.Thread(target=ai_worker, args=(new_id, path)).start()
        return jsonify({"message": "Application received!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/applications', methods=['GET'])
def get_apps():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM JobApplications ORDER BY SubmittedAt DESC")
        columns = [column[0] for column in cursor.description]
        apps = [dict(zip(columns, row)) for row in cursor.fetchall()]
        for a in apps:
            if a['SubmittedAt']: a['SubmittedAt'] = a['SubmittedAt'].strftime('%Y-%m-%d %H:%M')
        return jsonify(apps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT FullName, Email, PasswordHash, IsAdmin FROM Users WHERE Email = ?", (data['email'],))
    user = cursor.fetchone()
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.PasswordHash.encode('utf-8')):
        return jsonify({"user": {"name": user.FullName, "email": user.Email, "isAdmin": bool(user.IsAdmin)}})
    return jsonify({"error": "Invalid"}), 401


# --- CONTACT US ROUTE ---
@app.route('/api/contact', methods=['POST'])
def contact_us():
    try:
        data = request.json

        # 1. Save to Database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ContactMessages (FullName, Email, Subject, Message, SubmittedAt) 
            VALUES (?, ?, ?, ?, GETDATE())
        """, (data['name'], data['email'], data['subject'], data['message']))
        conn.commit()
        conn.close()

        # 2. Send the Email
        msg = Message(
            subject=f"New Contact Form: {data['subject']}",
            sender=app.config['MAIL_USERNAME'],
            recipients=['darkwolvesagency@gmail.com']
        )
        msg.body = f"From: {data['name']} ({data['email']})\n\nSubject: {data['subject']}\n\nMessage:\n{data['message']}"
        mail.send(msg)

        return jsonify({"message": "Message sent successfully!"}), 201
    except Exception as e:
        print(f"❌ Contact Error: {e}")
        return jsonify({"error": "Failed to send message"}), 500


@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)