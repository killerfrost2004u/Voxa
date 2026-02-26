import os

# Force models to stay on D: Drive
os.environ["HF_HOME"] = r"D:\AI_Models"
os.environ["TRANSFORMERS_CACHE"] = r"D:\AI_Models"

import re
import threading
import json
import librosa
import pyodbc
import time
import datetime
import torch
import gc
import csv
import io
import urllib.parse
import itertools
import requests  # <-- Added missing import for Google Sheets fetching
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.utils import secure_filename
import bcrypt

# --- QWEN2-AUDIO LALM ---
from transformers import AutoProcessor, Qwen2AudioForConditionalGeneration, BitsAndBytesConfig

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

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"✅ System Ready. Hardware: {device.upper()}")


def get_db_connection():
    conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER_NAME};DATABASE=DarkWolvesDB;Trusted_Connection=yes;TrustServerCertificate=yes;Login Timeout=60;"
    for attempt in range(5):
        try:
            return pyodbc.connect(conn_str)
        except pyodbc.Error as e:
            if attempt == 4: raise e
            time.sleep(2)
    return None


def clean_memory():
    if device == "cuda":
        torch.cuda.empty_cache()
    gc.collect()


# --- THE TRUE NATIVE AUDIO AI ---
def run_qwen_audio_analysis(file_path):
    print("⏳ Loading Qwen2-Audio-7B... (Using Virtual Memory & Double Quantization)")
    try:
        processor = AutoProcessor.from_pretrained("Qwen/Qwen2-Audio-7B-Instruct")

        # --- EXTREME COMPRESSION SETTINGS ---
        # This double-compresses the model to prevent laptop crashes
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,  # <--- Squeezes memory even more
            bnb_4bit_quant_type="nf4",
            llm_int8_enable_fp32_cpu_offload=True  # Allows safe spillover to Virtual RAM
        )

        model = Qwen2AudioForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2-Audio-7B-Instruct",
            device_map="auto",
            quantization_config=quantization_config,
            low_cpu_mem_usage=True,  # Crucial for Windows laptops
            offload_folder="offload", # <--- Add this: Safely offloads extra layers to disk
            max_memory={0: "6GB", "cpu": "14GB"}
        )

        print("👂 Qwen is listening natively. Transcribing and grading...")
        
        # <-- Fixed sampling rate to exactly 16000Hz as expected by Qwen2-Audio
        speech, sr = librosa.load(file_path, sr=16000)

        # We instruct the model to judge the sound waves natively
        conversation = [
            {"role": "system",
             "content": "You are a highly strict CEFR English Examiner. Listen to the audio carefully. Pay close attention to stuttering, pauses, heavy accents, and grammar mistakes."},
            {"role": "user", "content": [
                {"type": "audio", "audio_url": file_path}, # <-- Passed actual file_path instead of "dummy_path"
                {"type": "text", "text": """
                Analyze this audio directly. 
                1. If they hesitate or stutter often, the max grade is B1.
                2. If they have a heavy accent, the max grade is B1.
                3. If they are completely fluent and use complex words, grade B2 or C1.

                Provide a summary of what they said, and return ONLY valid JSON in this exact format:
                {"level": "B2", "score": 75, "summary": "They had a clear accent but paused twice to think.", "transcript": "a rough guess of what they said"}
                """}
            ]},
        ]

        text = processor.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        inputs = processor(text=text, audios=[speech], return_tensors="pt", padding=True)
        inputs = inputs.to(device)

        print("🧠 Qwen is thinking (This will be slow, please wait 2-5 mins)...")
        with torch.no_grad():
            generated_ids = model.generate(**inputs, max_new_tokens=300)

        generated_ids = generated_ids[:, inputs.input_ids.size(1):]
        response = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

        print(f" raw AI Output: {response}")

        # Completely purge model to save laptop
        del model
        del processor
        del inputs
        clean_memory()

        return response
    except Exception as e:
        print(f"❌ Qwen Error: {e}")
        clean_memory()
        return None


# --- WORKER ---
def ai_worker(app_id, file_path):
    print(f"🤖 Processing App #{app_id} natively...")
    try:
        ai_response = run_qwen_audio_analysis(file_path)

        if ai_response:
            match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if match:
                json_str = match.group()
                # <-- Robust JSON Parsing: Strip out any markdown blocks the LLM might hallucinate
                json_str = json_str.replace('```json', '').replace('```', '').strip()
            else:
                print("⚠️ Qwen didn't output JSON cleanly. Recovering...")
                json_str = '{"level": "B1", "score": 60, "summary": "System processed natively but format failed.", "transcript": "Check raw logs"}'

            ai_data = json.loads(json_str)
            final_grade = f"{ai_data['level']} ({ai_data['score']})"
            transcript = ai_data.get('transcript', 'Transcript not provided by Qwen.')

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
            # Check if user already exists
            c.execute("SELECT Email FROM Users WHERE Email=?", (email,))
            if c.fetchone():
                return jsonify({"error": "Email already exists"}), 400

            # Securely hash the password before saving
            hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            # Insert new user with the hashed password
            c.execute("INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)", (full_name, email, hashed_pw))
            conn.commit()
            conn.close()
            return jsonify({"message": "Signup successful"}), 201
            
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            # Notice we added IsAdmin to the SELECT query here:
            c.execute("SELECT FullName, Email, PasswordHash, IsAdmin FROM Users WHERE Email=?", (email,))
            user_row = c.fetchone()
            conn.close()

            if user_row:
                stored_hash = user_row[2]
                if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                    return jsonify({
                        "message": "Login successful", 
                        "user": {
                            "name": user_row[0],
                            "email": user_row[1],
                            # Check if the database value is True/1
                            "isAdmin": bool(user_row[3]) 
                        }
                    }), 200
            
            return jsonify({"error": "Invalid email or password"}), 401
                
        return jsonify({"error": "Database connection failed"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    except:
        return jsonify([])


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
        d = request.form
        c.execute(
            "INSERT INTO JobApplications (JobTitle, Company, FullName, Email, Phone, WhatsApp, EnglishLevel, Experience, Gender, GraduationStatus, MilitaryStatus, NationalID, Nationality, Address, VoiceRecordPath, SubmittedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,GETDATE())",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'), fn))
        conn.commit()
        conn.close()
        return jsonify({"message": "OK"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
    except:
        return jsonify([])


@app.route('/uploads/<fn>')
def file(fn): return send_from_directory(app.config['UPLOAD_FOLDER'], fn)


if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)