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
from werkzeug.exceptions import BadRequest

# --- INITIALIZE DARK WOLVES AI ENGINE ---
print("⏳ Loading Dark Wolves AI Engine...")
try:
    nlp = spacy.load("en_core_web_sm")
    # OPTIMIZATION: Use 'tiny' model on CPU to save GPU VRAM for Llama
    stt_model = whisper.load_model("tiny", device="cpu")
    print(f"✅ AI Engine Ready. Whisper: CPU (Tiny) | LLM: Llama 3.2 (Standard)")
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


def analyze_speech(file_path, transcript):
    try:
        audio_duration = librosa.get_duration(path=file_path)
        word_count = len(transcript.split())
        wpm = (word_count / audio_duration) * 60 if audio_duration > 0 else 0
        doc = nlp(transcript)
        unique_words = len(set([t.text.lower() for t in doc if t.is_alpha]))
        return {"wpm": round(wpm, 1), "unique_words": unique_words, "duration": round(audio_duration, 1)}
    except Exception:
        return {"wpm": 0, "unique_words": 0, "duration": 0}


# ... [Keep imports and setup code] ...

# ... inside backend/app.py ...

def ai_worker(app_id, file_path):
    print(f"🤖 [1/4] Starting Strict Analysis for App #{app_id}...")
    try:
        # Step 1: Transcription
        print(f"🎙️ [2/4] Transcribing audio...")
        result = stt_model.transcribe(file_path, fp16=False)
        transcript = result['text']
        print(f"📝 Transcription: {transcript[:50]}...")

        # Step 2: Metrics
        metrics = analyze_speech(file_path, transcript)

        # Step 3: LLM Judgment (STRICT MODE)
        print(f"🧠 [3/4] Requesting Llama 3.2 (Strict) analysis...")

        system_prompt = """
        You are a highly critical CEFR English Examiner. Your job is to find errors.

        CRITICAL RULES:
        1. If the speaker misses articles ("I go to store" instead of "the store"), Max Score = 65 (B1).
        2. If the speaker uses wrong verb tenses ("I going" instead of "I am going"), Max Score = 55 (B1).
        3. If the vocabulary is basic (only uses "good", "bad", "big"), Max Score = 60 (B1).
        4. B2 requires complex connecting words (however, although, therefore). If absent, grade B1.

        SCORING GUIDE:
        - A2 (30-49): Broken grammar, very simple sentences.
        - B1 (50-64): Understandable but many small grammar mistakes. Basic vocabulary.
        - B2 (65-79): Fluent, rare grammar errors, uses idioms/complex sentences.
        - C1 (80-94): Professional, almost native-like.

        Analyze the transcript strictly. Do not be generous.
        Return ONLY valid JSON: {"level": "B1", "score": 58, "summary": "Grammar errors found: missing articles."}
        """

        response = ollama.chat(model='llama3.2', messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f"Transcript: \"{transcript}\""}
        ])

        match = re.search(r'\{.*\}', response['message']['content'], re.DOTALL)
        if match:
            ai_data = json.loads(match.group())
            print(f"✅ [4/4] Analysis Complete: {ai_data['level']} ({ai_data['score']})")

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
            print(f"🏁 Database updated for App {app_id}")
    except Exception as e:
        print(f"❌ AI Worker Error: {e}")

# ... [Keep the rest of the routes unchanged] ...
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
            jobs.append({
                "id": i, "title": col[2].strip(), "company": col[1].strip(),
                "location": col[8].strip() or "Remote", "salary": col[6].strip() or "Competitive",
                "requirements": col[3].strip() + "\n" + col[7].strip(),
                "description": col[10].strip(), "logo": (col[1].strip()[:2]).upper()
            })
        return jsonify(jobs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dashboard/<email>', methods=['GET'])
def get_user_dashboard(email):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM JobApplications WHERE Email = ? ORDER BY SubmittedAt DESC", (email,))
        columns = [column[0] for column in cursor.description]
        apps = [dict(zip(columns, row)) for row in cursor.fetchall()]
        for a in apps:
            if a['SubmittedAt']: a['SubmittedAt'] = a['SubmittedAt'].strftime('%Y-%m-%d %H:%M')
        conn.close()
        return jsonify(apps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/apply', methods=['POST'])
def apply():
    print(f"📥 Received Application Request")
    try:
        # Explicit check for file
        if 'voiceRecord' not in request.files:
            print("❌ Error: 'voiceRecord' is missing from request.files")
            return jsonify({"error": "No voice record provided"}), 400

        file = request.files['voiceRecord']
        # Double check filename is not empty
        if file.filename == '':
            print("❌ Error: No selected file")
            return jsonify({"error": "No selected file"}), 400

        data = request.form

        filename = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        conn = get_db_connection()
        cursor = conn.cursor()

        # Using .get() ensures we never crash on missing keys
        query = """
            SET NOCOUNT ON;
            INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, 
            Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE());
            SELECT SCOPE_IDENTITY();
        """
        cursor.execute(query, (
            data.get('title', 'N/A'), data.get('company', 'N/A'), data.get('name', 'N/A'),
            data.get('email', 'N/A'), data.get('phone', 'N/A'), data.get('whatsapp', 'N/A'),
            data.get('english', 'N/A'), data.get('experience', 'N/A'), data.get('gender', 'N/A'),
            data.get('gradStatus', 'N/A'), data.get('militaryStatus', 'N/A'),
            data.get('nationalId', 'N/A'), data.get('nationality', 'N/A'),
            data.get('address', 'N/A'), filename
        ))

        row = cursor.fetchone()
        if row:
            new_id = int(row[0])
            conn.commit()
            conn.close()
            # Success! Return immediately. AI is manual now.
            return jsonify({"message": "Application received!"}), 201
        else:
            raise Exception("No ID returned from database.")

    except Exception as e:
        print(f"❌ CRITICAL APPLY ERROR: {e}")
        return jsonify({"error": str(e)}), 500


# 🔥 MANUAL TRIGGER ROUTE
@app.route('/api/admin/analyze/<int:app_id>', methods=['POST'])
def trigger_analysis(app_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT VoiceRecordPath FROM JobApplications WHERE ApplicationID = ?", (app_id,))
        row = cursor.fetchone()
        conn.close()

        if row and row[0]:
            path = os.path.join(app.config['UPLOAD_FOLDER'], row[0])
            if os.path.exists(path):
                # Start AI in background ONLY when this specific button is clicked
                threading.Thread(target=ai_worker, args=(app_id, path)).start()
                return jsonify({"message": "Analysis started."})
            else:
                return jsonify({"error": "File not found."}), 404
        return jsonify({"error": "Application not found."}), 404
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
        conn.close()
        return jsonify(apps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False)