import app
try:
    conn = app.get_db_connection()
    c = conn.cursor()
    c.execute('ALTER TABLE "Jobs" ADD COLUMN "LanguageRequirement" VARCHAR(255);')
    c.execute('ALTER TABLE "Jobs" ADD COLUMN "TargetLanguage" VARCHAR(255);')
    conn.commit()
    print("Columns added successfully")
except Exception as e:
    print("Error:", e)
finally:
    if conn: conn.close()
