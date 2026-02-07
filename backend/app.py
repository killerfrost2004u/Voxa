from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import bcrypt

app = Flask(__name__)
CORS(app)

# --- Database Connection ---
# ⚠️ MAKE SURE YOU RAN THE SQL SCRIPT IN SSMS FIRST!
conn_str = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=localhost;'
    r'DATABASE=DarkWolvesDB;'
    r'Trusted_Connection=yes;'
)


def get_db_connection():
    try:
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Database Error: {e}")
        return None


# --- Routes ---
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    hashed_pw = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Connection Failed"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO Users (FullName, Email, PasswordHash) VALUES (?, ?, ?)",
                       (data['fullName'], data['email'], hashed_pw))
        conn.commit()
        return jsonify({"message": "User created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Connection Failed"}), 500

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT UserID, FullName, PasswordHash FROM Users WHERE Email = ?", (data['email'],))
        user = cursor.fetchone()

        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.PasswordHash.encode('utf-8')):
            return jsonify({"message": "Success", "user": {"name": user.FullName}}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)