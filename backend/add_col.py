import app
try:
    conn = app.get_db_connection()
    c = conn.cursor()
    c.execute('ALTER TABLE "Jobs" ADD COLUMN "type" VARCHAR(50);')
    conn.commit()
    print("Column added successfully")
except Exception as e:
    print("Error:", e)
finally:
    if conn: conn.close()
