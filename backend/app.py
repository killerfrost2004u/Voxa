from flask import Flask, render_template, request, jsonify
import time
import os

app = Flask(__name__)

# Mock Database for Jobs
JOBS = [
    {"id": 1, "title": "Call Center Agent", "company": "Vodafone UK", "salary": "18,500 EGP", "location": "Cairo",
     "type": "On-site"},
    {"id": 2, "title": "Python Developer", "company": "Voxa AI", "salary": "35,000 EGP", "location": "Remote",
     "type": "Remote"},
    {"id": 3, "title": "Sales Representative", "company": "Mountain View", "salary": "12,000 EGP + Comm",
     "location": "Giza", "type": "On-site"}
]


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/jobs')
def jobs():
    return render_template('jobs.html', jobs=JOBS)


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/api/analyze', methods=['POST'])
def analyze_audio():
    # Simulate processing delay
    time.sleep(2)

    # 1. Get the file (we will save this to disk later)
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio_file = request.files['audio']
    # filename = secure_filename(audio_file.filename)
    # audio_file.save(os.path.join('uploads', filename))

    # 2. Return Mock Analysis (Same as before)
    return jsonify({
        "language_level": "B2 (Upper Intermediate)",
        "sentiment": "Confident",
        "summary": "Candidate demonstrated clear communication skills and mentioned 2 years of experience.",
        "recommendation": "Interview"
    })


if __name__ == '__main__':
    app.run(debug=True)