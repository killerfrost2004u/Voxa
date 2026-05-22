import os
import re
import json
import time
import tempfile
import psycopg2
import boto3
from botocore.client import Config
from dotenv import load_dotenv
import psutil
import librosa
import torch
from transformers import AutoProcessor, Qwen2AudioForConditionalGeneration, BitsAndBytesConfig

# --- CONFIGURATION ---
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require")

R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "voxa-audio")

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

UPLOAD_FOLDER = tempfile.gettempdir()

def free_ram_kill_other_llms():
    print("🧹 Freeing RAM: Shutting down background LLM servers...")
    for proc in psutil.process_iter(['name']):
        try:
            name = proc.info['name'].lower()
            if 'ollama' in name or 'lmstudio' in name or 'lm-studio' in name or 'server.exe' in name:
                proc.kill()
                print(f"💀 Killed background AI process: {name} to free up RAM!")
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

free_ram_kill_other_llms()

from ai_evaluator import AIAnalyzerFactory

def process_application(app_id, file_name):
    print(f"☁️ Downloading {file_name} from Cloudflare R2 for AI analysis...")
    local_path = os.path.join(UPLOAD_FOLDER, file_name)
    try:
        s3_client.download_file(R2_BUCKET_NAME, file_name, local_path)
    except Exception as e:
        print(f"❌ Failed to download from R2: {e}")
        return

    analyzer_type = os.getenv("AI_ENGINE", "local")
    print(f"🤖 Processing App #{app_id} via {analyzer_type.upper()} Analyzer Strategy...")
    try:
        analyzer = AIAnalyzerFactory.get_analyzer(analyzer_type)
        ai_data = analyzer.analyze(local_path)
        
        if ai_data:
            overall_grade = f"{ai_data.get('overall_level', 'B1')} ({ai_data.get('overall_score', 60)})"
            
            conn = psycopg2.connect(DATABASE_URL)
            c = conn.cursor()
            c.execute(
                """UPDATE "JobApplications" 
                   SET "Transcription"=%s, "AI_Rating"=%s, "AI_Summary"=%s, "SpeechRate"=0,
                       "Grammar_Rating"=%s, "Fluency_Rating"=%s, "Pronunciation_Rating"=%s, "Accent_Profile"=%s, 
                       "Status"='Analyzed'
                   WHERE "ApplicationID"=%s""",
                (ai_data.get('transcript', 'Transcript not provided.'), overall_grade, ai_data.get('summary', ''), 
                 ai_data.get('grammar_level', 'N/A'), ai_data.get('fluency_level', 'N/A'), 
                 ai_data.get('pronunciation_level', 'N/A'), ai_data.get('accent_profile', 'Not Specified'), app_id)
            )
            conn.commit()
            conn.close()
            print(f"✅ Successfully updated database for App #{app_id}")
        else:
            print(f"❌ AI returned nothing for App #{app_id}.")
    except Exception as e:
        print(f"❌ Worker Error: {e}")
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)
            print(f"🧹 Cleaned up temporary file: {file_name}")

def main():
    print("🚀 Voxa Offline AI Worker Initialized!")
    print("📡 Listening to live Neon Database for pending applications...")
    
    while True:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            c = conn.cursor()
            
            # Fetch ONE application that has an audio file but hasn't been graded yet
            c.execute('''
                SELECT "ApplicationID", "VoiceRecordPath" 
                FROM "JobApplications" 
                WHERE "AI_Rating" IS NULL 
                  AND "VoiceRecordPath" IS NOT NULL 
                LIMIT 1
            ''')
            row = c.fetchone()
            conn.close()
            
            if row:
                app_id, file_name = row
                print(f"\n🔔 New application detected on live website! App ID: {app_id}")
                process_application(app_id, file_name)
            else:
                # Sleep for 10 seconds before checking again
                time.sleep(10)
        except Exception as e:
            print(f"❌ Database Polling Error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()
