import os
import json
import psycopg2
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Using the same live database URL from app.py
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require")

if not GEMINI_API_KEY:
    raise ValueError("No API key found. Please check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

def get_active_jobs():
    """Fetch active jobs from the Voxa database."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute('SELECT "JobID", "JobTitle", "CompanyName", "SalaryPackage", "Location", "WorkingHours" FROM "Jobs" WHERE "Status" = \'Active\'')
        cols = [desc[0] for desc in cur.description]
        jobs = [dict(zip(cols, row)) for row in cur.fetchall()]
        return jobs
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return []
    finally:
        cur.close()
        conn.close()

def generate_social_content(job):
    """Use Gemini 2.5 Flash to generate platform-specific social media posts based on dynamic guidelines."""
    
    # 1. Load the latest guidelines
    guidelines_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
    if os.path.exists(guidelines_path):
        with open(guidelines_path, "r", encoding="utf-8") as f:
            rules = json.load(f)
    else:
        print("⚠️ Warning: platform_guidelines.json not found. Run update_guidelines.py first! Falling back to default rules.")
        rules = {"linkedin": "Professional", "facebook": "Engaging", "instagram": "Visual, no links in caption", "tiktok": "Short hook"}

    prompt = f"""
    You are Voxa's Expert Social Media Manager.
    We have a new active job posting on our platform. 
    
    Job Details:
    - Title: {job['JobTitle']}
    - Company: {job['CompanyName']}
    - Salary: {job['SalaryPackage']}
    - Location: {job['Location']}
    - Hours: {job['WorkingHours']}
    
    CRITICAL PLATFORM GUIDELINES YOU MUST FOLLOW:
    - LinkedIn Rules: {rules.get('linkedin', '')}
    - Facebook Rules: {rules.get('facebook', '')}
    - Instagram Rules: {rules.get('instagram', '')}
    - TikTok Rules: {rules.get('tiktok', '')}
    
    Write 4 highly engaging social media posts to attract candidates:
    1. 'linkedin_post': Follow the LinkedIn rules.
    2. 'facebook_post': Follow the Facebook rules. Mention "Apply with your Voice Note!"
    3. 'instagram_post': Follow the Instagram rules. Use emojis, ensure link is directed to "Link in Bio".
    4. 'tiktok_script': A 15-second viral video hook and script, including text overlay suggestions.
    
    Output strictly as valid JSON in this exact format:
    {{
        "job_id": {job['JobID']},
        "linkedin_post": "...",
        "facebook_post": "...",
        "instagram_post": "...",
        "tiktok_script": "..."
    }}
    """
    
    print(f"🤖 Generating content for {job['CompanyName']} - {job['JobTitle']}...")
    response = model.generate_content(prompt)
    
    # Clean up JSON markdown block if present
    result_text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(result_text)

if __name__ == "__main__":
    print("🚀 Voxa AI Social Media Bot Initialized!")
    jobs = get_active_jobs()
    print(f"📊 Found {len(jobs)} active jobs in the database.")
    
    if jobs:
        # For testing, let's just generate content for the first job in the list
        content = generate_social_content(jobs[0])
        print("\n✅ Generation Complete! Here is the output:\n")
        print(json.dumps(content, indent=2, ensure_ascii=False))
