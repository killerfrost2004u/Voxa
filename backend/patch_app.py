import sys
import re

def main():
    file_path = 'app.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add SavedJobs table to init_db
    init_db_insertion = '''
            # --- AUTH MIGRATIONS ---
            c.execute('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsVerified" BOOLEAN DEFAULT TRUE')
            
            # --- SAVED JOBS TABLE ---
            c.execute("""
                CREATE TABLE IF NOT EXISTS "SavedJobs" (
                    "ID" SERIAL PRIMARY KEY,
                    "UserEmail" TEXT,
                    "JobID" INTEGER,
                    "SavedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE("UserEmail", "JobID")
                )
            """)
'''
    content = content.replace(
        "            # --- AUTH MIGRATIONS ---\n            c.execute('ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"IsVerified\" BOOLEAN DEFAULT TRUE')",
        init_db_insertion.strip('\n')
    )

    # 2. Update /api/jobs GET
    jobs_get_orig = """@app.route('/api/jobs', methods=['GET'])
def get_public_jobs():
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(\"\"\"
            SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus" 
            FROM "Jobs" j
            LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
            WHERE j."Status" = 'Active' 
            AND (c."Status" IS NULL OR c."Status" = 'Active')
        \"\"\")
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()"""

    jobs_get_new = """@app.route('/api/jobs', methods=['GET'])
def get_public_jobs():
    try:
        email = request.args.get('email')
        conn = get_db_connection()
        c = conn.cursor()
        if email:
            c.execute(\"\"\"
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       (CASE WHEN sj."ID" IS NOT NULL THEN TRUE ELSE FALSE END) as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                LEFT JOIN "SavedJobs" sj ON j."JobID" = sj."JobID" AND sj."UserEmail" = %s
                WHERE j."Status" = 'Active' 
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            \"\"\", (email,))
        else:
            c.execute(\"\"\"
                SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       FALSE as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                WHERE j."Status" = 'Active' 
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            \"\"\")
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()"""

    if jobs_get_orig in content:
        content = content.replace(jobs_get_orig, jobs_get_new)
    else:
        print("Could not find get_public_jobs orig string.")

    # 3. Update get_public_jobs loop to add isSaved
    content = content.replace('"logoUrl": j.get("CompanyLogo", "")', '"logoUrl": j.get("CompanyLogo", ""),\n                "isSaved": j.get("isSaved", False)')

    # 4. Update /api/jobs/<id> GET
    job_get_orig = """@app.route('/api/jobs/<int:id>', methods=['GET'])
def get_public_job(id):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(\"\"\"
            SELECT j.*, c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus" 
            FROM "Jobs" j
            LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
            WHERE j."JobID" = %s AND j."Status" = 'Active'
            AND (c."Status" IS NULL OR c."Status" = 'Active')
        \"\"\", (id,))
        cols = [column[0] for column in c.description]
        row = c.fetchone()
        conn.close()"""

    job_get_new = """@app.route('/api/jobs/<int:id>', methods=['GET'])
def get_public_job(id):
    try:
        email = request.args.get('email')
        conn = get_db_connection()
        c = conn.cursor()
        if email:
            c.execute(\"\"\"
                SELECT j.*, c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       (CASE WHEN sj."ID" IS NOT NULL THEN TRUE ELSE FALSE END) as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                LEFT JOIN "SavedJobs" sj ON j."JobID" = sj."JobID" AND sj."UserEmail" = %s
                WHERE j."JobID" = %s AND j."Status" = 'Active'
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            \"\"\", (email, id))
        else:
            c.execute(\"\"\"
                SELECT j.*, c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                       FALSE as "isSaved"
                FROM "Jobs" j
                LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
                WHERE j."JobID" = %s AND j."Status" = 'Active'
                AND (c."Status" IS NULL OR c."Status" = 'Active')
            \"\"\", (id,))
        cols = [column[0] for column in c.description]
        row = c.fetchone()
        conn.close()"""

    if job_get_orig in content:
        content = content.replace(job_get_orig, job_get_new)
    else:
        print("Could not find get_public_job orig string.")

    # 5. Add /api/candidate/saved-jobs and toggle endpoints
    saved_endpoints = """
@app.route('/api/candidate/saved-jobs/toggle', methods=['POST'])
def toggle_saved_job():
    data = request.json
    email = data.get('email')
    job_id = data.get('jobId')
    if not email or not job_id:
        return jsonify({"error": "Missing email or jobId"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT "ID" FROM "SavedJobs" WHERE "UserEmail" = %s AND "JobID" = %s', (email, job_id))
        row = c.fetchone()
        if row:
            c.execute('DELETE FROM "SavedJobs" WHERE "ID" = %s', (row[0],))
            saved = False
        else:
            c.execute('INSERT INTO "SavedJobs" ("UserEmail", "JobID") VALUES (%s, %s)', (email, job_id))
            saved = True
        conn.commit()
        conn.close()
        return jsonify({"saved": saved}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidate/saved-jobs', methods=['GET'])
def get_saved_jobs():
    email = request.args.get('email')
    if not email:
        return jsonify({"error": "Missing email"}), 400
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute(\"\"\"
            SELECT j.*, c."Name" as "LinkedCompanyName", c."LogoUrl" as "CompanyLogo", c."Status" as "CompanyStatus",
                   TRUE as "isSaved"
            FROM "SavedJobs" sj
            JOIN "Jobs" j ON sj."JobID" = j."JobID"
            LEFT JOIN "Companies" c ON j."CompanyID" = c."CompanyID"
            WHERE sj."UserEmail" = %s AND j."Status" = 'Active'
            AND (c."Status" IS NULL OR c."Status" = 'Active')
            ORDER BY sj."SavedAt" DESC
        \"\"\", (email,))
        cols = [column[0] for column in c.description]
        raw_jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        formatted_jobs = []
        for j in raw_jobs:
            formatted_jobs.append({
                "id": j.get("JobID"),
                "title": j.get("JobTitle", "Unknown Title"),
                "company": j.get("CompanyName", "Voxa"),
                "location": j.get("Location") or "Remote",
                "salary": j.get("SalaryPackage") or "Competitive",
                "accountType": j.get("AccountType") or "N/A",
                "workingHours": j.get("WorkingHours") or "N/A",
                "interviewType": j.get("InterviewType") or "Onsite Interview",
                "minEnglishLevel": j.get("MinEnglishLevel") or "B2",
                "minSecondLangLevel": j.get("MinSecondLangLevel") or "",
                "maxAge": j.get("MaxAge") or 35,
                "nationalityReq": j.get("NationalityReq") or "All Nationalities",
                "graduationReq": j.get("GraduationReq") or "Graduates Only",
                "minExperience": j.get("MinExperience") or "0",
                "training": j.get("Training") or "Not specified.",
                "requirements": f"Account: {j.get('AccountType', 'N/A')} | Hours: {j.get('WorkingHours', 'N/A')} | Target: {j.get('TargetAudience', 'N/A')}",
                "description": j.get("OfferDetails", ""),
                "logoUrl": j.get("CompanyLogo", ""),
                "isSaved": True
            })
        return jsonify(formatted_jobs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
"""
    
    cand_app_index = content.find("@app.route('/api/candidate/applications', methods=['GET'])")
    if cand_app_index != -1:
        content = content[:cand_app_index] + saved_endpoints + "\n" + content[cand_app_index:]
    else:
        print("Could not find candidate/applications.")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("app.py successfully patched.")

if __name__ == "__main__":
    main()
