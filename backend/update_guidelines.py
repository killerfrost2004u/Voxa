import os
import json
import datetime
import re
from openai import OpenAI
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()

# Configure this to match your local LLM server (Ollama, LM Studio, etc.)
# Default below is for Ollama. For LM Studio, you might use http://localhost:1234/v1
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/v1")
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "llama3.2") 

client = OpenAI(base_url=LOCAL_LLM_URL, api_key="local-no-key-required")

def update_platform_rules():
    current_date = datetime.date.today().strftime("%B %Y")
    print(f"🔍 Fetching the absolute latest social media algorithms and guidelines for {current_date}...")
    
    prompt = f"""
    <role>
    You are a Master Social Media Algorithm Expert and Elite SEO Strategist operating in {current_date}. Your absolute specialty is the Egyptian digital landscape.
    </role>
    
    <task>
    Generate an ULTRA-DETAILED, highly analytical master JSON report.
    You MUST clearly separate the core platform guidelines from the high-reach/viral engagement tactics. 
    Your primary target demographic is EGYPT (Cairo Time/EET).
    Do NOT write short summaries. Detail EXACTLY when to post in Egypt for maximum reach, what specific content formats to use, and how to avoid being flagged as a bot or spam.
    </task>
    
    <anti_ai_rules>
    - CRITICAL: Detail exactly what robotic, AI-sounding words to avoid (e.g., 'delve', 'testament', 'revolutionize', 'elevate', 'unleash', 'in today's fast-paced world').
    - Explain exactly how to write using natural Egyptian-English phrasing, Franco-Arabic slang, and authentic human error (uneven spacing, casual punctuation) so platforms do not shadowban our posts for being automated.
    - Detail exactly how many seconds to pause between posts, and how to format links so platforms don't throttle the reach.
    </anti_ai_rules>
    
    <thinking_process>
    You are equipped with a Deep-Thinking Protocol. Before writing the final JSON, you MUST exhaustively plan your work inside <thinking>...</thinking> tags. 
    Inside the <thinking> block, analyze the Egyptian market, calculate the exact best posting times in Cairo, and map out heavy strategies to avoid bot-detection. Be verbose, meticulous, and analytical in your thinking.
    </thinking_process>

    <output_format>
    After your <thinking> block, you must output ONLY a valid JSON object. Do not include markdown formatting like ```json. Do not include the <thinking> block inside the JSON.
    The JSON must exactly match this structure:
    {{
        "linkedin": {{
            "core_guidelines": "Massive detail on exact Cairo times, days, spacing, character limits, and hashtag strategy...",
            "anti_spam_and_bot_rules": "Massive detail on avoiding bot bans, link throttling, and robotic words...",
            "high_reach_tactics": "Massive detail on what the algorithm favors right now to push content viral...",
            "engagement_hacks": "Specific psychological hooks, formatting tricks, and comment strategies for the Egyptian audience..."
        }},
        "facebook": {{
            "core_guidelines": "...",
            "anti_spam_and_bot_rules": "...",
            "high_reach_tactics": "...",
            "engagement_hacks": "..."
        }},
        "instagram": {{
            "core_guidelines": "...",
            "anti_spam_and_bot_rules": "...",
            "high_reach_tactics": "...",
            "engagement_hacks": "..."
        }},
        "tiktok": {{
            "core_guidelines": "...",
            "anti_spam_and_bot_rules": "...",
            "high_reach_tactics": "...",
            "engagement_hacks": "..."
        }}
    }}
    </output_format>
    """
    
    try:
        response = client.chat.completions.create(
            model=LOCAL_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Safely extract ONLY the JSON object using regex
        match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in the AI response.")
            
        json_str = match.group(0)
        
        # Validate that it parses correctly before saving it
        parsed_json = json.loads(json_str)
        
        file_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=4)
            
        print("✅ Successfully updated platform_guidelines.json! The Social Bot will now follow these new rules.")
    except Exception as e:
        print(f"\n❌ Error communicating with Local LLM: {e}")
        print("⚠️ Please ensure your local LLM server (Ollama/LM Studio) is running.")

if __name__ == "__main__":
    update_platform_rules()