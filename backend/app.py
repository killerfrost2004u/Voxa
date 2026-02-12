import os
import re
import threading
import json
import whisper
import spacy
import librosa
import numpy as np  # Needed for silence calculation
import pyodbc
import requests
import time
import datetime
import torch
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.utils import secure_filename

# --- INITIALIZE AI ENGINE ---
print("⏳ Loading Dark Wolves AI Engine...")
try:
    nlp = spacy.load("en_core_web_sm")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"⚙️ Hardware Acceleration: {device.upper()}")

    # UPGRADE 1: Use 'small.en'. It is stricter than 'base' and captures 'umms' better.
    stt_model = whisper.load_model("small.en", device=device)
    print(f"✅ AI Ready. Whisper: Small.en | LLM: Mistral")
except Exception as e:
    print(f"❌ Initialization Error: {e}")

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)
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
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;Login Timeout=60;"
    return pyodbc.connect(conn_str)


# --- THE "VIRTUAL EAR" (Acoustic Analysis) ---
def analyze_speech(file_path, transcript):
    try:
        # Load Audio
        y, sr = librosa.load(file_path)
        total_duration = librosa.get_duration(y=y, sr=sr)

        # 1. MEASURE SILENCE (The "Fluency" Detector)
        # Split audio into non-silent chunks
        non_silent_intervals = librosa.effects.split(y, top_db=20)  # 20dB threshold
        non_silent_time = sum((end - start) for start, end in non_silent_intervals) / sr

        silence_time = total_duration - non_silent_time
        silence_ratio = (silence_time / total_duration) * 100 if total_duration > 0 else 0

        # 2. MEASURE TRUE SPEED
        words = transcript.split()
        word_count = len(words)

        # WPM based on TOTAL time (includes hesitation)
        wpm = (word_count / total_duration) * 60

        # Articulation Rate (Speed when actually talking)
        articulation_rate = (word_count / non_silent_time) * 60 if non_silent_time > 0 else 0

        # 3. FILLERS
        fillers = ['um', 'uh', 'ah', 'like', 'you know', 'err', 'hmm']
        filler_count = sum(1 for w in words if w.lower() in fillers)

        doc = nlp(transcript)
        unique_words = len(set([t.text.lower() for t in doc if t.is_alpha]))

        return {
            "wpm": round(wpm, 1),
            "articulation": round(articulation_rate, 1),
            "silence_pct": round(silence_ratio, 1),
            "unique_words": unique_words,
            "filler_count": filler_count
        }
    except Exception as e:
        print(f"⚠️ Metrics Error: {e}")
        return {"wpm": 0, "articulation": 0, "silence_pct": 0, "unique_words": 0, "filler_count": 0}


def ai_worker(app_id, file_path):
    print(f"🤖 [1/4] Starting Deep Analysis for App #{app_id}...")
    try:
        # 1. Transcribe (Small.en model)
        print(f"🎙️ [2/4] Transcribing...")
        result = stt_model.transcribe(file_path, fp16=False, language='en')
        transcript = result['text']

        # 2. Metrics (The "Virtual Ear")
        metrics = analyze_speech(file_path, transcript)

        # GENERATE ACOUSTIC PROFILE
        profile = "Native-like flow."
        if metrics['silence_pct'] > 30:
            profile = "Disjointed. Long pauses/hesitation (Low Fluency)."
        elif metrics['silence_pct'] > 15:
            profile = "Moderate hesitation."

        if metrics['wpm'] < 100:
            profile += " Very slow speaking pace."

        print(f"📊 Acoustics: Silence={metrics['silence_pct']}% | WPM={metrics['wpm']} | Profile={profile}")

        # 3. MISTRAL PROMPT (With Acoustic Data)
        print(f"🧠 [3/4] Requesting Mistral (With Acoustic Data)...")

        system_prompt = f"""
        You are a strict IELTS/CEFR Examiner.
        You must grade based on Transcript Complexity AND Acoustic Fluency.

        === CANDIDATE ACOUSTICS (THE "EAR") ===
        - Silence Ratio: {metrics['silence_pct']}% (Native is < 15%. High silence = struggling).
        - Speaking Pace: {metrics['wpm']} WPM (Native is 130-150).
        - Fluency Profile: {profile}

        === GRADING RULES ===
        1. **Automatic Downgrade:** If Silence > 25% OR Pace < 90 WPM, the MAXIMUM score is B1 (60), no matter how good the grammar is.
        2. **C1 Requirement:** Must have Fast Pace (>120 WPM), Low Silence (<15%), AND Complex Vocabulary ("However", "Therefore").
        3. **B2 Requirement:** Good Pace (>110 WPM), Moderate Silence allowed.

        === TRANSCRIPT ===
        "{transcript}"

        Return JSON: {{"level": "B1", "score": 55, "summary": "Grammar is okay, but 30% silence indicates struggle to find words."}}
        """

        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "mistral",
                "messages": [{"role": "system", "content": system_prompt}],
                "stream": False,
                "options": {"temperature": 0.1}
            },
            timeout=900
        )
        response.raise_for_status()
        content = response.json()['message']['content']
        match = re.search(r'\{.*\}', content, re.DOTALL)

        if match:
            ai_data = json.loads(match.group())
            rating = f"{ai_data['level']} ({ai_data['score']})"
            print(f"✅ [4/4] Final Score: {rating}")

            for i in range(3):
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE JobApplications SET Transcription=?, AI_Rating=?, AI_Summary=?, SpeechRate=? WHERE ApplicationID=?",
                        (transcript, rating, ai_data['summary'], metrics['wpm'], app_id))
                    conn.commit()
                    conn.close()
                    print("🏁 Saved.")
                    break
                except:
                    time.sleep(1)

    except Exception as e:
        print(f"❌ Error: {e}")


# --- ROUTES ---
@app.route('/api/jobs', methods=['GET'])
def get_jobs(): return jsonify([])  # Mock for simplicity


@app.route('/api/dashboard/<email>', methods=['GET'])
def get_dash(email):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM JobApplications WHERE Email=? ORDER BY SubmittedAt DESC", (email,))
        cols = [x[0] for x in c.description]
        return jsonify([dict(zip(cols, r)) for r in c.fetchall()])
    except:
        return jsonify([])


@app.route('/api/apply', methods=['POST'])
def apply():
    try:
        f = request.files['voiceRecord']
        fn = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{f.filename}")
        f.save(os.path.join(app.config['UPLOAD_FOLDER'], fn))

        conn = get_db_connection()
        c = conn.cursor()
        # Simplified insert for brevity - ensure your full insert matches this
        query = "INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,GETDATE()); SELECT SCOPE_IDENTITY();"
        d = request.form
        c.execute(query,
                  (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
                   d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
                   d.get('nationalId'), d.get('nationality'), d.get('address'), fn))
        conn.commit()
        return jsonify({"message": "OK"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/analyze/<int:id>', methods=['POST'])
def analyze(id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT VoiceRecordPath FROM JobApplications WHERE ApplicationID=?", (id,))
    r = c.fetchone()
    if r:
        threading.Thread(target=ai_worker, args=(id, os.path.join(app.config['UPLOAD_FOLDER'], r[0]))).start()
        return jsonify({"message": "Started"})
    return jsonify({"error": "404"}), 404


@app.route('/api/admin/applications', methods=['GET'])
def apps():
    c = get_db_connection().cursor()
    c.execute("SELECT * FROM JobApplications ORDER BY SubmittedAt DESC")
    cols = [x[0] for x in c.description]
    return jsonify([dict(zip(cols, r)) for r in c.fetchall()])


@app.route('/uploads/<fn>')
def file(fn): return send_from_directory(app.config['UPLOAD_FOLDER'], fn)


if __name__ == '__main__': app.run(debug=True, port=5000)