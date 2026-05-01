import os
import json
import psycopg2
import datetime
import re
import time
from tqdm import tqdm
from PIL import Image

from openai import OpenAI
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()

# Using the same live database URL from app.py
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require")

# Configure this to match your local LLM server (Ollama, LM Studio, etc.)
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "phi3:mini")

client = OpenAI(base_url=LOCAL_LLM_URL, api_key="local-no-key-required", timeout=None)

VOXA_BRAND_IDENTITY = """
BRAND NAME: Voxa
SLOGAN: "Apply now, get hired yesterday."
MISSION: To revolutionize recruitment in Egypt by allowing candidates to apply for jobs using simply a Voice Note on our dedicated platform—no traditional CV required.
MARKET POSITIONING: There are many recruitment agencies in Egypt, but none have a dedicated, seamless website or operate as efficiently and fast as Voxa. Emphasize our speed and tech-forward approach.
VISUAL IDENTITY & COLORS: Primary colors are Light Blue (#34A8FF), Purple/Magenta (#954CE5), Dark Navy Background (#091122), and Pure White Text (#FFFFFF). 
LOGO DESCRIPTION: A modern, stylized letter "V" where the left side is formed by tech-inspired circuit board lines and circular nodes. The colors transition in a gradient from light blue on the right side of the "V" to purple on the left circuit nodes.
The aesthetic is modern, clean, cinematic, and tech-forward.
ULTIMATE GOAL: Drive massive traffic to the Voxa website. Convert job seekers into registered users by selling them on how incredibly easy it is to apply.
TONE OF VOICE: Innovative, empowering, energetic, Egyptian-youth friendly, and highly professional.
"""

def get_active_jobs():
    """Fetch active jobs from the Voxa database."""
    print("⏳ Connecting to the Neon database to fetch active jobs...")
    conn = None
    try:
        # Added a 15-second timeout to prevent indefinite network hanging
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=15)
        cur = conn.cursor()
        cur.execute('SELECT "JobID", "JobTitle", "CompanyName", "SalaryPackage", "Location", "WorkingHours" FROM "Jobs" WHERE "Status" = \'Active\'')
        cols = [desc[0] for desc in cur.description]
        jobs = [dict(zip(cols, row)) for row in cur.fetchall()]
        return jobs
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return []
    finally:
        if conn:
            cur.close()
            conn.close()

def get_past_analytics():
    """
    Reads past performance analytics from a local file so the AI can learn from mistakes.
    Create a 'past_analytics.json' or text file in this folder and jot down notes 
    on what worked and what failed each week!
    """
    analytics_path = os.path.join(os.path.dirname(__file__), "past_analytics.json")
    if os.path.exists(analytics_path):
        with open(analytics_path, "r", encoding="utf-8") as f:
            return f.read()
            
    # Fallback simulated analytics if the file doesn't exist yet
    return """
    PAST PERFORMANCE INSIGHTS (EGYPT TARGET AUDIENCE):
    - Posts mentioning "11K Net Salary" in the first line got 40% more clicks.
    - Emojis like 🚀 and 💸 work best on Instagram, but perform poorly on LinkedIn.
    - Facebook posts that ask "Send your Voice Note in the comments" got 3x more engagement.
    - Last week's image prompt that was too "corporate" failed; vibrant, youth-focused imagery works better.
    - TikTok videos under 10 seconds with trending audio hooks retain 80% more viewers.
    """

def generate_local_media(prompt, media_type, post_date, job_title):
    """
    Uses a local text-to-image model (like Stable Diffusion) to generate media.
    """
    if media_type == "video":
        print("❌ Local video generation is not supported. This feature requires specialized hardware (typically 24GB+ VRAM) and is beyond the scope of this script.")
        return

    print(f"\n🖼️  Generating {media_type} for {post_date}...")
    print("⏳ Loading local image models into RAM (this may take a few minutes on an 8GB laptop)...")
    
    try:
        import torch
        from diffusers import AutoPipelineForText2Image
    except ImportError:
        print("⚠️  `diffusers` or `torch` library not found. Local image generation will be skipped. Install with: pip install diffusers transformers accelerate torch")
        return

    # --- ⚠️ HARDWARE WARNING ⚠️ ---
    # Running modern diffusion models is very resource-intensive.
    # With 2GB VRAM and 8GB RAM, this process will be EXTREMELY slow and may fail.
    # This code is configured to force running on the CPU to avoid VRAM errors,
    # but expect image generation to take several minutes per image.
    # For better performance, a GPU with at least 8GB VRAM is recommended.
    # ---

    try:
        # To save RAM, we use a smaller, faster model like SD Turbo.
        # We also force it to CPU to avoid VRAM issues on low-spec hardware.
        pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sd-turbo", torch_dtype=torch.float32)
        
        # Force to CPU if VRAM is low or no CUDA device is available
        if not torch.cuda.is_available() or torch.cuda.get_device_properties(0).total_memory < 4 * 1024**3:
             print("🐌 Low VRAM or no CUDA device detected. Forcing image generation to CPU. This will be slow.")
             pipe = pipe.to("cpu")
        else:
             pipe = pipe.to("cuda")

        image = pipe(prompt=prompt, num_inference_steps=2, guidance_scale=0.0).images[0]

        sanitized_title = re.sub(r'[^a-zA-Z0-9_]', '', job_title).lower()
        filename = f"{post_date.replace(', ', '_').replace(' ', '_')}_{sanitized_title}.png"
        output_path = os.path.join(os.path.dirname(__file__), "generated_media", filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image.save(output_path)
        print(f"✅ Successfully saved image to: {output_path}")
    except Exception as e:
        print(f"❌ Failed to generate local image: {e}\n   This might be due to memory constraints or a model download issue.")

def query_local_llm(prompt, task_name="Task", max_retries=3):
    """A robust function to query the local LLM with retries and live streaming."""
    if "Schedule Check" in task_name and "LinkedIn" in task_name:
        tqdm.write("\n   ⚠️ Note: The very FIRST query takes the longest (often 5-10 minutes) because your computer is loading the AI model into RAM and reading the massive guidelines file. Please be patient!")
    tqdm.write(f"   -> 🧠 AI Thinking: {task_name} (Ingesting prompt...)")
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=LOCAL_MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=800,
                stream=True
            )
            
            result_text = ""
            print("      ", end="", flush=True) # Indent the stream visually
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    content = chunk.choices[0].delta.content
                    if content:
                        result_text += content
                        # Print the text live to the console so you can watch it think
                        print(content, end="", flush=True)
            print("\n", flush=True)
            
            # Clean <think> tags completely
            result_text = re.sub(r'<think>.*?</think>\s*', '', result_text, flags=re.DOTALL)
            # Clean common markdown wrappers and other tags
            result_text = re.sub(r'</?output_format>', '', result_text)
            result_text = re.sub(r'^```[a-zA-Z]*\n', '', result_text, flags=re.MULTILINE)
            result_text = re.sub(r'```$', '', result_text, flags=re.MULTILINE)
            return result_text.strip()
        except Exception as e:
            tqdm.write(f"      ⚠️ Attempt {attempt + 1} failed: {e}")
            time.sleep(2)
    return "Failed to generate content after retries."

def generate_weekly_schedule(jobs, analytics_data):
    """Use a local LLM in a nested loop to safely generate a highly detailed weekly markdown schedule."""
    
    # 1. Load the latest guidelines
    guidelines_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
    if os.path.exists(guidelines_path):
        try:
            with open(guidelines_path, "r", encoding="utf-8") as f:
                rules = json.load(f)
        except json.JSONDecodeError as e:
            print(f"⚠️ Warning: platform_guidelines.json contains invalid JSON generated by the AI ({e}). Falling back to default rules.")
            rules = {}
    else:
        print("⚠️ Warning: platform_guidelines.json not found. Run update_guidelines.py first! Falling back to default rules.")
        rules = {}
        
    # 2. Load Social Memory (RAG / History) to prevent redundancy
    memory_path = os.path.join(os.path.dirname(__file__), "social_memory.json")
    try:
        if os.path.exists(memory_path):
            with open(memory_path, "r", encoding="utf-8") as f:
                social_memory = json.load(f)
        else:
            social_memory = {"recent_posts": []}
    except json.JSONDecodeError:
        social_memory = {"recent_posts": []}

    # Start the schedule from tomorrow to always exclude "today"
    start_date = datetime.datetime.now() + datetime.timedelta(days=1)
    schedule_md = "# Voxa 7-Day Social Media Master Plan\n\n"
    
    print("\n🤖 Launching AI Loop: Day-by-Day, Platform-by-Platform Generation...")
    
    days_of_week = [start_date + datetime.timedelta(days=i) for i in range(7)]
    scheduled_days_this_week = {p: [] for p in ["LinkedIn", "Facebook", "Instagram", "TikTok"]}
    
    for day_date in tqdm(days_of_week, desc="Planning Week", unit="day"):
        day_idx = (day_date - start_date).days
        date_str = day_date.strftime("%B %d, %Y")
        day_name = day_date.strftime("%A")
        
        job = jobs[day_idx % len(jobs)] if jobs else {"JobTitle": "Voxa Platform", "CompanyName": "Voxa", "Location": "Egypt"}
        
        schedule_md += f"## 📅 {day_name}, {date_str}\n"
        schedule_md += f"**Focus:** {job['JobTitle']} at {job['CompanyName']}\n\n"
        
        tqdm.write(f"\n🗓️  Generating for Day {day_idx + 1}/7 ({day_name})...")
        
        platforms_used_today = []
        
        for platform in ["LinkedIn", "Facebook", "Instagram", "TikTok"]:
            platform_rules = rules.get(platform.lower(), {})
            if isinstance(platform_rules, str): 
                schedule_guidance = platform_rules
            else:
                schedule_guidance = platform_rules.get("posting_schedule", "Post daily.")
                
            # --- LOOP STEP 1: RAG Memory & Decision ---
            decision_prompt = f"""
            <role>Voxa Social Media Scheduler</role>
            <task>
            Platform: {platform} | Day: {day_name}
            Already scheduled for {platform} this week on: {', '.join(scheduled_days_this_week[platform]) if scheduled_days_this_week[platform] else 'None yet'}
            Guidelines: {schedule_guidance}
            
            Based EXACTLY on the guidelines above, and knowing our schedule history this week, should we generate a post for {platform} on a {day_name}? 
            Use <think> tags to reason, then output ONLY the word YES or NO.
            </task>
            """
            decision = query_local_llm(decision_prompt, f"Schedule Check for {platform}")
            
            if "NO" in decision.upper() and "YES" not in decision.upper():
                tqdm.write(f"   ⏸️  Skipping {platform} (Guideline limit).")
                continue
                
            scheduled_days_this_week[platform].append(day_name)
            platforms_used_today.append(platform)
            
            # --- LOOP STEP 2: Content Generation ---
            recent_history = "\n".join(social_memory["recent_posts"][-10:])
            anti_spam = platform_rules.get("guidelines_and_anti_spam", "") if isinstance(platform_rules, dict) else ""
            growth_tactics = platform_rules.get("reach_and_growth_tactics", "") if isinstance(platform_rules, dict) else ""
            
            content_prompt = f"""
            <role>Lead Copywriter for Voxa in Egypt</role>
            <task>
            Write a highly engaging social media caption/script for {platform} to promote this job:
            Job: {job['JobTitle']} at {job['CompanyName']} ({job['Location']})
            
            <brand_identity>{VOXA_BRAND_IDENTITY}</brand_identity>
            
            <rules>
            1. Follow {platform}'s anti-spam rules: {anti_spam}
            2. Use these reach tactics: {growth_tactics}
            3. Apply learnings from past analytics: {analytics_data}
            4. MEMORY CHECK: DO NOT repeat these recent concepts we already posted:
            {recent_history}
            5. CRITICAL LANGUAGE RULE: The primary language of the post MUST be **Egyptian Arabic (العامية المصرية)** written in Arabic script. Mix in English corporate/tech words (like 'Voice Note', 'Interview', 'Tele-sales') exactly how Egyptian youth and professionals speak today. DO NOT write the whole post in English!
            6. CRITICAL CTA RULE: You MUST end every post with a strong Call-to-Action (CTA) encouraging the user to apply, followed exactly by the website link: https://voxa-pi-three.vercel.app/
            </rules>
            
            Use <think> tags to brainstorm, then output ONLY the final text. Do NOT wrap in JSON.
            </task>
            """
            caption = query_local_llm(content_prompt, f"Caption for {platform}")
            social_memory["recent_posts"].append(f"[{platform} / {day_name}] Promoted {job['JobTitle']} - Theme: {caption[:50]}...")
            
            # --- LOOP STEP 3: Media Generation ---
            is_video = platform in ["TikTok", "Instagram"]
            media_type_label = "VIDEO PROMPT" if is_video else "IMAGE PROMPT"
            
            media_prompt = f"""
            You are the Creative Director for Voxa in Egypt.
            
            TASK: Write exactly ONE ultra-detailed {media_type_label} for an AI media generator.
            
            REFERENCE SOCIAL MEDIA POST:
            "{caption[:300]}..."
            
            REQUIREMENTS:
            1. The visual must be cinematic, set in Egypt, and match the vibe of the post above.
            2. You MUST include this exact sentence somewhere in your output: "A stylized letter V with the left side formed by tech-inspired circuit board lines and nodes, transitioning from light blue to purple."
            3. Output ONLY the visual description paragraph. Do NOT generate multiple prompts. Do NOT write for other companies. Do NOT output fake tasks.
            
            Begin with <think> tags to plan, then provide the final prompt.
            """
            media_desc = query_local_llm(media_prompt, f"{media_type_label} for {platform}")
            
            schedule_md += f"### 📱 {platform}\n"
            schedule_md += f"**Caption/Script:**\n{caption}\n\n"
            schedule_md += f"**{media_type_label} (for Canva AI / Gemini):**\n{media_desc}\n\n"
            schedule_md += "---\n\n"
            
        if not platforms_used_today:
            schedule_md += "*No posts scheduled for this day based on platform guidelines.*\n\n---\n\n"
            
    # Save memory safely to persist between runs
    social_memory["recent_posts"] = social_memory["recent_posts"][-40:] # Keep memory from growing too large
    with open(memory_path, "w", encoding="utf-8") as f:
        json.dump(social_memory, f, indent=4)
        
    return schedule_md

if __name__ == "__main__":
    print("🚀 Voxa AI Social Media Bot Initialized!")
    jobs = get_active_jobs()
    analytics = get_past_analytics()
    print(f"📊 Found {len(jobs)} active jobs in the database.")
    
    if jobs:
        schedule = generate_weekly_schedule(jobs, analytics)
        if schedule:
            # Strip the <think> block so the final markdown is clean
            cleaned_schedule = re.sub(r'<think>.*?</think>\s*', '', schedule, flags=re.DOTALL)

            # Save the content to a Markdown file
            output_path = os.path.join(os.path.dirname(__file__), "weekly_social_media_plan.md")
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(cleaned_schedule)
            print(f"\n✅ Generation Complete! Your weekly plan has been saved to: {output_path}")

            # --- SKIPPING LOCAL MEDIA GENERATION ---
            print("\n🎨 Local media generation has been skipped to save system resources.")
            print("You can copy the highly detailed IMAGE and VIDEO prompts directly from the Markdown file and paste them into Canva AI or Google Gemini.")
                    
        else:
            print("\n❌ Failed to generate social content due to an API error.")
