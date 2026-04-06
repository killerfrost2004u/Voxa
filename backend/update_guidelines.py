import os
import json
import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("No API key found. Please check your .env file.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

def update_platform_rules():
    current_date = datetime.date.today().strftime("%B %Y")
    print(f"🔍 Fetching the absolute latest social media algorithms and guidelines for {current_date}...")
    
    prompt = f"""
    Act as a Master Social Media & SEO Strategist operating in {current_date}. 
    I need the most up-to-date (current) algorithm rules, character limits, hashtag best practices, and spam-triggers to avoid for recruitment/job postings on 4 platforms.
    
    Focus heavily on:
    - Exact number of recommended hashtags.
    - Link placement (e.g., Instagram doesn't allow clickable links in captions).
    - Tone and visual spacing.
    
    Output ONLY a valid JSON object in this exact format:
    {{
        "linkedin": "Guidelines here...",
        "facebook": "Guidelines here...",
        "instagram": "Guidelines here...",
        "tiktok": "Guidelines here..."
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        result_text = response.text.strip().removeprefix("```json").removesuffix("```").strip()
        
        with open("platform_guidelines.json", "w", encoding="utf-8") as f:
            f.write(result_text)
            
        print("✅ Successfully updated platform_guidelines.json! The Social Bot will now follow these new rules.")
    except Exception as e:
        print(f"\n❌ Error communicating with Gemini API: {e}")
        if "429" in str(e) or "Quota" in str(e):
            print("⚠️ You have exceeded your Gemini API free quota or rate limit.")
            print("⏳ Please wait a minute and try again, or check your dashboard at https://aistudio.google.com/")

if __name__ == "__main__":
    update_platform_rules()