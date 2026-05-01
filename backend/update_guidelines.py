import os
import json
import datetime
import re
import time
from openai import OpenAI
from tqdm import tqdm
import requests
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()

# Configure this to match your local LLM server (Ollama, LM Studio, etc.)
# Default below is for Ollama. For LM Studio, you might use http://localhost:1234/v1
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "phi3:mini") 

client = OpenAI(base_url=LOCAL_LLM_URL, api_key="local-no-key-required")

def get_platform_task(platform, task_key, task_desc, current_time):
    print(f"\n   -> Querying LLM for {platform} - Task: {task_key}...")
    analytics_file = os.path.join(os.path.dirname(__file__), "past_analytics.json")
    analytics_data = "No past analytics found."
    if os.path.exists(analytics_file):
        with open(analytics_file, "r", encoding="utf-8") as f:
            analytics_data = f.read()
            
    prompt = f"""
    <role>
    You are a Master Social Media Algorithm Expert and Elite SEO Strategist operating on {current_time}. Your absolute specialty is the Egyptian digital landscape.
    </role>
    
    <task>
    Generate an ULTRA-DETAILED, highly analytical report for exactly ONE specific aspect of {platform}. 
    Your response MUST be massive (at least 3-4 paragraphs long), containing specific actionable data, exact percentages, times, and rules.
    Your primary target demographic is EGYPT (Cairo Time/EET). Do NOT write short summaries.
    
    Your specific focus for this generation is:
    {task_desc}
    
    <voxa_past_performance_memory>
    Here is the historical analytics data from our previous campaigns. YOU MUST adapt your guidelines to incorporate these lessons (double down on what worked, explicitly forbid what failed):
    {analytics_data}
    </voxa_past_performance_memory>
    </task>
    
    <thinking_process>
    Before writing the final JSON, you MUST exhaustively plan your work inside <think>...</think> tags. 
    Analyze the current state of {platform}'s algorithm for the Egyptian market based ONLY on the specific focus above.
    </thinking_process>

    <output_format>
    After your <think> block, output ONLY the massive detailed response as plain text or markdown.
    Do NOT output a JSON object. Do NOT wrap your response in JSON formatting. 
    Just provide the raw, highly detailed text response directly.
    </output_format>
    """
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=LOCAL_MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # 1. Strip the entire <think> block first
            result_text = re.sub(r'<think>.*?</think>\s*', '', result_text, flags=re.DOTALL)
            
            # 2. Strip ALL remaining XML/HTML-like tags (e.g., <output_format>, </think>, <p>, <|report|>)
            result_text = re.sub(r'<[^>]+>', '', result_text)
            
            # 3. Strip markdown code block backticks (e.g., ```markdown, ```plaintext)
            result_text = re.sub(r'```[a-zA-Z]*\n?', '', result_text)
            
            result_text = result_text.strip()
            
            if not result_text:
                raise ValueError("No text found in the AI response outside of <think> tags.")
                
            print(f"   ✅ Successfully generated {task_key} for {platform}.")
            return result_text
        except Exception as e:
            print(f"   ⚠️ Attempt {attempt + 1} failed for {platform} ({task_key}): {e}")
            if attempt < max_retries - 1:
                print("   Cooling down and retrying...")
                time.sleep(3) # Give local hardware a brief pause
            
    print(f"   ❌ Failed to generate {task_key} for {platform} after {max_retries} attempts.")
    return None

def fetch_live_social_analytics():
    """
    Fetches live metrics directly from social APIs (Meta Graph API & TikTok API).
    """
    analytics_data = {}
    analytics_file = os.path.join(os.path.dirname(__file__), "past_analytics.json")
    
    # --- Facebook Analytics ---
    fb_page_id = os.getenv("FB_PAGE_ID")
    fb_access_token = os.getenv("FB_ACCESS_TOKEN")
    
    if fb_page_id and fb_access_token:
        print("📡 Fetching live analytics directly from Meta Graph API...")
        try:
            url = f"https://graph.facebook.com/v19.0/{fb_page_id}?fields=name,followers_count,fan_count&access_token={fb_access_token}"
            response = requests.get(url, timeout=15)
            if response.status_code == 200:
                analytics_data["facebook"] = response.json()
                print("   ✅ Successfully fetched direct data from Facebook!")
            else:
                print(f"   ⚠️ Meta API returned status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"   ⚠️ Could not fetch from Meta API: {e}")
    else:
        print("📡 No FB_PAGE_ID or FB_ACCESS_TOKEN found in .env. Skipping Facebook.")

    # --- TikTok Analytics ---
    tiktok_access_token = os.getenv("TIKTOK_ACCESS_TOKEN")
    
    if tiktok_access_token:
        print("📡 Fetching live analytics directly from TikTok API...")
        try:
            url = "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count"
            headers = {"Authorization": f"Bearer {tiktok_access_token}"}
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                analytics_data["tiktok"] = response.json().get("data", {})
                print("   ✅ Successfully fetched direct data from TikTok!")
            else:
                print(f"   ⚠️ TikTok API returned status {response.status_code}: {response.text}")
        except Exception as e:
            print(f"   ⚠️ Could not fetch from TikTok API: {e}")
    else:
        print("📡 No TIKTOK_ACCESS_TOKEN found in .env. Skipping TikTok.")

    # --- Save Combined Data ---
    if analytics_data:
        with open(analytics_file, "w", encoding="utf-8") as f:
            json.dump(analytics_data, f, indent=4)
        print("   ✅ Successfully updated past_analytics.json with live data!")

def update_platform_rules():
    current_time = datetime.datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
    fetch_live_social_analytics()
    print(f"🔍 Fetching the absolute latest social media algorithms and guidelines for {current_time}...")
    print("⏳ Running sequentially per platform AND per task to accommodate hardware limits and maximize detail...")
    
    platforms = ["LinkedIn", "Facebook", "Instagram", "TikTok"]
    tasks = {
        "guidelines_and_anti_spam": "The guidelines and anti-spam rules: What exactly to post and what NOT to post so we don't get banned, flagged as a bot, or shadowbanned. Detail exactly what robotic, AI-sounding words to avoid (e.g., 'delve', 'testament', 'revolutionize', 'elevate', 'unleash', 'in today's fast-paced world'). Explain exactly how to write using natural Egyptian-English phrasing, Franco-Arabic slang, and authentic human error (uneven spacing, casual punctuation).",
        "reach_and_growth_tactics": "Reach and growth tactics: The best strategies right now to maximize organic reach, drive website traffic, and gain followers. Massive detail on what the algorithm favors right now to push content viral. Specific engagement hacks, visual hooks, and psychological triggers for the Egyptian audience.",
        "posting_schedule": "Posting schedule: The exact timing of posts (daily, weekly frequency) and the best hours to post for the Egyptian audience (Cairo Time/EET). Detail exactly how many seconds to pause between posts, and how to format links so platforms don't throttle the reach."
    }
    
    master_guidelines = {}
    # Create a flat list of all jobs to do for the progress bar
    all_jobs = [(p, tk, td) for p in platforms for tk, td in tasks.items()]
    
    # Use tqdm to iterate over the flat list, creating a progress bar
    for platform, task_key, task_desc in tqdm(all_jobs, desc="Generating Guidelines", unit="task"):
        if platform.lower() not in master_guidelines:
            master_guidelines[platform.lower()] = {}

        result = get_platform_task(platform, task_key, task_desc, current_time)
        if result:
            master_guidelines[platform.lower()][task_key] = result
        else:
            master_guidelines[platform.lower()][task_key] = "Failed to generate detailed rules for this section. Please follow standard best practices."
        
    if master_guidelines:
        file_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(master_guidelines, f, indent=4)
            
        print("\n✅ Successfully updated platform_guidelines.json! The Social Bot will now follow these new rules.")
    else:
        print("\n❌ All generation attempts failed. Please ensure your local LLM server is running.")

if __name__ == "__main__":
    update_platform_rules()