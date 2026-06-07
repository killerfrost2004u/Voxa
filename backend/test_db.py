import psycopg2
from app import get_db_connection

conn = get_db_connection()
c = conn.cursor()
c.execute('SELECT "CompanyID", "Name", "LogoUrl" FROM "Companies" WHERE "Name" ILIKE \'%iLead%\'')
print(c.fetchall())
conn.close()
