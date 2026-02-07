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
        # 1. Fetch the CSV
        encoded_name = urllib.parse.quote(SHEET_NAME)
        url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"

        print(f"📥 Fetching: {url}")
        response = requests.get(url)
        response.raise_for_status()

        # 2. Parse CSV
        csv_content = response.content.decode('utf-8-sig')
        # Read all rows into a list of lists
        raw_data = list(csv.reader(io.StringIO(csv_content)))

        # 3. TRANSPOSE DATA (Flip Rows and Columns)
        # Zip converts columns to rows
        transposed_data = list(map(list, itertools.zip_longest(*raw_data, fillvalue="")))

        print(f"🔄 Transposed Data: Found {len(transposed_data)} columns (potential jobs).")

        jobs = []

        # 4. Iterate through the NEW rows (which were originally columns)
        # We start from index 1 because index 0 is likely the labels ("Company Name", "Job Title", etc.)

        # Let's verify which index holds what based on your Raw Data dump:
        # Original Row 1 = Company Name -> Now Column 1
        # Original Row 2 = Job Title -> Now Column 2
        # Original Row 6 = Salary -> Now Column 6
        # Original Row 8 = Location -> Now Column 8

        for i, col in enumerate(transposed_data):
            if i == 0: continue  # Skip the headers column (the one that says "Company Name", "Job Title"...)

            # Extract fields by their ORIGINAL Row Index
            # Safety check: ensure column has enough rows
            if len(col) < 10: continue

            company = col[1].strip()  # Row 1
            title = col[2].strip()  # Row 2
            salary = col[6].strip()  # Row 6
            location = col[8].strip()  # Row 8
            offer_text = col[10].strip()  # Row 10 (Offer Details)

            # Skip empty columns
            if not company or not title:
                continue

            jobs.append({
                "id": i,
                "title": title,
                "company": company,
                "location": location if location else "Remote",
                "salary": salary if salary else "Competitive",
                "type": "Full Time",  # Default
                "description": offer_text[:100] + "...",
                "logo": (company[:2]).upper()
            })

        print(f"📤 Returning {len(jobs)} jobs.")
        return jsonify(jobs)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)