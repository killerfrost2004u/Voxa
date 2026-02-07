from flask import Flask, jsonify
from flask_cors import CORS
import requests
import csv
import io
import urllib.parse
import itertools

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
SERVER_NAME = r'localhost\SQLEXPRESS'
SHEET_ID = "1oYDMBIXMCrIdfDbf-EFhuPal0NYo5jphkkX3AWYonjU"
SHEET_NAME = "Wolves Master sheet 2"


@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    try:
        # 1. Fetch CSV
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"

        print(f"📥 Fetching sheet data...")
        response = requests.get(url)
        response.raise_for_status()

        # 2. Parse & Transpose
        csv_content = response.content.decode('utf-8-sig')
        raw_data = list(csv.reader(io.StringIO(csv_content)))
        transposed_data = list(map(list, itertools.zip_longest(*raw_data, fillvalue="")))

        jobs = []

        # 3. Extract Data (Mapping columns based on your sheet layout)
        for i, col in enumerate(transposed_data):
            if i == 0: continue  # Skip label column
            if len(col) < 10: continue

            # Map Rows to Variables
            company = col[1].strip()  # Row 1
            title = col[2].strip()  # Row 2
            reqs_1 = col[3].strip()  # Row 3 (Account Type)
            hours = col[4].strip()  # Row 4
            salary = col[6].strip()  # Row 6
            reqs_2 = col[7].strip()  # Row 7 (Who can apply)
            location = col[8].strip()  # Row 8
            training = col[9].strip()  # Row 9
            full_desc = col[10].strip()  # Row 10 (Full Offer)

            if not company or not title: continue

            # Combine requirements for cleaner display
            full_requirements = f"{reqs_1}\n{reqs_2}"

            jobs.append({
                "id": i,
                "title": title,
                "company": company,
                "location": location if location else "Remote",
                "salary": salary if salary else "Competitive",
                "type": "Full Time",
                "hours": hours,
                "training": training,
                "requirements": full_requirements,
                "description": full_desc if full_desc else "No description provided.",
                "logo": (company[:2]).upper()
            })

        print(f"📤 Sent {len(jobs)} jobs with full details.")
        return jsonify(jobs)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)