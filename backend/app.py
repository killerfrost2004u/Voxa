import os
import re
import threading
import json
import psycopg2 
import time
import datetime
import bcrypt
import random
import boto3 # NEW: AWS/Cloudflare SDK
from botocore.client import Config
from flask import Flask, jsonify, request, send_from_directory, redirect
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import tempfile
import smtplib
from email.message import EmailMessage
# import psutil
# import librosa
# import torch
# from transformers import AutoProcessor, Qwen2AudioForConditionalGeneration

# --- RAM CLEANUP ---
def free_ram_kill_other_llms():
    pass # Moved entirely to local_ai_worker.py

# Execute memory cleanup on boot
free_ram_kill_other_llms()

# --- CONFIGURATION ---
load_dotenv()
# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# 
# if not GEMINI_API_KEY:
#     raise ValueError("No API key found. Please make sure you have a .env file with GEMINI_API_KEY set.")
# 
# genai.configure(api_key=GEMINI_API_KEY)

# NEW: Your Live Neon Cloud Database URL
DATABASE_URL = "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# --- CLOUDFLARE R2 SETUP ---
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "voxa-audio")

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp_downloads') # Changed from uploads to temp_downloads

UPLOAD_FOLDER = tempfile.gettempdir()

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

print("[OK] System Ready. Connected to Neon Cloud Postgres & Cloudflare R2.")

from psycopg2 import pool

class DatabaseManager:
    _instance = None
    _pool = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance._pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
        return cls._instance

    def get_connection(self):
        raw_conn = self._pool.getconn()
        
        class PooledConnection:
            def __init__(self, c):
                self._conn = c
            def cursor(self, *args, **kwargs):
                return self._conn.cursor(*args, **kwargs)
            def commit(self):
                self._conn.commit()
            def rollback(self):
                self._conn.rollback()
            def close(self):
                DatabaseManager()._pool.putconn(self._conn)
            def __getattr__(self, name):
                return getattr(self._conn, name)
                
        return PooledConnection(raw_conn)

db_manager = DatabaseManager()

def get_db_connection():
    for attempt in range(5):
        try:
            return db_manager.get_connection()
        except Exception as e:
            if attempt == 4: raise e
            time.sleep(2)
    return None

def init_db():
    conn = get_db_connection()
    if conn:
        c = conn.cursor()
        try:
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ValidatorScopes" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "JobApplications" ADD COLUMN IF NOT EXISTS "ClientPanel" TEXT DEFAULT \'\'')
            c.execute('''
                CREATE TABLE IF NOT EXISTS "InterviewSlots" (
                    "SlotID" SERIAL PRIMARY KEY,
                    "JobTitle" TEXT,
                    "AgencyName" TEXT,
                    "SlotDate" TEXT,
                    "SlotTime" TEXT,
                    "Capacity" INTEGER,
                    "Booked" INTEGER DEFAULT 0
                )''')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "InterviewType" TEXT DEFAULT \'Onsite Interview\'')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "MinEnglishLevel" TEXT DEFAULT \'B2\'')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "MinSecondLangLevel" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "MaxAge" INTEGER DEFAULT 35')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "NationalityReq" TEXT DEFAULT \'All Nationalities\'')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "GraduationReq" TEXT DEFAULT \'Graduates Only\'')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "MinExperience" TEXT DEFAULT \'0\'')
            
            # --- AUTH MIGRATIONS ---
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsVerified" BOOLEAN DEFAULT TRUE')
            
            # --- SAVED JOBS TABLE ---
            c.execute("""
                CREATE TABLE IF NOT EXISTS "SavedJobs" (
                    "ID" SERIAL PRIMARY KEY,
                    "UserEmail" TEXT,
                    "JobID" INTEGER,
                    "SavedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE("UserEmail", "JobID")
                )
            """)

            # --- SAVED COMPANIES TABLE ---
            c.execute("""
                CREATE TABLE IF NOT EXISTS "SavedCompanies" (
                    "ID" SERIAL PRIMARY KEY,
                    "UserEmail" TEXT,
                    "CompanyID" INTEGER,
                    "SavedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE("UserEmail", "CompanyID")
                )
            """)
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "VerificationCode" TEXT')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "CodeExpiry" TIMESTAMP')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ProfilePic" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "NationalID" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Nationality" TEXT DEFAULT \'Egyptian\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DOB" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Faculty" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Address" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Phone" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "WhatsApp" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Gender" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "GradStatus" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "MilitaryStatus" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EnglishLevel" TEXT DEFAULT \'B2\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Experience" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ExperienceDetails" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "LinkedInUrl" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ResumeUrl" TEXT DEFAULT \'\'')
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DefaultVoiceNote" TEXT DEFAULT \'\'')
            # --- COMPANIES MIGRATION ---
            c.execute('''
                CREATE TABLE IF NOT EXISTS "Companies" (
                    "CompanyID" SERIAL PRIMARY KEY,
                    "Name" TEXT NOT NULL,
                    "LogoUrl" TEXT,
                    "Description" TEXT,
                    "Status" TEXT DEFAULT 'Active'
                )''')
            c.execute('ALTER TABLE "Jobs" ADD COLUMN IF NOT EXISTS "CompanyID" INTEGER')
            
            # --- NOTIFICATIONS & MESSAGES MIGRATION ---
            c.execute('''
                CREATE TABLE IF NOT EXISTS "Notifications" (
                    "NotificationID" SERIAL PRIMARY KEY,
                    "Email" TEXT NOT NULL,
                    "Content" TEXT NOT NULL,
                    "Type" TEXT DEFAULT 'Alert',
                    "IsRead" BOOLEAN DEFAULT FALSE,
                    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
            c.execute('''
                CREATE TABLE IF NOT EXISTS "Messages" (
                    "MessageID" SERIAL PRIMARY KEY,
                    "SenderEmail" TEXT NOT NULL,
                    "ReceiverEmail" TEXT NOT NULL,
                    "Content" TEXT NOT NULL,
                    "IsRead" BOOLEAN DEFAULT FALSE,
                    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
            
            conn.commit()
            print("[OK] Database Migrations Complete (ValidatorScopes synced, Companies created).")
        except Exception as e:
            print(f"[Error] Migration Error: {e}")
        finally:
            conn.close()

init_db()

# --- EMAIL VERIFICATION SENDER ---
def send_verification_email(to_email, code, subject="Voxa Verification Code"):
    SMTP_USER = os.getenv("SMTP_USER", "voxaa.business@gmail.com")
    SMTP_PASS = os.getenv("SMTP_PASS")
    if not SMTP_PASS:
        print("❌ SMTP_PASS is missing. Cannot send email.")
        return False
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg.set_content(f"Your verification code is: {code}\n\nThis code will expire in 10 minutes. Please do not share it with anyone.")
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"[Error] Email Error: {e}")
        return False

# --- CRON JOB: CLEANUP EXPIRED CODES ---
def cleanup_expired_codes():
    while True:
        try:
            conn = get_db_connection()
            if conn:
                c = conn.cursor()
                # Strips out expired 6-digit codes to keep database size low
                c.execute('UPDATE "Users" SET "VerificationCode" = NULL, "CodeExpiry" = NULL WHERE "CodeExpiry" < CURRENT_TIMESTAMP')
                conn.commit()
                conn.close()
        except Exception as e:
            print(f"[Error] Cleanup Error: {e}")
        
        time.sleep(3600) # Run safely in background every 60 minutes

threading.Thread(target=cleanup_expired_codes, daemon=True).start()

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ai_evaluator import AIAnalyzerFactory

# --- WORKER ---
def ai_worker(app_id, file_name):
    # 1. Download from Cloudflare to a temporary local folder
    print(f"☁️ Downloading {file_name} from Cloudflare R2 for AI analysis...")
    local_path = os.path.join(app.config['UPLOAD_FOLDER'], file_name)
    try:
        s3_client.download_file(R2_BUCKET_NAME, file_name, local_path)
    except Exception as e:
        print(f"[Error] Failed to download from R2: {e}")
        return

    analyzer_type = os.getenv("AI_ENGINE", "gemini")
    print(f"🤖 Processing App #{app_id} via {analyzer_type.upper()} Analyzer Strategy...")
    try:
        analyzer = AIAnalyzerFactory.get_analyzer(analyzer_type)
        ai_data = analyzer.analyze(local_path)

        if ai_data:
            overall_grade = f"{ai_data.get('overall_level', 'B1')} ({ai_data.get('overall_score', 60)})"
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
                    (transcript, overall_grade, ai_data.get('summary', ''), 
                     grammar_grade, fluency_grade, pronunciation_grade, accent_profile, app_id)
                )
                conn.commit()
                conn.close()
        else:
            print(f"[Error] AI returned nothing for App #{app_id}. Database was NOT updated.")
    except Exception as e:
        print(f"[Error] Worker Error: {e}")
    finally:
        # 2. Delete the temporary local file to save server space!
        if os.path.exists(local_path):
            os.remove(local_path)
            print(f"🧹 Cleaned up temporary file: {file_name}")

    

# --- ROUTES ---
@app.route('/api/admin/send-offer/<int:id>', methods=['POST'])
def send_offer(id):
    return jsonify({"message": "WhatsApp simulated for now."}), 200

@app.route('/api/jobs', methods=['GET'])
def get_public_jobs():
    try:
        email = request.args.get('email')
        conn = get_db_connection()
        c = conn.cursor()
        if email:
            c.execute("""
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       (CASE WHEN sj."ID" IS NOT NULL THEN TRUE ELSE FALSE END) as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                LEFT JOIN "SavedJobs" sj ON j."JobID" = sj."JobID" AND sj."UserEmail" = %s
                WHERE j."Status" = 'Active' 
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            """, (email,))
        else:
            c.execute("""
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       FALSE as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                WHERE j."Status" = 'Active' 
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            """)
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()

        formatted_jobs = []
        for j in raw_jobs:
            formatted_jobs.append({
                "id": j.get("JobID"),
                "title": j.get("JobTitle", "Unknown Title"),
                "company": j.get("LinkedCompanyName") or j.get("CompanyName") or "Voxa",
                "location": j.get("Location") or "Remote",
                "salary": j.get("SalaryPackage") or "Competitive",
                "accountType": j.get("AccountType") or "N/A",
                "workingHours": j.get("WorkingHours") or "N/A",
                "interviewType": j.get("InterviewType") or "Onsite Interview",
                "minEnglishLevel": j.get("MinEnglishLevel") or "B2",
                "minSecondLangLevel": j.get("MinSecondLangLevel") or "",
                "maxAge": j.get("MaxAge") or 35,
                "nationalityReq": j.get("NationalityReq") or "All Nationalities",
                "graduationReq": j.get("GraduationReq") or "Graduates Only",
                "minExperience": j.get("MinExperience") or "0",
                "training": j.get("Training") or "Not specified.",
                "requirements": f"Account: {j.get('AccountType', 'N/A')} | Hours: {j.get('WorkingHours', 'N/A')} | Target: {j.get('TargetAudience', 'N/A')}",
                "description": j.get("OfferDetails", ""),
                "logo": j.get("LinkedCompanyName") or j.get("CompanyName") or "VO",
                "logoUrl": j.get("CompanyLogo"),
                "companyId": j.get("CompanyID"),
                "bilingual": bool(j.get("RequiresSecondLanguage", False)),
                "isSaved": bool(j.get("isSaved", False))
            })
        return jsonify(formatted_jobs)
    except Exception as e: 
        return jsonify([])

@app.route('/api/companies', methods=['GET'])
def get_public_companies():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT c."CompanyID" as id, c."Name" as name, c."LogoUrl" as "logoUrl",
                   (SELECT COUNT(*) FROM "Jobs" j WHERE j."CompanyID" = c."CompanyID" AND j."Status" = 'Active') as "openJobs"
            FROM "Companies" c
            WHERE c."Status" = 'Active'
            ORDER BY "openJobs" DESC
        """)
        cols = [column[0] for column in c.description]
        companies = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        # Format for frontend which expects 'logo' string if no logoUrl, we can just use logoUrl
        for comp in companies:
            if not comp.get('logoUrl'):
                comp['logo'] = comp.get('name', 'VO')[:2].upper()
            else:
                comp['logo'] = comp['logoUrl']
        return jsonify(companies)
    except Exception as e:
        return jsonify([])

@app.route('/api/companies/<int:id>', methods=['GET'])
def get_public_company(id):
    print("HITTING get_public_company FOR ID:", id, flush=True)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT "CompanyID" as id, "Name" as name, "LogoUrl" as "logoUrl", "Description" as description
            FROM "Companies"
            WHERE "CompanyID" = %s AND "Status" = 'Active'
        """, (id,))
        comp_row = c.fetchone()
        if not comp_row:
            conn.close()
            return jsonify({"error": "Company not found"}), 404
            
        cols = [column[0] for column in c.description]
        company = dict(zip(cols, comp_row))

        email = request.args.get('email')
        if email:
            c.execute('SELECT "ID" FROM "SavedCompanies" WHERE "UserEmail" = %s AND "CompanyID" = %s', (email, id))
            company['isSaved'] = bool(c.fetchone())
        else:
            company['isSaved'] = False
        
        if not company.get('logoUrl'):
            company['logo'] = company.get('name', 'VO')[:2].upper()
        else:
            company['logo'] = company['logoUrl']
            
        c.execute("""
            SELECT "JobID" as id, "JobTitle" as title, "Location" as location, "SalaryPackage" as salary, "AccountType" as "accountType", "RequiresSecondLanguage" as bilingual
            FROM "Jobs"
            WHERE "CompanyID" = %s AND "Status" = 'Active'
        """, (id,))
        jcols = [column[0] for column in c.description]
        company['jobs'] = [dict(zip(jcols, row)) for row in c.fetchall()]
        
        conn.close()
        return jsonify(company)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/salaries', methods=['GET'])
def get_public_salaries():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT "JobTitle" as title, COUNT(*) as samples, MAX("SalaryPackage") as max_salary
            FROM "Jobs"
            WHERE "Status" = 'Active'
            GROUP BY "JobTitle"
            ORDER BY samples DESC
        """)
        cols = [column[0] for column in c.description]
        raw_salaries = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        formatted_salaries = []
        for index, row in enumerate(raw_salaries):
            salary_str = row.get("max_salary", "") or ""
            nums = re.findall(r'\d+', str(salary_str).replace(',', ''))
            avg = int(nums[0]) if nums else 25000
            if "k" in str(salary_str).lower() and avg < 1000:
                avg *= 1000
            
            formatted_salaries.append({
                "id": index + 1,
                "title": row.get("title", "Unknown Role"),
                "avg": avg,
                "samples": row.get("samples", 1)
            })
        return jsonify(formatted_salaries)
    except Exception as e:
        return jsonify([])

@app.route('/api/jobs/<int:id>', methods=['GET'])
def get_public_job(id):
    try:
        email = request.args.get('email')
        conn = get_db_connection()
        c = conn.cursor()
        if email:
            c.execute("""
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       (CASE WHEN sj."ID" IS NOT NULL THEN TRUE ELSE FALSE END) as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                LEFT JOIN "SavedJobs" sj ON j."JobID" = sj."JobID" AND sj."UserEmail" = %s
                WHERE j."JobID" = %s AND j."Status" = 'Active'
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            """, (email, id))
        else:
            c.execute("""
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       FALSE as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                WHERE j."JobID" = %s AND j."Status" = 'Active'
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            """, (id,))
        cols = [column[0] for column in c.description]
        row = c.fetchone()
        conn.close()
        if row:
            j = dict(zip(cols, row))
            return jsonify({
                "id": j.get("JobID"),
                "title": j.get("JobTitle", "Unknown Title"),
                "company": j.get("LinkedCompanyName") or j.get("CompanyName") or "Voxa",
                "location": j.get("Location") or "Remote",
                "salary": j.get("SalaryPackage") or "Competitive",
                "accountType": j.get("AccountType") or "N/A",
                "workingHours": j.get("WorkingHours") or "N/A",
                "interviewType": j.get("InterviewType") or "Onsite Interview",
                "minEnglishLevel": j.get("MinEnglishLevel") or "B2",
                "minSecondLangLevel": j.get("MinSecondLangLevel") or "",
                "maxAge": j.get("MaxAge") or 35,
                "nationalityReq": j.get("NationalityReq") or "All Nationalities",
                "graduationReq": j.get("GraduationReq") or "Graduates Only",
                "minExperience": j.get("MinExperience") or "0",
                "training": j.get("Training") or "Not specified.",
                "requirements": f"Account: {j.get('AccountType', 'N/A')} | Hours: {j.get('WorkingHours', 'N/A')} | Target: {j.get('TargetAudience', 'N/A')}",
                "description": j.get("OfferDetails", ""),
                "logo": j.get("CompanyLogo") or j.get("CompanyName", "VO")[:2].upper(),
                "bilingual": bool(j.get("RequiresSecondLanguage", False)),
                "languageRequirement": j.get("LanguageRequirement") or "English Only",
                "targetLanguage": j.get("TargetLanguage") or "",
                "type": j.get("type") or "Full Time",
                "companyId": j.get("CompanyID"),
                "isSaved": bool(j.get("isSaved", False))
            })
        return jsonify({"error": "Job not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/jobs', methods=['GET', 'POST'])
def handle_admin_jobs():
    conn = get_db_connection()
    c = conn.cursor()
    if request.method == 'GET':
        if request.args.get('companyId'):
            c.execute("""SELECT * FROM "Jobs" WHERE "CompanyID" = %s ORDER BY "JobID" DESC""", (request.args.get('companyId'),))
        else:
            c.execute("""SELECT * FROM "Jobs" ORDER BY "JobID" DESC""")
        cols = [column[0] for column in c.description]
        jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(jobs)
        
    if request.method == 'POST':
        d = request.get_json()
        c.execute(
            """INSERT INTO "Jobs" ("CompanyID", "CompanyName", "JobTitle", "AccountType", "WorkingHours", "SalaryPackage", "Location", "Training", "OfferDetails", "Status", "RequiresSecondLanguage", "InterviewType", "MinEnglishLevel", "MinSecondLangLevel", "MaxAge", "NationalityReq", "GraduationReq", "MinExperience", "type", "LanguageRequirement", "TargetLanguage") 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (d.get('companyId'), d.get('companyName'), d.get('jobTitle'), d.get('accountType'), d.get('workingHours'), 
             d.get('salaryPackage'), d.get('location'), 
             d.get('training'), d.get('offerDetails'), d.get('status', 'Active'), int(d.get('requiresSecondLanguage', 0)),
             d.get('interviewType', 'Onsite Interview'), d.get('minEnglishLevel', 'B2'), d.get('minSecondLangLevel', ''), d.get('maxAge', 35), d.get('nationalityReq', 'All Nationalities'), d.get('graduationReq', 'Graduates Only'), d.get('minExperience', '0'), d.get('type', 'Full Time'), d.get('languageRequirement', 'English Only'), d.get('targetLanguage', ''))
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
                   SET "CompanyID"=%s, "CompanyName"=%s, "JobTitle"=%s, "AccountType"=%s, "WorkingHours"=%s, 
                       "SalaryPackage"=%s, "Location"=%s, "Training"=%s, "OfferDetails"=%s, "RequiresSecondLanguage"=%s,
                       "InterviewType"=%s, "MinEnglishLevel"=%s, "MinSecondLangLevel"=%s, "MaxAge"=%s, "NationalityReq"=%s, "GraduationReq"=%s, "MinExperience"=%s, "type"=%s, "LanguageRequirement"=%s, "TargetLanguage"=%s
                   WHERE "JobID"=%s""",
                (data.get('companyId'), data.get('companyName'), data.get('jobTitle'), data.get('accountType'), 
                 data.get('workingHours'), data.get('salaryPackage'), 
                 data.get('location'), data.get('training'), 
                 data.get('offerDetails'), int(data.get('requiresSecondLanguage', 0)),
                 data.get('interviewType'), data.get('minEnglishLevel'), data.get('minSecondLangLevel'), data.get('maxAge'), data.get('nationalityReq'), data.get('graduationReq'), data.get('minExperience'), data.get('type', 'Full Time'), data.get('languageRequirement', 'English Only'), data.get('targetLanguage', ''), id)
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

@app.route('/api/admin/companies', methods=['GET', 'POST'])
def handle_admin_companies():
    conn = get_db_connection()
    c = conn.cursor()
    
    if request.method == 'GET':
        c.execute("""SELECT * FROM "Companies" ORDER BY "CompanyID" DESC""")
        cols = [column[0] for column in c.description]
        companies = [dict(zip(cols, row)) for row in c.fetchall()]
        
        c.execute("""SELECT "CompanyID", COUNT(*) FROM "Jobs" WHERE "Status" = 'Active' GROUP BY "CompanyID" """)
        jobs_counts = {row[0]: row[1] for row in c.fetchall()}
        
        for comp in companies:
            comp['activeJobs'] = jobs_counts.get(comp['CompanyID'], 0)
            
        conn.close()
        return jsonify(companies)
        
    if request.method == 'POST':
        d = request.get_json()
        c.execute(
            """INSERT INTO "Companies" ("Name", "LogoUrl", "Description", "Status") VALUES (%s, %s, %s, %s) RETURNING "CompanyID" """,
            (d.get('name'), d.get('logoUrl'), d.get('description'), d.get('status', 'Active'))
        )
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return jsonify({"message": "Company added", "id": new_id}), 201

@app.route('/api/admin/companies/<int:id>', methods=['PUT', 'DELETE'])
def update_delete_company(id):
    conn = get_db_connection()
    c = conn.cursor()
    if request.method == 'PUT':
        data = request.get_json()
        c.execute(
            """UPDATE "Companies" SET "Name"=%s, "LogoUrl"=%s, "Description"=%s, "Status"=%s WHERE "CompanyID"=%s""",
            (data.get('name'), data.get('logoUrl'), data.get('description'), data.get('status'), id)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Company updated"})
        
    if request.method == 'DELETE':
        c.execute("""DELETE FROM "Companies" WHERE "CompanyID"=%s""", (id,))
        c.execute("""DELETE FROM "Jobs" WHERE "CompanyID"=%s""", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Company deleted"})

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
    
    # 1. Who is trying to create this user? (From their login session)
    creator_role = data.get('creator_role')     
    creator_agency = data.get('creator_agency') 
    creator_unit = data.get('creator_unit')     
    creator_team = data.get('creator_team')
    
    # 2. Who are they trying to create?
    name = data.get('fullName')
    email = data.get('email')
    password = data.get('password')
    target_role = data.get('target_role') 
    target_agency = data.get('target_agency') 
    target_unit = data.get('target_unit') 
    target_team = data.get('target_team') 
    
    if not all([name, email, password, target_role, target_agency]):
        return jsonify({"error": "Missing required fields!"}), 400

    # ==========================================
    # 🛡️ THE STRICT PERMISSION FIREWALL 🛡️
    # ==========================================
    
    if 'SuperAdmin' in creator_role or 'Admin' in creator_role:
        # You are God. You can do anything.
        pass 
        
    elif 'CEO' in creator_role or 'TopManagement' in creator_role:
        if target_agency != creator_agency:
            return jsonify({"error": "You can only manage staff within your own agency."}), 403
        if target_role in ['SuperAdmin', 'Admin', 'CEO']:
            return jsonify({"error": "You cannot create Admins or CEOs."}), 403
        if 'CEO' not in creator_role and target_role == 'TopManagement':
            return jsonify({"error": "Only CEOs can create other Top Management."}), 403
            
    elif 'UnitManager' in creator_role:
        if target_agency != creator_agency or target_unit != creator_unit:
            return jsonify({"error": "Unit Managers can only manage staff in their exact Unit."}), 403
        if target_role not in ['Leader', 'Recruiter']:
            return jsonify({"error": "Unit Managers can only create Leaders and Recruiters."}), 403
            
    elif 'Leader' in creator_role:
        if target_agency != creator_agency or target_unit != creator_unit or target_team != creator_team:
            return jsonify({"error": "Leaders can only manage staff in their exact Team."}), 403
        if target_role != 'Recruiter':
            return jsonify({"error": "Leaders can only create Recruiters."}), 403
            
    else:
        return jsonify({"error": "You do not have permission to manage staff."}), 403

    # ==========================================
    
    # Securely hash the temporary password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if email already exists
        cur.execute('SELECT "UserID" FROM "Users" WHERE "Email" = %s', (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already exists!"}), 400
            
        # Insert the new staff member into the matrix hierarchy
        cur.execute("""
            INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "AgencyName", "UnitName", "TeamName")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (name, email, hashed_password, target_role, target_agency, target_unit, target_team))
        
        conn.commit()
        return jsonify({"message": f"{target_role} {name} successfully created in {target_agency}!"}), 201
    except Exception as e:
        print(f"[Error] Database Error: {e}")
        return jsonify({"error": "Failed to create staff member."}), 500
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.route('/api/staff-signup', methods=['POST'])
def staff_signup():
    data = request.get_json()
    
    name = data.get('fullName')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    agency = data.get('agency')
    unit = data.get('unit')
    team = data.get('team')
    
    if not all([name, email, password, role, agency]):
        return jsonify({"error": "Missing required fields!"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if email already exists
        cur.execute('SELECT "UserID" FROM "Users" WHERE "Email" = %s', (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already exists!"}), 400
            
        # Insert the user. Notice we explicitly set Status to 'Pending'!
        cur.execute("""
            INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "AgencyName", "UnitName", "TeamName", "Status")
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')
        """, (name, email, hashed_password, role, agency, unit, team))
        
        conn.commit()
        return jsonify({"message": "Registration successful! Your account is pending approval from your manager."}), 201
    except Exception as e:
        print(f"[Error] Staff Signup Error: {e}")
        return jsonify({"error": "Failed to register account."}), 500
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

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
            
            # Generate 6-digit code with a 10-minute timer
            code = str(random.randint(100000, 999999))
            expiry = datetime.datetime.now() + datetime.timedelta(minutes=10)
            
            c.execute("""INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "TeamName", "IsVerified", "VerificationCode", "CodeExpiry") VALUES (%s, %s, %s, 'Candidate', 'None', FALSE, %s, %s)""", 
                      (data.get('fullName'), data.get('email'), hashed_pw, code, expiry))
            conn.commit()
            conn.close()
            
            # Send email securely in the background
            threading.Thread(target=send_verification_email, args=(data.get('email'), code, "Welcome to Voxa! Verify your email")).start()
            
            return jsonify({"message": "Signup successful! Please check your email for the verification code."}), 201
        return jsonify({"error": "Database connection failed"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT "VerificationCode", "CodeExpiry" FROM "Users" WHERE "Email"=%s', (email,))
    user = c.fetchone()
    
    if not user: 
        return jsonify({"error": "User not found"}), 404
    if user[0] != code: 
        return jsonify({"error": "Invalid verification code"}), 400
    if user[1] and datetime.datetime.now() > user[1]: 
        return jsonify({"error": "Verification code has expired. Please request a new one."}), 400

    c.execute('UPDATE "Users" SET "IsVerified"=TRUE, "VerificationCode"=NULL, "CodeExpiry"=NULL WHERE "Email"=%s', (email,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Account successfully verified!"}), 200

@app.route('/api/verify-code-only', methods=['POST'])
def verify_code_only():
    email = request.json.get('email')
    code = request.json.get('code')
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT "VerificationCode", "CodeExpiry" FROM "Users" WHERE "Email"=%s', (email,))
    user = c.fetchone()
    conn.close()
    
    if not user or user[0] != code: 
        return jsonify({"error": "Invalid verification code"}), 400
    if user[1] and datetime.datetime.now() > user[1]: 
        return jsonify({"error": "Verification code has expired."}), 400
    return jsonify({"message": "Code verified successfully!"}), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT "UserID" FROM "Users" WHERE "Email"=%s', (email,))
    if c.fetchone():
        code = str(random.randint(100000, 999999))
        expiry = datetime.datetime.now() + datetime.timedelta(minutes=10)
        c.execute('UPDATE "Users" SET "VerificationCode"=%s, "CodeExpiry"=%s WHERE "Email"=%s', (code, expiry, email))
        conn.commit()
        threading.Thread(target=send_verification_email, args=(email, code, "Voxa Password Reset Code")).start()
    conn.close()
    # Always return success to prevent email enumeration hacking
    return jsonify({"message": "If the email exists in our system, a recovery code has been sent."}), 200

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    email = request.json.get('email')
    code = request.json.get('code')
    new_password = request.json.get('password')
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT "VerificationCode", "CodeExpiry" FROM "Users" WHERE "Email"=%s', (email,))
    user = c.fetchone()
    
    if not user or user[0] != code: 
        return jsonify({"error": "Invalid recovery code"}), 400
    if user[1] and datetime.datetime.now() > user[1]: 
        return jsonify({"error": "Recovery code has expired"}), 400

    hashed_pw = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    c.execute('UPDATE "Users" SET "PasswordHash"=%s, "VerificationCode"=NULL, "CodeExpiry"=NULL WHERE "Email"=%s', (hashed_pw, email))
    conn.commit()
    conn.close()
    return jsonify({"message": "Password reset successfully! You can now log in."}), 200

@app.route('/api/candidate/stats', methods=['GET'])
def get_candidate_stats():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('SELECT COUNT(*) FROM "JobApplications" WHERE "Email"=%s', (email,))
        total_apps = c.fetchone()[0]
        
        c.execute('SELECT COUNT(*) FROM "JobApplications" WHERE "Email"=%s AND "Status" = \'Accepted\'', (email,))
        interviews_scheduled = c.fetchone()[0]
        
        # We don't have profile views, so we'll mock it for now or return 0
        profile_views = 0
        
        conn.close()
        return jsonify({
            "applicationsSent": total_apps,
            "interviewsScheduled": interviews_scheduled,
            "profileViews": profile_views
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/candidate/saved-jobs/toggle', methods=['POST'])
def toggle_saved_job():
    data = request.json
    email = data.get('email')
    job_id = data.get('jobId')
    if not email or not job_id:
        return jsonify({"error": "Missing email or jobId"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT "ID" FROM "SavedJobs" WHERE "UserEmail" = %s AND "JobID" = %s', (email, job_id))
        row = c.fetchone()
        if row:
            c.execute('DELETE FROM "SavedJobs" WHERE "ID" = %s', (row[0],))
            saved = False
        else:
            c.execute('INSERT INTO "SavedJobs" ("UserEmail", "JobID") VALUES (%s, %s)', (email, job_id))
            saved = True
        conn.commit()
        conn.close()
        return jsonify({"saved": saved}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/saved-companies/toggle', methods=['POST'])
def toggle_saved_company():
    data = request.json
    email = data.get('email')
    company_id = data.get('companyId')
    if not email or not company_id:
        return jsonify({"error": "Missing email or companyId"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT "ID" FROM "SavedCompanies" WHERE "UserEmail" = %s AND "CompanyID" = %s', (email, company_id))
        row = c.fetchone()
        if row:
            c.execute('DELETE FROM "SavedCompanies" WHERE "ID" = %s', (row[0],))
            saved = False
        else:
            c.execute('INSERT INTO "SavedCompanies" ("UserEmail", "CompanyID") VALUES (%s, %s)', (email, company_id))
            saved = True
        conn.commit()
        conn.close()
        return jsonify({"saved": saved}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/saved-companies', methods=['GET'])
def get_saved_companies():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Missing email"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT c."CompanyID" as id, c."Name" as name, c."LogoUrl" as "logoUrl", c."Description" as description,
                   TRUE as "isSaved"
            FROM "SavedCompanies" sc
            JOIN "Companies" c ON sc."CompanyID" = c."CompanyID"
            WHERE sc."UserEmail" = %s AND c."Status" = 'Active'
            ORDER BY sc."SavedAt" DESC
        """, (email,))
        cols = [column[0] for column in c.description]
        companies = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/saved-jobs', methods=['GET'])
def get_saved_jobs():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Missing email"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                   TRUE as "isSaved"
            FROM "SavedJobs" sj
            JOIN "Jobs" j ON sj."JobID" = j."JobID"
            LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
            WHERE sj."UserEmail" = %s AND j."Status" = 'Active'
            AND (c."Status" IS NULL OR c."Status" = 'Active')
            ORDER BY sj."SavedAt" DESC
        """, (email,))
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        formatted_jobs = []
        for j in raw_jobs:
            formatted_jobs.append({
                "id": j.get("JobID"),
                "title": j.get("JobTitle", "Unknown Title"),
                "company": j.get("CompanyName", "Voxa"),
                "location": j.get("Location") or "Remote",
                "salary": j.get("SalaryPackage") or "Competitive",
                "accountType": j.get("AccountType") or "N/A",
                "workingHours": j.get("WorkingHours") or "N/A",
                "interviewType": j.get("InterviewType") or "Onsite Interview",
                "minEnglishLevel": j.get("MinEnglishLevel") or "B2",
                "minSecondLangLevel": j.get("MinSecondLangLevel") or "",
                "maxAge": j.get("MaxAge") or 35,
                "nationalityReq": j.get("NationalityReq") or "All Nationalities",
                "graduationReq": j.get("GraduationReq") or "Graduates Only",
                "minExperience": j.get("MinExperience") or "0",
                "training": j.get("Training") or "Not specified.",
                "requirements": f"Account: {j.get('AccountType', 'N/A')} | Hours: {j.get('WorkingHours', 'N/A')} | Target: {j.get('TargetAudience', 'N/A')}",
                "description": j.get("OfferDetails", ""),
                "logo": j.get("LinkedCompanyName") or j.get("CompanyName") or "VO",
                "logoUrl": j.get("CompanyLogo"),
                "companyId": j.get("CompanyID"),
                "isSaved": True
            })
        return jsonify(formatted_jobs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/applications', methods=['GET'])
def get_candidate_applications():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''
            SELECT "ApplicationID" as id, "JobTitle" as role, "Company" as company, 
                   "Status" as status, "SubmittedAt" as date, "AI_Rating", "ValidatorFeedback"
            FROM "JobApplications" 
            WHERE "Email"=%s
            ORDER BY "SubmittedAt" DESC
        ''', (email,))
        cols = [column[0] for column in c.description]
        apps = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        # Normalize status
        for app in apps:
            if not app['status']:
                app['status'] = 'Under Review'
            elif app['status'] == 'Analyzed':
                app['status'] = 'Reviewed'
        
        return jsonify(apps), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- NOTIFICATIONS API ---
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    email = request.args.get('email')
    if not email: return jsonify({"error": "Email required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT "NotificationID" as id, "Content" as content, "Type" as type, "IsRead" as is_read, "CreatedAt" as date FROM "Notifications" WHERE "Email"=%s ORDER BY "CreatedAt" DESC LIMIT 50', (email,))
        cols = [column[0] for column in c.description]
        notifs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        return jsonify(notifs), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/notifications/read', methods=['PUT'])
def mark_notifications_read():
    email = request.json.get('email')
    if not email: return jsonify({"error": "Email required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('UPDATE "Notifications" SET "IsRead" = TRUE WHERE "Email" = %s', (email,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Notifications marked as read"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

# --- MESSAGES API ---
@app.route('/api/messages', methods=['GET', 'POST'])
def handle_messages():
    if request.method == 'GET':
        email = request.args.get('email')
        if not email: return jsonify({"error": "Email required"}), 400
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute('''
                SELECT "MessageID" as id, "SenderEmail" as sender, "ReceiverEmail" as receiver, 
                       "Content" as content, "IsRead" as is_read, "CreatedAt" as date 
                FROM "Messages" 
                WHERE "SenderEmail" = %s OR "ReceiverEmail" = %s 
                ORDER BY "CreatedAt" ASC
            ''', (email, email))
            cols = [column[0] for column in c.description]
            msgs = [dict(zip(cols, row)) for row in c.fetchall()]
            
            # Mark messages sent TO this user as read
            c.execute('UPDATE "Messages" SET "IsRead" = TRUE WHERE "ReceiverEmail" = %s AND "IsRead" = FALSE', (email,))
            conn.commit()
            conn.close()
            return jsonify(msgs), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
        
    elif request.method == 'POST':
        data = request.get_json()
        sender = data.get('sender')
        receiver = data.get('receiver', 'admin@voxa.com') # Default fallback receiver
        content = data.get('content')
        if not all([sender, receiver, content]): return jsonify({"error": "Missing fields"}), 400
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute('INSERT INTO "Messages" ("SenderEmail", "ReceiverEmail", "Content") VALUES (%s, %s, %s)', (sender, receiver, content))
            conn.commit()
            conn.close()
            return jsonify({"message": "Message sent successfully"}), 201
        except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/oauth-login', methods=['POST'])
def oauth_login():
    data = request.get_json()
    email = data.get('email')
    name = data.get('fullName')
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""SELECT "FullName", "Email", "PasswordHash", "Role", "AgencyName", "UnitName", "TeamName", "ValidatorScopes", "IsVerified" FROM "Users" WHERE "Email"=%s""", (email,))
    user_row = c.fetchone()
    
    if user_row:
        role = user_row[3] if len(user_row) > 3 else 'Candidate'
        if not user_row[8]: # Verify them instantly if they used OAuth
            c.execute('UPDATE "Users" SET "IsVerified"=TRUE WHERE "Email"=%s', (email,))
            conn.commit()
        
        conn.close()
        return jsonify({
            "message": "Login successful", 
            "user": {
                "fullName": user_row[0], 
                "email": user_row[1], 
                "role": role, 
                "agencyName": user_row[4],
                "unitName": user_row[5],
                "teamName": user_row[6],
                "validatorScopes": user_row[7] if len(user_row) > 7 else "",
                "isAdmin": role in ['Admin', 'SuperAdmin']
            }
        }), 200
    else:
        # New user signing up via OAuth
        random_pw = str(random.randint(10000000, 99999999))
        hashed_pw = bcrypt.hashpw(random_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        c.execute("""INSERT INTO "Users" ("FullName", "Email", "PasswordHash", "Role", "TeamName", "IsVerified") VALUES (%s, %s, %s, 'Candidate', 'None', TRUE)""", 
                  (name, email, hashed_pw))
        conn.commit()
        conn.close()
        return jsonify({
            "message": "Signup successful", 
            "user": {
                "fullName": name, 
                "email": email, 
                "role": 'Candidate',
                "agencyName": "Voxa",
                "unitName": "Direct",
                "teamName": "Direct",
                "validatorScopes": "",
                "isAdmin": False
            }
        }), 201

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({"error": "Missing email or password"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        c = conn.cursor()
        c.execute("""SELECT "FullName", "Email", "PasswordHash", "Role", "AgencyName", "UnitName", "TeamName", "ValidatorScopes", "ProfilePic" FROM "Users" WHERE "Email"=%s""", (data.get('email'),))
        user_row = c.fetchone()
        conn.close()

        if not user_row:
            return jsonify({"error": "Invalid email or password"}), 401

        if not bcrypt.checkpw(data.get('password').encode('utf-8'), user_row[2].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401

        role = user_row[3] if len(user_row) > 3 else 'Candidate'
        
        return jsonify({
            "message": "Login successful", 
            "user": {
                "fullName": user_row[0], 
                "email": user_row[1], 
                "role": role, 
                "agencyName": user_row[4],
                "unitName": user_row[5],
                "teamName": user_row[6],
                "validatorScopes": user_row[7] if len(user_row) > 7 else "",
                "profilePic": user_row[8] if len(user_row) > 8 else '',
                "isAdmin": role in ['Admin', 'SuperAdmin', 'CEO', 'UnitManager', 'Leader', 'Recruiter', 'HR', 'AccountManager']
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/profile/upload', methods=['POST'])
def upload_profile_pic():
    if 'file' not in request.files or 'email' not in request.form:
        return jsonify({'error': 'Missing file or email'}), 400
        
    f = request.files['file']
    email = request.form['email']
    if f.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        fn = f"profile_pics/{int(time.time())}_{f.filename}"
        s3_client.upload_fileobj(f, R2_BUCKET_NAME, fn, ExtraArgs={'ContentType': f.content_type})
        file_url = f"{R2_PUBLIC_URL}/{fn}"
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
            
        c = conn.cursor()
        c.execute('UPDATE "Users" SET "ProfilePic"=%s WHERE "Email"=%s', (file_url, email))
        conn.commit()
        conn.close()
            
        return jsonify({'message': 'Profile picture updated successfully', 'url': file_url}), 200
    except Exception as e:
        if conn: conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/upload-resume', methods=['POST'])
def upload_resume_file():
    if 'file' not in request.files or 'email' not in request.form:
        return jsonify({'error': 'Missing file or email'}), 400
        
    f = request.files['file']
    email = request.form['email']
    if f.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        fn = f"resumes/{int(time.time())}_{f.filename}"
        s3_client.upload_fileobj(f, R2_BUCKET_NAME, fn, ExtraArgs={'ContentType': f.content_type})
        file_url = f"{R2_PUBLIC_URL}/{fn}"
        
        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute('UPDATE "Users" SET "ResumeUrl"=%s WHERE "Email"=%s', (file_url, email))
            conn.commit()
            conn.close()
            
        return jsonify({'message': 'Resume uploaded successfully', 'url': file_url}), 200
    except Exception as e:
        print(f"Resume Upload Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/upload-vn', methods=['POST'])
def upload_default_vn():
    email = request.form.get('email')
    if 'voiceRecord' not in request.files or not email:
        return jsonify({'error': 'File and email are required'}), 400
        
    f = request.files['voiceRecord']
    try:
        fn = f"VOICE_DEFAULT_{int(time.time())}.ogg"
        s3_client.upload_fileobj(f, R2_BUCKET_NAME, fn, ExtraArgs={'ContentType': 'audio/ogg'})
        
        conn = get_db_connection()
        if conn:
            c = conn.cursor()
            c.execute('UPDATE "Users" SET "DefaultVoiceNote"=%s WHERE "Email"=%s', (fn, email))
            conn.commit()
            conn.close()
            
        return jsonify({'message': 'Default Voice Note saved successfully!', 'fn': fn}), 200
    except Exception as e:
        print(f"Default VN Upload Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['GET'])
def get_profile():
    email = request.args.get('email')
    if not email: return jsonify({"error": "Email required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT * FROM "Users" WHERE "Email" = %s', (email,))
        cols = [column[0] for column in c.description]
        row = c.fetchone()
        conn.close()
        if not row: return jsonify({"error": "Not found"}), 404
        return jsonify(dict(zip(cols, row))), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/profile/update', methods=['PUT'])
def update_profile():
    data = request.get_json()
    email = data.get('email')
    if not email: return jsonify({"error": "Email required"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            UPDATE "Users" SET
                "FullName"=%s,
                "NationalID"=%s, "Nationality"=%s, "DOB"=%s, "Faculty"=%s, "Address"=%s,
                "Phone"=%s, "WhatsApp"=%s, "Gender"=%s, "GradStatus"=%s, "MilitaryStatus"=%s,
                "EnglishLevel"=%s, "Experience"=%s, "ExperienceDetails"=%s,
                "LinkedInUrl"=%s
            WHERE "Email"=%s
        """, (
            data.get('fullName', ''),
            data.get('nationalId', ''), data.get('nationality', 'Egyptian'), data.get('dob', ''), data.get('faculty', ''), data.get('address', ''),
            data.get('phone', ''), data.get('whatsapp', ''), data.get('gender', ''), data.get('gradStatus', ''), data.get('militaryStatus', ''),
            data.get('english', 'B2'), data.get('experience', ''), data.get('experienceDetails', ''),
            data.get('linkedInUrl', ''), email
        ))
        conn.commit()
        conn.close()
        return jsonify({"message": "Profile updated successfully!"}), 200
    except Exception as e:
        print(f"Profile Update Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/apply', methods=['POST'])
def apply():
    try:
        f = request.files['voiceRecord']
        fn = f"VOICE_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.ogg"

        # Stream audio directly into Cloudflare Bucket
        s3_client.upload_fileobj(f, R2_BUCKET_NAME, fn, ExtraArgs={'ContentType': 'audio/ogg'})

        fn2 = None
        if 'voiceRecord2' in request.files:
            f2 = request.files['voiceRecord2']
            fn2 = f"VOICE2_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.ogg"
            s3_client.upload_fileobj(f2, R2_BUCKET_NAME, fn2, ExtraArgs={'ContentType': 'audio/ogg'})

        conn = get_db_connection()
        c = conn.cursor()
        d = request.form
        
        # 🚀 Capture the Referral Matrix Data
        recruiter = d.get('recruiterSource') or d.get('ref') or 'Direct/Organic'
        
        agency = d.get('agencyName')
        if not agency or str(agency).strip() in ['', 'null', 'undefined', 'None']:
            agency = 'Voxa'
            
        unit = d.get('unitName')
        if not unit or str(unit).strip() in ['', 'null', 'undefined', 'None']:
            unit = 'Direct'
            
        team = d.get('teamName')
        if not team or str(team).strip() in ['', 'null', 'undefined', 'None']:
            team = 'Direct'

        # 🚀 Added the Matrix columns to the SQL statement
        c.execute(
            """INSERT INTO "JobApplications" 
            ("JobTitle", "Company", "FullName", "Email", "Phone", "WhatsApp", "EnglishLevel", "Experience", 
             "Gender", "GraduationStatus", "MilitaryStatus", "NationalID", "Nationality", "Address", 
             "DateOfBirth", "FacultyUniversity", "VoiceRecordPath", "VoiceRecordPath2", "SubmittedAt", 
             "RecruiterSource", "AgencyName", "UnitName", "TeamName") 
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,%s,%s,%s,%s)""",
            (d.get('title'), d.get('company'), d.get('name'), d.get('email'), d.get('phone'), d.get('whatsapp'),
             d.get('english'), d.get('experience'), d.get('gender'), d.get('gradStatus'), d.get('militaryStatus'),
             d.get('nationalId'), d.get('nationality'), d.get('address'), d.get('dob') or None, d.get('faculty'), 
             fn, fn2, recruiter, agency, unit, team)
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "OK"}), 201
    except Exception as e: 
        print(f"Upload Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/quick-apply', methods=['POST'])
def quick_apply():
    try:
        email = request.form.get('email')
        job_id = request.form.get('jobId')
        use_default_vn = request.form.get('useDefaultVN') == 'true'
        
        if not email or not job_id:
            return jsonify({"error": "Email and jobId are required"}), 400
            
        if not use_default_vn and 'voiceRecord' not in request.files:
            return jsonify({"error": "Voice record is required if not using default"}), 400
            
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if user profile is complete and get DefaultVoiceNote
        c.execute("""SELECT "FullName", "NationalID", "Nationality", "DOB", "Faculty", "Address", "Phone", "WhatsApp", "Gender", "GradStatus", "MilitaryStatus", "EnglishLevel", "Experience", "DefaultVoiceNote" FROM "Users" WHERE "Email" = %s""", (email,))
        user_row = c.fetchone()
        if not user_row:
            conn.close()
            return jsonify({"error": "User not found"}), 404
            
        if not user_row[1] or not user_row[6]: # NationalID or Phone missing
            conn.close()
            return jsonify({"error": "PROFILE_INCOMPLETE", "message": "Please complete your profile details (National ID, Phone, etc.) before using Quick Apply."}), 400
            
        if use_default_vn and not user_row[13]:
            conn.close()
            return jsonify({"error": "No Default Voice Note found in your profile."}), 400
            
        # Get Job details
        c.execute("""SELECT "JobTitle", "CompanyName" FROM "Jobs" WHERE "JobID" = %s""", (job_id,))
        job_row = c.fetchone()
        if not job_row:
            conn.close()
            return jsonify({"error": "Job not found"}), 404
            
        # Determine VN filename
        fn = user_row[13] if use_default_vn else None
        if not use_default_vn:
            f = request.files['voiceRecord']
            fn = f"VOICE_QUICK_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.ogg"
            s3_client.upload_fileobj(f, R2_BUCKET_NAME, fn, ExtraArgs={'ContentType': 'audio/ogg'})
        
        # Insert Application
        c.execute(
            """INSERT INTO "JobApplications" 
            ("JobTitle", "Company", "FullName", "Email", "Phone", "WhatsApp", "EnglishLevel", "Experience", 
             "Gender", "GraduationStatus", "MilitaryStatus", "NationalID", "Nationality", "Address", 
             "DateOfBirth", "FacultyUniversity", "VoiceRecordPath", "SubmittedAt", 
             "RecruiterSource", "AgencyName", "UnitName", "TeamName") 
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,%s,%s,%s,%s)""",
            (job_row[0], job_row[1], user_row[0], email, user_row[6], user_row[7],
             user_row[11], user_row[12], user_row[8], user_row[9], user_row[10],
             user_row[1], user_row[2], user_row[5], user_row[3], user_row[4], 
             fn, 'Direct/Organic', 'Voxa', 'Direct', 'Direct')
        )
        conn.commit()
        conn.close()
        return jsonify({"message": "Quick Apply Successful!"}), 201
        
    except Exception as e:
        print(f"Quick Apply Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/analyze/<int:id>', methods=['POST'])
def analyze(id):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT "VoiceRecordPath" FROM "JobApplications" WHERE "ApplicationID"=%s""", (id,))
        r = c.fetchone()
        conn.close()
        if r:
            # Pass the filename directly to the worker
            threading.Thread(target=ai_worker, args=(id, r[0])).start()
            return jsonify({"message": "Started"})
        return jsonify({"error": "404"}), 404
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/applications', methods=['GET'])
def apps():
    try:
        user_email = request.args.get('email')
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""SELECT "FullName", "Role", "TeamName", "UnitName", "AgencyName" FROM "Users" WHERE "Email"=%s""", (user_email,))
        user_data = c.fetchone()
        
        if user_data:
            u_name, u_role, u_team, u_unit, u_agency = user_data

            # 🚀 THE FIX: Prevent duplicates using DISTINCT ON and ensure older NULL rows fall back to Voxa/Direct
            base_select = """SELECT a.*, 
                                    u."UnitName" as "RecruiterUnit", 
                                    u."TeamName" as "RecruiterTeam",
                                    v."HumanGrade" as "AgencyGrade",
                                    v."ValidatorNotes"
                             FROM "JobApplications" a 
                             LEFT JOIN "Users" u ON a."RecruiterSource" = u."FullName" 
                             LEFT JOIN (
                                 SELECT DISTINCT ON ("ApplicationID") "ApplicationID", "HumanGrade", "ValidatorNotes"
                                 FROM "ValidatorGrades"
                                 ORDER BY "ApplicationID", "GradedAt" DESC
                             ) v ON a."ApplicationID" = v."ApplicationID" """

            # Support Dual Roles by using "in u_role" instead of "u_role =="
            if 'Admin' in u_role or 'SuperAdmin' in u_role:
                c.execute(base_select + """ORDER BY a."SubmittedAt" DESC""")
            elif 'CEO' in u_role or 'TopManagement' in u_role:
                c.execute(base_select + """WHERE COALESCE(NULLIF(TRIM(a."AgencyName"), ''), 'Voxa') = %s ORDER BY a."SubmittedAt" DESC""", (u_agency,))
            elif 'UnitManager' in u_role:
                c.execute(base_select + """WHERE COALESCE(NULLIF(TRIM(a."AgencyName"), ''), 'Voxa') = %s AND COALESCE(NULLIF(TRIM(a."UnitName"), ''), 'Direct') = %s ORDER BY a."SubmittedAt" DESC""", (u_agency, u_unit))
            elif 'Leader' in u_role:
                c.execute(base_select + """WHERE COALESCE(NULLIF(TRIM(a."AgencyName"), ''), 'Voxa') = %s AND COALESCE(NULLIF(TRIM(a."TeamName"), ''), 'Direct') = %s ORDER BY a."SubmittedAt" DESC""", (u_agency, u_team))
            else:
                c.execute(base_select + """WHERE a."RecruiterSource" = %s ORDER BY a."SubmittedAt" DESC""", (u_name,))
            
            cols = [x[0] for x in c.description]
            data = [dict(zip(cols, r)) for r in c.fetchall()]
            conn.close()
            return jsonify(data)
        return jsonify([])
    except Exception as e: 
        print(f"Apps Error: {e}")
        return jsonify([])

@app.route('/api/validator/applications', methods=['GET'])
def get_validator_applications():
    agency = request.args.get('agency')
    scopes = request.args.get('scopes', '')
    
    if not agency:
        return jsonify({"error": "Agency is required"}), 400
        
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        scopes_list = [s.strip() for s in scopes.split(',') if s.strip()]
        
        # Use PostgreSQL ANY() to match multiple units if scopes exist
        if scopes_list and 'All' not in scopes_list:
            cur.execute('''
                SELECT * FROM "JobApplications" 
                WHERE COALESCE(NULLIF(TRIM("AgencyName"), ''), 'Voxa') = %s 
                AND COALESCE(NULLIF(TRIM("UnitName"), ''), 'Direct') = ANY(%s)
                ORDER BY "ApplicationID" DESC
            ''', (agency, scopes_list))
            
        else:
            cur.execute('''
                SELECT * FROM "JobApplications" 
                WHERE COALESCE(NULLIF(TRIM("AgencyName"), ''), 'Voxa') = %s
                ORDER BY "ApplicationID" DESC
            ''', (agency,))
            
        apps = cur.fetchall()
        return jsonify(apps)
    except Exception as e:
        print(f"Validator Route Error: {e}") 
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

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

@app.route('/api/admin/staff', methods=['POST'])
def create_staff():
    data = request.json
    
    # 1. Who is trying to create this user? (This should come from their login session/token)
    creator_role = data.get('creator_role')     # e.g., 'CEO', 'UnitManager', 'SuperAdmin'
    creator_agency = data.get('creator_agency') # e.g., 'Dark Wolves'
    creator_unit = data.get('creator_unit')     # e.g., 'Unit A'
    
    # 2. Who are they trying to create?
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    target_role = data.get('role') # CEO, UnitManager, Leader, Recruiter
    target_agency = data.get('agency') 
    target_unit = data.get('unit') 
    target_team = data.get('team') 
    
    if not all([name, email, password, target_role, target_agency]):
        return jsonify({"error": "Missing required fields!"}), 400

    # ==========================================
    # 🛡️ THE STRICT PERMISSION FIREWALL 🛡️
    # ==========================================
    
    if 'SuperAdmin' in creator_role or 'Admin' in creator_role:
        # You are God. You can do anything.
        pass 
        
    elif 'CEO' in creator_role or 'TopManagement' in creator_role:
        if target_agency != creator_agency:
            return jsonify({"error": "You can only manage staff within your own agency."}), 403
        if target_role in ['SuperAdmin', 'Admin', 'CEO']:
            return jsonify({"error": "You cannot create other CEOs or Admins."}), 403
        if 'CEO' not in creator_role and target_role == 'TopManagement':
            return jsonify({"error": "Only the CEO can assign the Top Management role."}), 403
            
    elif 'UnitManager' in creator_role:
        if target_agency != creator_agency or target_unit != creator_unit:
            return jsonify({"error": "Unit Managers can only manage staff in their exact Unit."}), 403
        if target_role not in ['Leader', 'Recruiter']:
            return jsonify({"error": "Unit Managers can only create Leaders and Recruiters."}), 403
            
    elif 'Leader' in creator_role:
        if target_agency != creator_agency or target_unit != creator_unit or target_team != data.get('creator_team'):
            return jsonify({"error": "Leaders can only manage staff in their exact Team."}), 403
        if target_role != 'Recruiter':
            return jsonify({"error": "Leaders can only create Recruiters."}), 403
            
    else:
        return jsonify({"error": "You do not have permission to manage staff."}), 403

    # ==========================================
    
    # Securely hash the temporary password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Check if email already exists
        cur.execute('SELECT id FROM "Users" WHERE Email = %s', (email,))
        if cur.fetchone():
            return jsonify({"error": "Email already exists!"}), 400
            
        # Insert the new staff member into the matrix hierarchy
        cur.execute("""
            INSERT INTO "Users" (Name, Email, Password, Role, "AgencyName", "UnitName", TeamName)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (name, email, hashed_password, target_role, target_agency, target_unit, target_team))
        
        conn.commit()
        return jsonify({"message": f"{target_role} {name} successfully created in {target_agency}!"}), 201
    except Exception as e:
        print(f"[Error] Database Error: {e}")
        return jsonify({"error": "Failed to create staff member."}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/agency/staff', methods=['GET'])
def get_agency_staff():
    email = request.args.get('email')
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute('SELECT "Role", "AgencyName", "UnitName", "TeamName" FROM "Users" WHERE "Email"=%s', (email,))
        u = cur.fetchone()
        if not u: return jsonify([])
        
        u_role, u_agency, u_unit, u_team = u
        base_query = 'SELECT "UserID", "FullName", "Email", "Role", "UnitName", "TeamName", "ValidatorScopes" FROM "Users" WHERE "Status" = \'Approved\' AND COALESCE(NULLIF(TRIM("AgencyName"), \'\'), \'Voxa\') = %s'
        params = [u_agency]

        if 'CEO' in u_role or 'TopManagement' in u_role or 'SuperAdmin' in u_role or 'Admin' in u_role: pass
        elif 'UnitManager' in u_role:
            base_query += ' AND "UnitName" = %s'
            params.append(u_unit)
        else:
            return jsonify([]) # Leaders/Recruiters can't see the promotion directory

        cur.execute(base_query + ' ORDER BY "Role", "FullName"', tuple(params))
        rows = cur.fetchall()
        result = [{"id": r[0], "name": r[1], "email": r[2], "role": r[3], "unit": r[4], "team": r[5], "scopes": r[6]} for r in rows]
        return jsonify(result), 200
    except Exception as e: return jsonify([]), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/agency/staff/<int:id>', methods=['PUT'])
def update_agency_staff(id):
    data = request.json
    new_role = data.get('role')
    new_unit = data.get('unit')
    new_team = data.get('team')
    new_scopes = data.get('scopes', '')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute('UPDATE "Users" SET "Role"=%s, "UnitName"=%s, "TeamName"=%s, "ValidatorScopes"=%s WHERE "UserID"=%s', 
                    (new_role, new_unit, new_team, new_scopes, id))
        conn.commit()
        return jsonify({"message": "Staff profile successfully updated!"}), 200
    except Exception as e: return jsonify({"error": "Failed to update staff"}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/uploads/<fn>')
def file(fn): return redirect(f"{R2_PUBLIC_URL}/{fn}")

@app.route('/api/structure', methods=['GET'])
def get_structure():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Grab every unique Agency, Unit, and Team that exists
        cur.execute('SELECT DISTINCT "AgencyName", "UnitName", "TeamName" FROM "Users" WHERE "AgencyName" IS NOT NULL')
        rows = cur.fetchall()
        conn.close()

        # Build a nested dictionary cascade
        structure = {}
        for agency, unit, team in rows:
            if not agency: continue
            if agency not in structure:
                structure[agency] = {}
            
            if unit:
                if unit not in structure[agency]:
                    structure[agency][unit] = []
                if team and team not in structure[agency][unit]:
                    structure[agency][unit].append(team)

        return jsonify(structure), 200
    except Exception as e:
        print(f"[Error] Structure Fetch Error: {e}")
        return jsonify({}), 500

@app.route('/api/team-stats', methods=['GET'])
def get_team_stats():
    role = request.args.get('role')
    agency = request.args.get('agency')
    unit = request.args.get('unit')
    team = request.args.get('team')

    if not agency:
        return jsonify({"error": "Agency is required"}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Build the dynamic Matrix Query for stats
        base_query = 'SELECT COALESCE(NULLIF(TRIM("RecruiterSource"), \'\'), \'Direct/Organic\'), COUNT(*) as count FROM "JobApplications" WHERE COALESCE(NULLIF(TRIM("AgencyName"), \'\'), \'Voxa\') = %s'
        params = [agency]

        if role == 'UnitManager':
            base_query += ' AND COALESCE(NULLIF(TRIM("UnitName"), \'\'), \'Direct\') = %s'
            params.append(unit)
        elif role == 'Leader':
            base_query += ' AND COALESCE(NULLIF(TRIM("UnitName"), \'\'), \'Direct\') = %s AND COALESCE(NULLIF(TRIM("TeamName"), \'\'), \'Direct\') = %s'
            params.extend([unit, team])

        # Group them perfectly
        base_query += ' GROUP BY COALESCE(NULLIF(TRIM("RecruiterSource"), \'\'), \'Direct/Organic\') ORDER BY count DESC'
        
        cur.execute(base_query, tuple(params))
        stats = cur.fetchall()
        
        # Convert to a clean list
        result = [{"recruiter": row[0], "count": row[1]} for row in stats]
        return jsonify(result), 200
    except Exception as e:
        print(f"[Error] Stats Error: {e}")
        return jsonify({"error": "Failed to fetch stats"}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/schedule-interview', methods=['POST'])
def schedule_interview():
    data = request.json
    app_id = data.get('application_id')
    slot_id = data.get('slot_id')
    panel = data.get('panel')
    
    if not all([app_id, slot_id, panel]):
        return jsonify({"error": "Missing required fields"}), 400
        
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # 1. Fetch the slot and check capacity
        cur.execute('SELECT * FROM "InterviewSlots" WHERE "SlotID" = %s', (slot_id,))
        slot = cur.fetchone()
        
        if not slot or slot['Booked'] >= slot['Capacity']:
            return jsonify({"error": "Slot is fully booked or no longer available."}), 400
            
        # 2. Reserve the slot (decrement available capacity)
        cur.execute('UPDATE "InterviewSlots" SET "Booked" = "Booked" + 1 WHERE "SlotID" = %s', (slot_id,))
        
        # 3. Update the candidate with the interview time and the written Client Panel
        cur.execute("""
            UPDATE "JobApplications"
            SET "InterviewDate" = %s, "InterviewTime" = %s, "ClientPanel" = %s, "Status" = 'Scheduled'
            WHERE "ApplicationID" = %s 
        """, (slot['SlotDate'], slot['SlotTime'], panel, app_id))
        
        conn.commit()
        return jsonify({"message": "Interview slot locked in!"}), 200
    except Exception as e:
        conn.rollback()
        print(f"[Error] Schedule Error: {e}")
        return jsonify({"error": "Failed to schedule interview"}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/pending-staff', methods=['GET'])
def get_pending_staff():
    role = request.args.get('role')
    agency = request.args.get('agency')
    unit = request.args.get('unit')
    team = request.args.get('team')

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # The Matrix Filter: Who is allowed to see which pending users?
        base_query = 'SELECT "UserID", "FullName", "Email", "Role", "AgencyName", "UnitName", "TeamName" FROM "Users" WHERE "Status" = \'Pending\''
        params = []

        if 'SuperAdmin' in role or 'Admin' in role:
            pass # SuperAdmins see ALL pending users across the whole system
        elif 'CEO' in role or 'TopManagement' in role:
            base_query += ' AND COALESCE(NULLIF(TRIM("AgencyName"), \'\'), \'Voxa\') = %s AND "Role" IN (\'TopManagement\', \'UnitManager\', \'Validator\', \'Leader\', \'Recruiter\', \'HR\')'
            params.append(agency)
        elif 'UnitManager' in role:
            base_query += ' AND COALESCE(NULLIF(TRIM("AgencyName"), \'\'), \'Voxa\') = %s AND COALESCE(NULLIF(TRIM("UnitName"), \'\'), \'Direct\') = %s AND "Role" IN (\'Leader\', \'Recruiter\')'
            params.extend([agency, unit])
        elif 'Leader' in role:
            base_query += ' AND COALESCE(NULLIF(TRIM("AgencyName"), \'\'), \'Voxa\') = %s AND COALESCE(NULLIF(TRIM("UnitName"), \'\'), \'Direct\') = %s AND COALESCE(NULLIF(TRIM("TeamName"), \'\'), \'Direct\') = %s AND "Role" = \'Recruiter\''
            params.extend([agency, unit, team])
        else:
            return jsonify([]), 200 # Normal Recruiters shouldn't see this queue

        cur.execute(base_query, tuple(params))
        rows = cur.fetchall()
        
        # Convert to a clean list for the frontend
        result = []
        for row in rows:
            result.append({
                "id": row[0], "name": row[1], "email": row[2], 
                "role": row[3], "agency": row[4], "unit": row[5], "team": row[6]
            })
        return jsonify(result), 200
    except Exception as e:
        print(f"[Error] Pending Fetch Error: {e}")
        return jsonify({"error": "Failed to fetch pending staff"}), 500
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()


@app.route('/api/approve-staff', methods=['POST'])
def approve_staff():
    data = request.json
    target_user_id = data.get('user_id')
    action = data.get('action') # 'approve' or 'reject'

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        if action == 'approve':
            # Unlock their account!
            cur.execute('UPDATE "Users" SET "Status" = \'Approved\' WHERE "UserID" = %s', (target_user_id,))
        elif action == 'reject':
            # Delete their pending request completely
            cur.execute('DELETE FROM "Users" WHERE "UserID" = %s AND "Status" = \'Pending\'', (target_user_id,))
        
        conn.commit()
        return jsonify({"message": f"Staff member successfully {action}d!"}), 200
    except Exception as e:
        print(f"[Error] Approval Error: {e}")
        return jsonify({"error": "Failed to process approval"}), 500
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

from psycopg2.extras import RealDictCursor

# --- HR CRM LEADS API ---

@app.route('/api/hr/leads', methods=['GET'])
def get_hr_leads():
    agency = request.args.get('agency')
    if not agency:
        return jsonify({"error": "Agency is required"}), 400
        
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM CRM_Leads WHERE AgencyName = %s ORDER BY CreatedAt DESC", (agency,))
        leads = cur.fetchall()
        return jsonify(leads)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/hr/leads', methods=['POST'])
def create_hr_lead():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO CRM_Leads (AgencyName, CompanyName, ContactName, Status, ActionItem)
            VALUES (%s, %s, %s, %s, %s) RETURNING LeadID
        """, (data.get('agencyName'), data.get('companyName'), data.get('contactName'), data.get('status', 'Prospect'), data.get('actionItem')))
        
        lead_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({"message": "Lead created successfully", "LeadID": lead_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/hr/leads/<int:lead_id>', methods=['PUT'])
def update_hr_lead(lead_id):
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE CRM_Leads
            SET CompanyName=%s, ContactName=%s, Status=%s, ActionItem=%s
            WHERE LeadID=%s
        """, (data.get('companyName'), data.get('contactName'), data.get('status'), data.get('actionItem'), lead_id))
        conn.commit()
        return jsonify({"message": "Lead updated successfully"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        cur = conn.cursor()
        
        # 1. Get Top-Level Totals
        cur.execute('SELECT COUNT(*) FROM "Users"')
        total_users = cur.fetchone()[0]

        cur.execute('SELECT COUNT(DISTINCT "AgencyName") FROM "Users" WHERE "AgencyName" IS NOT NULL')
        total_agencies = cur.fetchone()[0]

        cur.execute('SELECT COUNT(*) FROM "Jobs"')
        total_jobs = cur.fetchone()[0]

        cur.execute('SELECT COUNT(*) FROM "JobApplications"')
        total_apps = cur.fetchone()[0]

        # 2. Get Agency Performance Breakdown
        cur.execute('''
            SELECT COALESCE(NULLIF(TRIM("AgencyName"), ''), 'Voxa') as agency, COUNT("ApplicationID") as candidate_count 
            FROM "JobApplications" 
            GROUP BY COALESCE(NULLIF(TRIM("AgencyName"), ''), 'Voxa')
            ORDER BY candidate_count DESC
        ''')
        agency_stats = [{"agency": row[0], "count": row[1]} for row in cur.fetchall()]

        return jsonify({
            "total_users": total_users,
            "total_agencies": total_agencies,
            "total_jobs": total_jobs,
            "total_apps": total_apps,
            "agency_breakdown": agency_stats
        }), 200

    except Exception as e:
        print(f"[Error] Admin Stats Error: {e}")
        return jsonify({"error": "Failed to fetch admin stats"}), 500
    finally:
        if 'cur' in locals() and cur: cur.close()
        if 'conn' in locals() and conn: conn.close()

# --- HR INTERVIEW CALENDAR API ---
@app.route('/api/hr/slots', methods=['GET', 'POST'])
def manage_slots():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        if request.method == 'GET':
            agency = request.args.get('agency')
            job = request.args.get('job')
            
            if agency and job:
                # For Agency Leaders: Only show future slots that are NOT fully booked
                cur.execute('SELECT * FROM "InterviewSlots" WHERE "AgencyName" = %s AND "JobTitle" = %s AND "Booked" < "Capacity" ORDER BY "SlotDate" ASC', (agency, job))
            else:
                # For HR: Show all slots
                cur.execute('SELECT * FROM "InterviewSlots" ORDER BY "SlotDate" DESC')
                
            return jsonify(cur.fetchall()), 200
            
        elif request.method == 'POST':
            d = request.json
            cur.execute('INSERT INTO "InterviewSlots" ("JobTitle", "AgencyName", "SlotDate", "SlotTime", "Capacity") VALUES (%s, %s, %s, %s, %s)',
                        (d.get('jobTitle'), d.get('agencyName'), d.get('date'), d.get('time'), d.get('capacity')))
            conn.commit()
            return jsonify({"message": "Slot Created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/hr/slots/<int:id>', methods=['DELETE'])
def delete_slot(id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM "InterviewSlots" WHERE "SlotID" = %s', (id,))
        conn.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# --- CONTACT FORM API ---
@app.route('/api/contact', methods=['POST'])
def handle_contact():
    data = request.json
    name = data.get('name')
    sender_email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')

    if not all([name, sender_email, subject, message]):
        return jsonify({"error": "All fields are required"}), 400

    # Uses standard environment variables for the email credentials
    SMTP_USER = os.getenv("SMTP_USER", "voxaa.business@gmail.com") 
    SMTP_PASS = os.getenv("SMTP_PASS") # Must be a 16-character Gmail App Password

    if not SMTP_PASS:
        print("❌ SMTP_PASS is not set in environment variables.")
        return jsonify({"error": "Email server is not configured. Contact Administrator."}), 500

    try:
        msg = EmailMessage()
        msg['Subject'] = f"Voxa Contact Form: {subject}"
        msg['From'] = SMTP_USER
        msg['To'] = "voxaa.business@gmail.com"
        msg['Reply-To'] = sender_email # This ensures when you hit "Reply" in Gmail, it goes to the candidate!
        
        body = f"New message from the Voxa Contact Form:\n\nName: {name}\nEmail: {sender_email}\nSubject: {subject}\n\nMessage:\n{message}"
        msg.set_content(body)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)

        return jsonify({"message": "Message sent successfully!"}), 200
    except Exception as e:
        print(f"[Error] Email Sending Error: {e}")
        return jsonify({"error": "Failed to send the email. Please try again later."}), 500

if __name__ == '__main__': app.run(debug=True, port=5000, use_reloader=False)