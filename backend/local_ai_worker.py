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

processor = None
audio_model = None

def get_audio_model():
    global processor, audio_model
    if audio_model is None:
        print("\n⏳ Initializing 4-bit Quantized LALM (Qwen2-Audio-7B)...")
        print("⚙️ Automatically dividing workload across ALL available GPUs, System RAM, and CPU...")
        processor = AutoProcessor.from_pretrained("Qwen/Qwen2-Audio-7B-Instruct")
        
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4", 
            bnb_4bit_compute_dtype=torch.float16,
            llm_int8_enable_fp32_cpu_offload=True
        )
        
        # 🛡️ THE HARDWARE SAFETY NET 🛡️
        # 1.8GB max for MX450, exactly 2.0GB max for System RAM (~6 layers), rest to Disk.
        custom_memory_map = {
            0: "1.8GiB",     
            "cpu": "2.0GiB"  
        }
        
        audio_model = Qwen2AudioForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2-Audio-7B-Instruct",
            device_map="auto",
            max_memory=custom_memory_map,
            quantization_config=quantization_config, 
            torch_dtype=torch.float16,
            offload_folder="offload"
        )
        print("✅ LALM successfully loaded into memory!\n")
        print("📊 AI Hardware Distribution Map:")
        print(audio_model.hf_device_map, "\n")
    return processor, audio_model

def run_local_audio_analysis(file_path):
    print(f"🧠 Local LALM is evaluating {file_path} natively...")
    try:
        proc, mod = get_audio_model()
        prompt_text = """
        <role>
        You are an expert CEFR English Examiner and Technical Recruiter. Listen to the candidate's audio natively.
        Evaluate their English proficiency and provide individual CEFR grades for Fluency, Pronunciation, and Grammar, plus an Overall grade.
        </role>

        <scoring_rubric>
        - 0-25: A1 & A2 (Beginner)
        - 26-40: B1 (Intermediate)
        - 41-50: B1+ (Strong Intermediate)
        - 51-65: B2 (Upper Intermediate)
        - 66-75: B2+ (Advanced Intermediate)
        - 76-85: C1 (Advanced)
        - 86-95: C1+ (Strong Advanced)
        - 96-100: C2 (Mastery)
        </scoring_rubric>

        <grading_calibration>
        1. THE C1+ EXECUTIVE (Score 86-95): High-speed, highly confident, native-like rhythm, uses industry jargon smoothly. EXTREMELY IMPORTANT: If they possess this level of fluency, IGNORE minor grammar or preposition slips. Their Overall Grade MUST be C1+.
        2. THE C1 FLUENT STORYTELLER (Score 76-85): Speaks fluently, clearly, and confidently, but has a noticeable regional accent and makes direct translation errors. Because fluency and pronunciation are the top priority, their Overall Grade MUST be C1. Do NOT drop them to B2.
        3. THE SCRIPT READER PENALTY (Score 51-65): If a candidate has absolutely flawless grammar and rich vocabulary but sounds like they are reading from a prepared piece of paper (monotonous, rhythmic pacing, lack of spontaneous 'thinking' pauses, unnatural breathing), you MUST penalize them. If they are reading, their Overall Grade MUST be B2 (max score 65). You MUST mention that they sound rehearsed in the summary.
        4. THE B1+ GRAMMAR DROPPER (Score 41-50): If the candidate has a good accent and confidence, but consistently drops foundational verbs or articles, their Overall Grade MUST be capped at B1+. 
        
        5. ACCENT PROFILING: Explicitly name their accent (e.g., 'Clear Egyptian'). A strong but clear accent does not lower the grade.
        6. STRICT JSON FORMATTING: Use ONLY single quotes inside the JSON string values.

        7. CLIENT PANEL: Write a highly professional, 2-3 sentence summary designed to be sent to a corporate client. Highlight their strengths, accent, and overall communication confidence.
        8. CONSTRUCTIVE FEEDBACK: Write a single, polite sentence offering a specific tip on how they can improve their spoken English based on their audio.
        </grading_calibration>

        <output_format>
        Provide a summary of their speech detailing their fluency, grammar, and ACCENT PROFILE. Return ONLY valid JSON in this EXACT format:
        {
            "overall_level": "[Insert Level here]",
            "overall_score": [Insert Integer Score here],
            "fluency_level": "[Insert Level here]",
            "pronunciation_level": "[Insert Level here]",
            "grammar_level": "[Insert Level here]",
            "accent_profile": "[Insert 2-3 words max, e.g., 'Clear Egyptian']",
            "summary": "[Insert detailed summary here...]",
            "transcript": "[Insert transcript here...]"
        }
        </output_format>
        """
        
        print("🔊 Reading audio file into tensors...")
        audio_arr, sr = librosa.load(file_path, sr=proc.feature_extractor.sampling_rate)
        
        conversation = [
            {"role": "user", "content": [
                {"type": "audio", "audio_url": "local_audio.wav"},
                {"type": "text", "text": prompt_text}
            ]}
        ]
        
        text = proc.apply_chat_template(conversation, add_generation_prompt=True, tokenize=False)
        inputs = proc(text=text, audios=[audio_arr], return_tensors="pt", padding=True)
        inputs = inputs.to(mod.device)
        
        print("⏳ Generating CEFR grading natively... (This will take time based on your hardware)")
        with torch.no_grad():
            generate_ids = mod.generate(**inputs, max_new_tokens=1024, temperature=0.2)
            
        generate_ids = generate_ids[:, inputs.input_ids.size(1):]
        response = proc.batch_decode(generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
        
        print("✅ Local Analysis Complete!")
        return response
    except Exception as e:
        print(f"❌ Local LALM Error: {e}")
        return None

def process_application(app_id, file_name):
    print(f"☁️ Downloading {file_name} from Cloudflare R2 for AI analysis...")
    local_path = os.path.join(UPLOAD_FOLDER, file_name)
    try:
        s3_client.download_file(R2_BUCKET_NAME, file_name, local_path)
    except Exception as e:
        print(f"❌ Failed to download from R2: {e}")
        return

    print(f"🤖 Processing App #{app_id} entirely offline via LALM...")
    try:
        ai_response = run_local_audio_analysis(local_path)
        if ai_response:
            match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if match:
                json_str = match.group().replace('```json', '').replace('```', '').strip()
            else:
                json_str = '{"overall_level": "B1", "overall_score": 60, "summary": "Format failed."}'
            ai_data = json.loads(json_str)
            
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
