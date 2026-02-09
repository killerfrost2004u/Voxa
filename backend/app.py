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
from flask_mail import Mail, Message
from werkzeug.utils import secure_filename

# --- INITIALIZE DARK WOLVES AI ENGINE ---
print("⏳ Loading Dark Wolves AI Engine...")
try:
    nlp = spacy.load("en_core_web_sm")
    # Check for NVIDIA GPU
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

# --- EMAIL CONFIGURATION (Using SSL Port 465) ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = 'hima.yasser2004@gmail.com'
app.config['MAIL_PASSWORD'] = 'lqqzwvayhtaaumzt'
mail = Mail(app)


def get_db_connection():
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;"
    return pyodbc.connect(conn_str)


# --- THE SCIENTIST: LINGUISTIC ANALYSIS ---
def analyze_speech(file_path, transcript):
    audio_duration = librosa.get_duration(path=file_path)
    word_count = len(transcript.split())
    wpm = (word_count / audio_duration) * 60 if audio_duration > 0 else 0
    doc = nlp(transcript)
    unique_words = len(set([t.text.lower() for t in doc if t.is_alpha]))
    return {"wpm": round(wpm, 1), "unique_words": unique_words, "duration": round(audio_duration, 1)}


# --- THE BRAIN: LOCAL AI WORKER ---
def ai_worker(app_id, file_path):
    print(f"🤖 Processing AI Analysis for App #{app_id}...")
    try:
        result = stt_model.transcribe(file_path)
        transcript = result['text']
        metrics = analyze_speech(file_path, transcript)

        prompt = f"""
        Analyze this interview transcript:
        Transcript: "{transcript}"
        Metrics: Speed: {metrics['wpm']} WPM, Unique Words: {metrics['unique_words']}, Duration: {metrics['duration']}s.
        RESPONSE MUST BE ONLY JSON: {{"level": "B2", "score": 82, "summary": "Short summary."}}
        """
        response = ollama.chat(model='llama3.2', messages=[{'role': 'user', 'content': prompt}])
        match = re.search(r'\{.*\}', response['message']['content'], re.DOTALL)
        if match:
            ai_data = json.loads(match.group())
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


# --- EMAIL HELPER (Background Task) ---
def send_async_email(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
            print("📧 Email sent successfully in background!")
        except Exception as e:
            print(f"❌ Background Email Error: {e}")


# --- ROUTES ---

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
        response = requests.get(url)
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
                "requirements": col[3].strip() + "\n" + col[7].strip(),
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
        query = """
            INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, 
            Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE());
            SELECT SCOPE_IDENTITY();
        """
        cursor.execute(query, (data.get('title'), data.get('company'), data.get('name'), data.get('email'),
                               data.get('phone'), data.get('whatsapp'), data.get('english'), data.get('experience'),
                               data.get('gender'), data.get('gradStatus'), data.get('militaryStatus', 'N/A'),
                               data.get('nationalId'), data.get('nationality'), data.get('address'), filename))
        new_id = int(cursor.fetchone()[0])
        conn.commit()
        conn.close()

        threading.Thread(target=ai_worker, args=(new_id, path)).start()
        return jsonify({"message": "Application received!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/contact', methods=['POST'])
def contact_us():
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ContactMessages (FullName, Email, Subject, Message, SubmittedAt) 
            VALUES (?, ?, ?, ?, GETDATE())
        """, (data['name'], data['email'], data['subject'], data['message']))
        conn.commit()
        conn.close()

        msg = Message(
            subject=f"New Contact: {data['subject']}",
            sender=app.config['MAIL_USERNAME'],
            recipients=['darkwolvesagency@gmail.com']  # Final destination
        )
        msg.body = f"From: {data['name']} ({data['email']})\n\nMessage:\n{data['message']}"

        # Start background email thread
        threading.Thread(target=send_async_email, args=(app, msg)).start()

        return jsonify({"message": "Message received!"}), 201
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return jsonify({"error": "Failed to save message"}), 500


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
        conn.close()
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


@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)