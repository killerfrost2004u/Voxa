import os
import re
import threading
import json
import spacy
import librosa
import numpy as np
import pyodbc
import requests
import time
import datetime
import torch
import gc  # Garbage Collector
import csv  # Restored for Jobs
import io  # Restored for Jobs
import urllib.parse  # Restored for Jobs
import itertools  # Restored for Jobs
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.utils import secure_filename

# NOTE: We do NOT import models globally anymore to save memory
import whisper
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

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

# Global NLP (Small enough to keep)
nlp = spacy.load("en_core_web_sm")
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"✅ System Ready. Hardware: {device.upper()}")


def get_db_connection():
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;Login Timeout=60;"
    # Retry logic for busy server
    for attempt in range(3):
        try:
            return pyodbc.connect(conn_str, timeout=10)
        except pyodbc.Error as e:
            if attempt == 2: raise e
            time.sleep(1)
    return None


# --- MEMORY CLEANER ---
def clean_memory():
    if device == "cuda":
        torch.cuda.empty_cache()
    gc.collect()


# --- STEP 1: NEURAL EAR (Wav2Vec2) ---
def run_wav2vec_analysis(file_path):
    print("⏳ Loading Neural Ear (Wav2Vec2)...")
    try:
        # Load Model
        processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
        model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h").to(device)

        # Process Audio
        speech, rate = librosa.load(file_path, sr=16000)
        inputs = processor(speech, sampling_rate=16000, return_tensors="pt", padding=True).to(device)

        with torch.no_grad():
            logits = model(inputs.input_values).logits

        probs = torch.nn.functional.softmax(logits, dim=-1)
        confidence = torch.max(probs, dim=-1).values
        avg_conf = torch.mean(confidence).item() * 100

        # Normalize
        if avg_conf > 95:
            score = 98
        elif avg_conf > 88:
            score = 85
        elif avg_conf > 78:
            score = 65
        else:
            score = 45

        # DELETE MODEL TO FREE MEMORY
        del model
        del processor
        del inputs
        clean_memory()

        return score, avg_conf
    except Exception as e:
        print(f"⚠️ Wav2Vec Error: {e}")
        return 50, 0


# --- STEP 2: SCRIBE (Whisper) ---
def run_whisper_transcription(file_path):
    print("⏳ Loading Scribe (Whisper)...")
    try:
        model = whisper.load_model("small.en", device=device)
        result = model.transcribe(file_path, fp16=False)
        text = result['text']

        # DELETE MODEL
        del model
        clean_memory()

        return text
    except Exception as e:
        print(f"⚠️ Whisper Error: {e}")
        return ""


# --- STEP 3: METRICS (Librosa) ---
def get_fluency_metrics(file_path):
    try:
        y, sr = librosa.load(file_path)
        duration = librosa.get_duration(y=y, sr=sr)
        non_silent = librosa.effects.split(y, top_db=25)
        speaking_time = sum((end - start) for start, end in non_silent) / sr
        silence_pct = ((duration - speaking_time) / duration) * 100
        return {"silence": round(silence_pct, 1), "duration": duration}
    except:
        return {"silence": 0, "duration": 1}


# --- WORKER ---

def ai_worker(app_id, file_path):
    print(f"🤖 Processing App #{app_id}...")
    try:
        # 1. Wav2Vec
        pronunciation_score, raw_conf = run_wav2vec_analysis(file_path)
        print(f"👂 Pronunciation: {pronunciation_score} (Raw {round(raw_conf, 1)})")

        # 2. Whisper
        transcript = run_whisper_transcription(file_path)
        print(f"📝 Transcript: {transcript[:40]}...")

        # 3. Acoustics
        acoustics = get_fluency_metrics(file_path)
        wpm = (len(transcript.split()) / acoustics['duration']) * 60 if acoustics['duration'] > 0 else 0
        print(f"📊 DATA: Silence={acoustics['silence']}% | WPM={int(wpm)}")

        # 4. Mistral
        print(f"🧠 Requesting Mistral...")
        system_prompt = f"""
        You are a CEFR Examiner. Grade using this Sensor Data.

        === SENSOR DATA ===
        1. PRONUNCIATION: {pronunciation_score}/100.
        2. SILENCE: {acoustics['silence']}%.
        3. SPEED: {int(wpm)} WPM.

        === TRANSCRIPT ===
        "{transcript}"

        === LOGIC ===
        - IF Pronunciation > 90 AND WPM > 100 -> GRADE C1.
        - IF Pronunciation > 80 -> GRADE B2.
        - ELSE -> GRADE B1.

        Return ONLY valid JSON in this format: 
        {{"level": "B2", "score": 75, "summary": "Reasoning here."}}
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

        if response.status_code == 200:
            content = response.json()['message']['content']

            # --- JSON REPAIR LOGIC ---
            # Attempt to find JSON inside the text
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                json_str = match.group()
            else:
                # If Mistral failed to give JSON, force a default based on logic
                print("⚠️ Mistral failed to output JSON. Using fallback logic.")
                if pronunciation_score > 85:
                    json_str = '{"level": "C1", "score": 88, "summary": "High pronunciation score detected."}'
                elif pronunciation_score > 70:
                    json_str = '{"level": "B2", "score": 75, "summary": "Good pronunciation but some issues."}'
                else:
                    json_str = '{"level": "B1", "score": 60, "summary": "Low pronunciation score."}'

            ai_data = json.loads(json_str)
            final_grade = f"{ai_data['level']} ({ai_data['score']})"
            print(f"✅ FINAL GRADE: {final_grade}")

            conn = get_db_connection()
            c = conn.cursor()
            c.execute(
                "UPDATE JobApplications SET Transcription=?, AI_Rating=?, AI_Summary=?, SpeechRate=? WHERE ApplicationID=?",
                (transcript, final_grade, ai_data['summary'], wpm, app_id))
            conn.commit()
            conn.close()
        else:
            print(f"❌ Mistral Error: {response.status_code}")

    except Exception as e:
        print(f"❌ Error: {e}")


# --- ROUTES ---

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        # RESTORED GOOGLE SHEET LOGIC
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
    except Exception as e:
        print(f"Job Fetch Error: {e}")
        return jsonify([])


@app.route('/api/dashboard/<email>', methods=['GET'])
def get_user_dashboard(email):
    try:
        c = get_db_connection().cursor()
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
        c = get_db_connection().cursor()
        d = request.form
        c.execute(
            "INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,GETDATE())",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'), fn))
        c.connection.commit()
        return jsonify({"message": "OK"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/analyze/<int:id>', methods=['POST'])
def analyze(id):
    c = get_db_connection().cursor()
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


if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)