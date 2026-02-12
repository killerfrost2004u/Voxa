import os
import re
import threading
import json
import whisper
import spacy
import librosa
import pyodbc
import requests
import time
import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.utils import secure_filename
from werkzeug.exceptions import BadRequest

# --- INITIALIZE DARK WOLVES AI ENGINE ---
print("⏳ Loading Dark Wolves AI Engine...")
try:
    nlp = spacy.load("en_core_web_sm")
    # Load Whisper on CPU
    stt_model = whisper.load_model("base", device="cpu")
    print(f"✅ AI Engine Ready. Whisper: Base (English Forced) | LLM: Llama 3.2")
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
    # Long timeout for SQL
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;Login Timeout=30;"
    return pyodbc.connect(conn_str)


def analyze_speech(file_path, transcript):
    try:
        audio_duration = librosa.get_duration(path=file_path)
        words = transcript.split()
        word_count = len(words)

        # Avoid division by zero
        if audio_duration <= 0: audio_duration = 1

        wpm = (word_count / audio_duration) * 60

        fillers = ['um', 'uh', 'ah', 'like', 'you know', 'err', 'hmm', 'er']
        filler_count = sum(1 for w in words if w.lower() in fillers)

        # Calculate ratio safely
        filler_ratio = (filler_count / word_count) * 100 if word_count > 0 else 0

        doc = nlp(transcript)
        unique_words = len(set([t.text.lower() for t in doc if t.is_alpha]))

        return {
            "wpm": round(wpm, 1),
            "unique_words": unique_words,
            "duration": round(audio_duration, 1),
            "filler_count": filler_count,
            "filler_ratio": round(filler_ratio, 1)
        }
    except Exception as e:
        print(f"⚠️ Metrics Error: {e}")
        return {"wpm": 0, "unique_words": 0, "duration": 0, "filler_count": 0, "filler_ratio": 0}


def ai_worker(app_id, file_path):
    print(f"🤖 [1/4] Starting Analysis for App #{app_id}...")
    try:
        # Step 1: Transcription (FORCED ENGLISH)
        print(f"🎙️ [2/4] Transcribing audio (Forced English)...")

        # 'language=en' prevents Arabic hallucinations
        result = stt_model.transcribe(file_path, fp16=False, language='en')
        transcript = result['text']
        print(f"📝 Transcription: {transcript[:50]}...")

        # Step 2: Metrics
        metrics = analyze_speech(file_path, transcript)

        fluency_note = "Normal flow."
        if metrics['wpm'] < 90:
            fluency_note = "Very slow/hesitant speech."
        elif metrics['wpm'] > 110:
            fluency_note = "Fluent, natural speed."

        if metrics['filler_ratio'] > 5:
            fluency_note += " Frequent hesitation markers."
        else:
            fluency_note += " Clear speech (few fillers)."

        # Step 3: LLM Judgment (High Timeout)
        print(f"🧠 [3/4] Requesting Llama 3.2 (This may take time)...")

        system_prompt = f"""
        You are an expert CEFR English Examiner. Grade the candidate based on text AND fluency data.

        CANDIDATE DATA:
        - Speech Rate: {metrics['wpm']} WPM (Native: 120-150).
        - Fluency Assessment: {fluency_note}
        - Hesitation Markers: {metrics['filler_count']}

        SCORING RUBRIC (FAIR):
        - A2 (30-49): Slow (<90 WPM), broken grammar.
        - B1 (50-64): Understandable but slow. Basic errors.
        - B2 (65-79): Fluent (>110 WPM), clear ideas. Minor errors OK.
        - C1 (80-95): Fast, natural flow, complex vocabulary, near-native.

        INSTRUCTIONS:
        1. If WPM is low (<90), cap score at B1 (Max 60).
        2. If they speak fast (>120) and clear, give a fluency bonus (+5 points).

        Return ONLY valid JSON: {{"level": "B2", "score": 75, "summary": "Fluent speed, good vocab."}}
        """

        try:
            # INCREASED TIMEOUT TO 300 SECONDS (5 Minutes)
            response = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "llama3.2",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Transcript: \"{transcript}\""}
                    ],
                    "stream": False,
                    "options": {"temperature": 0.2}
                },
                timeout=300
            )
            response.raise_for_status()

            # Robust JSON extraction
            content = response.json()['message']['content']
            match = re.search(r'\{.*\}', content, re.DOTALL)

            if match:
                ai_data = json.loads(match.group())
                print(f"✅ [4/4] Analysis Complete: {ai_data['level']} ({ai_data['score']})")

                # Database Retry Logic
                for attempt in range(3):
                    try:
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE JobApplications 
                            SET Transcription = ?, AI_Rating = ?, AI_Summary = ?, SpeechRate = ?
                            WHERE ApplicationID = ?
                        """, (transcript, f"{ai_data['level']} ({ai_data['score']}/100)", ai_data['summary'],
                              metrics['wpm'], app_id))
                        conn.commit()
                        conn.close()
                        print(f"🏁 Database updated for App {app_id}")
                        break
                    except Exception as db_err:
                        print(f"⚠️ DB Error (Attempt {attempt + 1}): {db_err}")
                        time.sleep(2)
            else:
                print("❌ AI returned invalid JSON format.")

        except requests.exceptions.Timeout:
            print("❌ AI CRITICAL TIMEOUT: Llama 3.2 took > 5 minutes.")
        except Exception as e:
            print(f"❌ AI/LLM Error: {e}")

    except Exception as e:
        print(f"❌ Worker Error: {e}")


# --- ROUTES ---

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
    except Exception as e:
        print(f"Job Fetch Error: {e}")
        return jsonify([])


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
        if 'voiceRecord' not in request.files: return jsonify({"error": "No voice record provided"}), 400
        file = request.files['voiceRecord']
        if file.filename == '': return jsonify({"error": "No selected file"}), 400

        data = request.form
        filename = secure_filename(f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
        path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(path)

        conn = get_db_connection()
        cursor = conn.cursor()
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
            return jsonify({"message": "Application received!"}), 201
        else:
            raise Exception("No ID returned from database.")
    except Exception as e:
        print(f"❌ CRITICAL APPLY ERROR: {e}")
        return jsonify({"error": str(e)}), 500


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