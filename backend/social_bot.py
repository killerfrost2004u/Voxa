import os
import json
import psycopg2
import datetime
import re
from PIL import Image
import torch

try:
    from diffusers import AutoPipelineForText2Image
except ImportError:
    print("⚠️  `diffusers` library not found. Local image generation will be skipped. Install with: pip install diffusers transformers accelerate")
    AutoPipelineForText2Image = None

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

    if not AutoPipelineForText2Image:
        return # Skip if diffusers is not installed

    print(f"\n🖼️  Generating {media_type} for {post_date}...")

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

def generate_weekly_schedule(jobs, analytics_data):
    """Use a local LLM to generate a full weekly markdown schedule based on jobs and analytics."""
    
    # 1. Load the latest guidelines
    guidelines_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
    if os.path.exists(guidelines_path):
        try:
            with open(guidelines_path, "r", encoding="utf-8") as f:
                rules = json.load(f)
        except json.JSONDecodeError as e:
            print(f"⚠️ Warning: platform_guidelines.json contains invalid JSON generated by the AI ({e}). Falling back to default rules.")
            rules = {"linkedin": "Professional", "facebook": "Engaging", "instagram": "Visual, no links in caption", "tiktok": "Short hook"}
    else:
        print("⚠️ Warning: platform_guidelines.json not found. Run update_guidelines.py first! Falling back to default rules.")
        rules = {"linkedin": "Professional", "facebook": "Engaging", "instagram": "Visual, no links in caption", "tiktok": "Short hook"}

    # Take up to 7 jobs for the week
    jobs_sample = jobs[:7]
    jobs_text = json.dumps(jobs_sample, indent=2)

    # Read actual date and exact time directly from the system clock
    start_date = datetime.datetime.now()
    current_time = start_date.strftime("%A, %B %d, %Y at %I:%M %p")

    prompt = f"""
    <role>
    You are Voxa's Elite Marketing Agency, Lead Copywriter, and Expert Social Media Strategist. Your primary goal is to drive massive traffic to the Voxa website via the Egyptian job market. You are a world-class prompt engineer and your thinking process is as detailed and analytical as Google's Gemini 3.1 Pro or Anthropic's Claude Opus 4.6.
    </role>
    
    <brand_identity>
    {VOXA_BRAND_IDENTITY}
    AUDIENCE PSYCHOLOGY: Egyptian job seekers are frustrated with traditional CVs, slow responses, and complicated portals. They want speed, respect, and tech.
    LANGUAGE INSTRUCTIONS: You MUST write the social media captions using a highly engaging, natural mix of English and Egyptian Arabic dialect (Franco-Arabic). Ensure it sounds completely human, using slang and avoiding overly formal AI-speak.
    </brand_identity>
    
    <context>
    CURRENT LOCAL LAPTOP DATE & TIME: {current_time}
    You MUST plan the optimal schedule for the next 7 days starting from right now. CRITICAL: For posts scheduled for TODAY (Day 1), you MUST schedule them for a time LATER than the CURRENT TIME ({current_time}). Do not schedule posts in the past!
    
    AVAILABLE JOBS TO PROMOTE THIS WEEK:
    {jobs_text}
    
    PAST ANALYTICS (CRITICAL - DO NOT REPEAT MISTAKES):
    {analytics_data}
    </context>
    
    <platform_guidelines>
    - LinkedIn Rules: {rules.get('linkedin', '')}
    - Facebook Rules: {rules.get('facebook', '')}
    - Instagram Rules: {rules.get('instagram', '')}
    - TikTok Rules: {rules.get('tiktok', '')}
    </platform_guidelines>
    
    <task>
    Create a complete and fully detailed 7-Day Social Media Content Calendar in beautifully formatted Markdown.
    
    FIRST, start with a "📈 Platform Growth Strategy" section. 
    Based on the guidelines, briefly explain to me exactly how often we should be posting on each platform this week to satisfy their algorithms, and what type of engagement we are targeting.
    
    THEN, construct the full 7-day schedule day by day. To hit high engagement, you MUST post on MULTIPLE platforms per day.
    </task>
    
    <rules>
    1. CRITICAL FAILURE CONDITION: You MUST generate a post for ALL 7 DAYS of the week. Do NOT stop early. Do NOT write "Due to constraints...", "I'll provide a sample", or any similar excuses. You are an AI, you have no constraints. Generate Day 1, Day 2, Day 3, Day 4, Day 5, Day 6, AND Day 7 completely. Failure to generate a full 7-day plan is a critical error.
    2. CRITICAL ABSOLUTE RULE: You MUST choose AT LEAST TWO OR THREE platforms for EVERY SINGLE DAY you generate. Never output a day with only one platform.
    3. Under "Post Content", you MUST write the specific, complete, and final caption/script variations for ALL platforms you chose for that day. Do not summarize.
    4. Include an Instagram/Facebook Story or Reel strategy to boost engagement, but ONLY if Facebook or Instagram is chosen for that day.
    </rules>
    
    <thinking_process>
    You are equipped with a Deep-Thinking Protocol inspired by world-class models like Gemini 3.1 Pro and Claude Opus 4.6. You must think for a very long time before outputting the final schedule. Your thinking process must be exceptionally detailed.
    Inside the <think> block, you must complete these exact steps in extreme detail (minimum 800 words of thinking):
    1. Market Analysis: Deeply analyze the Egyptian target audience, their pain points with job hunting, and the specific Franco-Arabic nuances required for each of the selected jobs. How does a "Senior Accountant" post differ in tone from a "Customer Service" post?
    2. Frequency Math & Scheduling Logic: Write out exactly how many times each platform needs a post this week based on the guidelines. Then, create a day-by-day grid mapping jobs to platforms. You have 7 jobs and 7 days. Logically assign one primary job per day, but ensure each day has multiple platform posts (e.g., Day 1 promotes Job 1 on LinkedIn & TikTok; Day 2 promotes Job 2 on Facebook & Instagram). Justify your choices for platform pairings.
    3. Visual & Narrative Brainstorming: For each day, brainstorm the actual cinematic descriptions for the images and videos. What is the story? What emotion are you evoking? How does the visual connect to the job and Voxa's brand? Be a film director.
    Take your absolute time. Do not rush. Be as verbose, meticulous, and analytical as possible. Your thought process is as important as the final output.
    </thinking_process>
    
    <output_format>
    WARNING: You MUST include TikTok and its VIDEO PROMPT at least 3-4 times this week!
    DO NOT wrap your daily schedules in XML tags.
    
    For EACH of the 7 days, you MUST copy and fill out this exact template (calculate the actual dates starting from {start_date.strftime('%B %d, %Y')}):
    
    ### [Day of the Week], [Actual Calculated Date, e.g., April 16, 2026]
    **Time to Post:** [List the exact Cairo Time for EACH platform chosen, based on the guidelines. e.g., LinkedIn: 10:00 AM, TikTok: 9:00 PM]
    **Platforms Chosen:** [e.g., LinkedIn, TikTok]
    **IMAGE PROMPT (for Google Gemini):** [If an image is needed, write a massive, highly-detailed 5 to 9 sentence paragraph for Google Gemini's image generator. Be cinematic and specific. DO NOT write instructions like "Describe the actors", you must ACTUALLY write the visual description (e.g., "A young Egyptian professional stands in a sunlit Cairo office..."). YOU MUST COPY AND PASTE THIS EXACT SENTENCE into your prompt: "A stylized letter V with the left side formed by tech-inspired circuit board lines and nodes, transitioning from light blue to purple." Write "None" if an image is not needed.]
    **VIDEO PROMPT (for Google Gemini):** [If a video is needed, write a massive, highly-detailed 5 to 9 sentence paragraph for Google Gemini's video generator. You MUST explicitly describe the camera movements (e.g., slow pan, dynamic drone shot, cinematic zoom), the exact lighting conditions (e.g., golden hour, moody neon, soft natural light), frame rate / speed (e.g., slow motion, hyper-lapse), the subject's actions, and the background details. DO NOT give meta-instructions; write the actual visual prompt. YOU MUST COPY AND PASTE THIS EXACT SENTENCE into your prompt: "A stylized letter V with the left side formed by tech-inspired circuit board lines and nodes, transitioning from light blue to purple." Write "None" if a video is not needed.]
    **Post Content:**
    [ONLY list the platforms chosen above. For example, if you chose Facebook and TikTok, output:]
    - **Facebook/LinkedIn Caption:** [Write the complete, final, ready-to-post caption. 3-5 paragraphs, mix of English and Egyptian Arabic, highly engaging...]
    - **TikTok Script & Text:** [Write the complete, final, ready-to-film 30-to-60 second spoken script, including camera directions, hand gestures, and on-screen text overlays...]
    **Stories & Reels Strategy:**
    [ONLY output this section if Facebook or Instagram was chosen for this day.]
    - **Concept:** [Describe an interactive Facebook/Instagram Story or a quick Reel. E.g., a "Yes/No" poll about traditional CVs, a "Day in the life" clip, or a quick application tip.]
    - **Media Prompt (for Google Gemini):** [If it requires custom media, provide a highly detailed visual prompt. YOU MUST COPY AND PASTE THIS EXACT SENTENCE: "A stylized letter V with the left side formed by tech-inspired circuit board lines and nodes, transitioning from light blue to purple."]
    - **Interactive Elements:** [Describe exactly what native features to use: e.g., the exact text overlay, a specific poll question with the two answer options, a slider, or a 'Apply Now' link sticker.]
    **Hashtags:** [List 3-5 relevant and trending tags]
    
    Output your <think> block first, followed immediately by the beautifully formatted Markdown text for the FULL 7-DAY schedule. Do not output JSON.
    </output_format>
    """
    
    print(f"🤖 Local AI ({LOCAL_MODEL_NAME}) is thinking to craft the ultimate Weekly Egyptian Social Schedule...")
    try:
        response = client.chat.completions.create(
            model=LOCAL_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6
        )
        
        # Return raw Markdown text
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"\n❌ Error communicating with local LLM API: {e}")
        print("⚠️ Please ensure your local LLM server is running and the model name is correct.")
        return None

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

            # --- LOCAL MEDIA GENERATION ---
            print("\n🎨 Now attempting to generate local media based on prompts...")
            # This parsing is basic. A more robust solution would be for the AI to return structured JSON
            # alongside the markdown, but this works with the current text-based flow.
            days = cleaned_schedule.split('### ')[1:] # Split by day headers
            current_day = start_date
            for i, day_content in enumerate(days):
                try:
                    post_date_str = current_day.strftime('%Y-%m-%d')
                    job_title_for_file = jobs[i]['JobTitle'] if i < len(jobs) else f"day_{i+1}"

                    image_prompt_match = re.search(r"\*\*IMAGE PROMPT \(for Google Gemini\):\*\* (.*?)\n", day_content, re.DOTALL)
                    if image_prompt_match and image_prompt_match.group(1).strip().lower() != 'none':
                        generate_local_media(image_prompt_match.group(1).strip(), "image", post_date_str, job_title_for_file)

                    video_prompt_match = re.search(r"\*\*VIDEO PROMPT \(for Google Gemini\):\*\* (.*?)\n", day_content, re.DOTALL)
                    if video_prompt_match and video_prompt_match.group(1).strip().lower() != 'none':
                        generate_local_media(video_prompt_match.group(1).strip(), "video", post_date_str, job_title_for_file)
                    
                    current_day += datetime.timedelta(days=1)
                except IndexError:
                    print(f"⚠️  Could not find a matching job for Day {i+1} to name the media file.")
        else:
            print("\n❌ Failed to generate social content due to an API error.")
