# 🐺 Voxa (HR) - AI-Powered Recruitment & Voice Analysis

Voxa is an end-to-end automated recruitment platform designed to revolutionize how companies screen candidates for communication-heavy roles. Instead of reading traditional CVs, Voxa allows candidates to apply using **Voice Notes**, which are then processed by a native multimodal AI to act as an expert technical recruiter.

## ✨ Key Features

- **🎙️ Voice-First Applications:** Candidates apply by recording a short audio introduction directly on the platform.
- **🧠 AI Technical Recruiter:** Uses native multimodal AI to listen to the audio (no speech-to-text middleman needed) and grades the candidate based on CEFR standards:
  - Overall Proficiency (A1 - C2)
  - Grammar, Fluency, and Pronunciation breakdowns
  - Blind Accent Profiling (e.g., "Clear Egyptian", "Native-like")
  - "Recruiter's Ear" calibration to detect script-reading vs. spontaneous storytelling.
- **💼 Dynamic Job Management:** A full CRUD admin dashboard backed by SQL Server to create, hold, or delete job postings.
- **📱 Automated WhatsApp Integration:** Integrated with Twilio to automatically send beautifully formatted, dynamic job offers (or alternative role offers/rejections) directly to the candidate's WhatsApp with a single click.
- **🔐 Secure Authentication:** Bcrypt-hashed passwords for admin/user portal access.

## 🚀 The Engineering Journey & AI Architecture

Building the AI pipeline for Voxa was an iterative process to find the perfect balance between accuracy and computational feasibility:

1.  **V1: Whisper + Llama 3**
    - _Approach:_ Transcribe audio using OpenAI's Whisper, then feed the text to Llama 3 for grading.
    - _Result:_ Failed. The accuracy was poor because Llama 3 only saw text. It couldn't hear hesitation, accent clarity, or rhythm, leading to highly inaccurate fluency grades.
2.  **V2: Qwen-Audio-7B**
    - _Approach:_ Switched to a local native audio-language model to process the sound waves directly.
    - _Result:_ Accuracy improved massively. It could hear the nuances in the voice. However, running a 7B audio model locally crushed my computational resources and caused severe latency.
3.  **V3: Cloud AI APIs (Gemini 2.5 Flash)**
    - _Approach:_ Shifted to a lightweight Cloud API using Google's Gemini 2.5 Flash, which natively supports audio processing.
    - _Result:_ The sweet spot. Blazing fast inference, zero local compute overhead, and highly susceptible to deep prompt-engineering (Persona Calibration) to think exactly like a senior HR recruiter.

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Python, Flask, PyODBC (SQL Server)
- **AI Engine:** Google Gemini 2.5 Flash API (Native Audio)
- **Integrations:** Twilio API (WhatsApp Sandbox)
- **Database:** Microsoft SQL Server

## ⚙️ Local Setup Instructions

1. **Clone the repository**
   ```bash
   git clone [https://github.com/killerfrost2004u/Voxa.git](https://github.com/killerfrost2004u/Voxa.git)
   cd Voxa
   ```
