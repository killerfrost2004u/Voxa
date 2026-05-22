import re
import json
import time
import torch
import librosa
import google.generativeai as genai
from abc import ABC, abstractmethod
from transformers import AutoProcessor, Qwen2AudioForConditionalGeneration, BitsAndBytesConfig

# Global LALM instances
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

def parse_ai_response(ai_text: str) -> dict:
    """Isolates the JSON parsing logic for testing and resilience."""
    if not ai_text:
        return {}
    match = re.search(r'\{.*\}', ai_text, re.DOTALL)
    if match:
        json_str = match.group().replace('```json', '').replace('```', '').strip()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass
    return {"overall_level": "B1", "overall_score": 60, "summary": "Format failed."}

PROMPT_TEXT = """
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
1. THE C1+ EXECUTIVE (Score 86-95): High-speed, highly confident, native-like rhythm, uses industry jargon smoothly. EXTREMELY IMPORTANT: If they possess this level of fluency, IGNORE minor grammar or preposition slips (like 'get it sorted out' or 'negotiating in the deals'). Their Overall Grade MUST be C1+.
2. THE C1 FLUENT STORYTELLER (Score 76-85): Speaks fluently, clearly, and confidently, but has a noticeable regional accent and makes direct translation errors (e.g., 'they hold the company', 'in a university'). Because fluency and pronunciation are the top priority, their Overall Grade MUST be C1. Do NOT drop them to B2.
3. THE SCRIPT READER PENALTY (Score 51-65): LISTEN CAREFULLY TO THE INTONATION. If a candidate has absolutely flawless grammar and rich vocabulary but sounds like they are reading from a prepared piece of paper (monotonous, rhythmic pacing, lack of spontaneous 'thinking' pauses, unnatural breathing), you MUST penalize them. True C1 requires spontaneous thought. If they are reading, their Overall Grade MUST be B2 (max score 65), even if their grammar is C2 level. You MUST mention that they sound rehearsed in the summary.
4. THE B1+ GRAMMAR DROPPER (Score 41-50): If the candidate has a good accent and confidence, but consistently drops foundational verbs ('this my last year', 'I looking forward') or articles, their Overall Grade MUST be capped at B1+. 

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

class IAudioAnalyzer(ABC):
    @abstractmethod
    def analyze(self, file_path: str) -> dict:
        pass

class GeminiAnalyzer(IAudioAnalyzer):
    def analyze(self, file_path: str) -> dict:
        print(f"⏳ Uploading media to Gemini API: {file_path}")
        try:
            forced_mime = "audio/mp4" if file_path.lower().endswith(".mp4") else None
            audio_file = genai.upload_file(path=file_path, mime_type=forced_mime)

            print(f"⏳ Waiting for Google servers to process media...", end="")
            while audio_file.state.name == "PROCESSING":
                print(".", end="", flush=True)
                time.sleep(2)
                audio_file = genai.get_file(audio_file.name)

            if audio_file.state.name == "FAILED":
                print("\n❌ Google servers failed to process this file format.")
                return {}
                
            print("\n🧠 Media processed! Gemini is analyzing...")

            model = genai.GenerativeModel('gemini-2.5-flash')

            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = model.generate_content([audio_file, PROMPT_TEXT])
                    audio_file.delete() 
                    return parse_ai_response(response.text)
                except Exception as e:
                    error_msg = str(e)
                    print(f"❌ Gemini API Error (Attempt {attempt+1}): {error_msg}")
                    if "429" in error_msg or "Quota" in error_msg:
                        print("⏳ Rate limit hit. Waiting 30s...")
                        time.sleep(30) 
                    else:
                        break 

            audio_file.delete()
            print("❌ All AI attempts failed.")
            return {}

        except Exception as e:
            print(f"❌ Gemini Setup Error: {e}")
            return {}

class LocalLALMAnalyzer(IAudioAnalyzer):
    def analyze(self, file_path: str) -> dict:
        print(f"🧠 Local LALM is evaluating {file_path} natively...")
        try:
            proc, mod = get_audio_model()
            
            print("🔊 Reading audio file into tensors...")
            audio_arr, sr = librosa.load(file_path, sr=proc.feature_extractor.sampling_rate)
            
            conversation = [
                {"role": "user", "content": [
                    {"type": "audio", "audio_url": "local_audio.wav"},
                    {"type": "text", "text": PROMPT_TEXT}
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
            return parse_ai_response(response)
            
        except Exception as e:
            print(f"❌ Local LALM Error: {e}")
            return {}

class AIAnalyzerFactory:
    @staticmethod
    def get_analyzer(analyzer_type="gemini") -> IAudioAnalyzer:
        if analyzer_type == "gemini":
            return GeminiAnalyzer()
        elif analyzer_type == "local":
            return LocalLALMAnalyzer()
        raise ValueError(f"Unknown analyzer type: {analyzer_type}")
