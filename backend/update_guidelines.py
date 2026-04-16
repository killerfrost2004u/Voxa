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
LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "phi3:mini") 

client = OpenAI(base_url=LOCAL_LLM_URL, api_key="local-no-key-required")

def update_platform_rules():
    current_time = datetime.datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
    print(f"🔍 Fetching the absolute latest social media algorithms and guidelines for {current_time}...")
    
    prompt = f"""
    <role>
    You are a Master Social Media Algorithm Expert and Elite SEO Strategist operating on {current_time}. Your absolute specialty is the Egyptian digital landscape. Your analytical depth is comparable to top-tier models like Gemini 3.1 Pro.
    </role>
    
    <task>
    Generate an ULTRA-DETAILED, highly analytical master JSON report. EVERY single string value inside the JSON MUST be massive (at least 3-4 paragraphs long), containing specific actionable data, exact percentages, times, and rules. Do NOT write short summaries.
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
    You are equipped with a Deep-Thinking Protocol. Before writing the final JSON, you MUST exhaustively plan your work inside <think>...</think> tags. Your thinking must be exceptionally verbose and demonstrate a deep understanding of social media algorithms.
    Inside the <think> block (minimum 1000 words), analyze the current state of each platform's algorithm (LinkedIn, Facebook, Instagram, TikTok) for the Egyptian market. Discuss recent changes, content types being prioritized (e.g., short-form video, carousels, text posts), and the specific signals that trigger bot detection. Be meticulous, and analytical in your thinking.
    </thinking_process>

    <output_format>
    After your <think> block, you must output ONLY a valid JSON object. Do not include markdown formatting like ```json. Do not include the <think> block inside the JSON. Make sure there are NO trailing commas.
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
        
        # Strip the <think> block first so any curly braces inside don't confuse the regex
        result_text = re.sub(r'<think>.*?</think>\s*', '', result_text, flags=re.DOTALL)
        
        # Safely extract ONLY the JSON object using regex
        match = re.search(r'\{.*\}', result_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in the AI response.")
            
        json_str = match.group(0)
        
        # Clean up common JSON errors from small models (like trailing commas)
        json_str = re.sub(r',\s*([\}\]])', r'\1', json_str)
        
        try:
            # Validate that it parses correctly before saving it
            parsed_json = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"\n❌ AI generated invalid or incomplete JSON: {e}")
            print("   This often happens if the model's response was cut off due to token limits.")
            
            if len(json_str) > 200:
                print("\n   Here's the tail end of the response where the error likely occurred:")
                print("   ..." + json_str[-200:])
            else:
                print("\n   Raw extracted text that failed to parse:")
                print(json_str)
            
            print("\n   💡 Recommendation: Try using a model with a larger context window or a less verbose prompt if this issue persists.")
            return
        
        file_path = os.path.join(os.path.dirname(__file__), "platform_guidelines.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=4)
            
        print("✅ Successfully updated platform_guidelines.json! The Social Bot will now follow these new rules.")
    except Exception as e:
        print(f"\n❌ Error communicating with Local LLM: {e}")
        print("⚠️ Please ensure your local LLM server (Ollama/LM Studio) is running.")

if __name__ == "__main__":
    update_platform_rules()