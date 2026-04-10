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
    Generate an ULTRA-DETAILED, highly analytical master JSON report on the absolute latest algorithm rules, shadowban triggers, and engagement hacks for LinkedIn, Facebook, Instagram, and TikTok. 
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
    You must output ONLY a valid JSON object. You are equipped with a Deep-Thinking Protocol. You MUST think step-by-step inside an exhaustive "_thinking" JSON key BEFORE you output the rest of the JSON. Inside "_thinking", analyze the Egyptian market, calculate the exact best posting times in Cairo, and map out heavy strategies to avoid bot-detection. Be verbose, meticulous, and analytical in your thinking.
    After your <thinking> block, you must output ONLY a valid JSON object. Do not include markdown formatting like ```json.
    The JSON must exactly match this structure:
    {{
        "_thinking": "Brainstorm your massive analysis here first...",
        "linkedin": {{
            "posting_frequency_and_egypt_times": "Massive detail on exact Cairo times and days...",
            "algorithmic_hooks": "Massive detail on what the algorithm favors right now...",
            "anti_ai_and_spam_rules": "Massive detail on avoiding bot bans and link throttling...",
            "tone_and_formatting": "Massive detail on spacing, character limits, and hashtag strategy..."
        }},
        "facebook": {{
            "posting_frequency_and_egypt_times": "...",
            "algorithmic_hooks": "...",
            "anti_ai_and_spam_rules": "...",
            "tone_and_formatting": "..."
        }},
        "instagram": {{
            "posting_frequency_and_egypt_times": "...",
            "algorithmic_hooks": "...",
            "anti_ai_and_spam_rules": "...",
            "tone_and_formatting": "..."
        }},
        "tiktok": {{
            "posting_frequency_and_egypt_times": "...",
            "algorithmic_hooks": "...",
            "anti_ai_and_spam_rules": "...",
            "tone_and_formatting": "..."
        }}
    }}
    </output_format>
    """
    
    try:
        response = client.chat.completions.create(
            model=LOCAL_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
            temperature=0.7
        )
        result_text = response.choices[0].message.content.strip().removeprefix("```json").removesuffix("```").strip()
        
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
            f.write(result_text)
            json.dump(parsed_json, f, indent=4)
            
        print("✅ Successfully updated platform_guidelines.json! The Social Bot will now follow these new rules.")
    except Exception as e:
        print(f"\n❌ Error communicating with Local LLM: {e}")
        print("⚠️ Please ensure your local LLM server (Ollama/LM Studio) is running.")

if __name__ == "__main__":
    update_platform_rules()