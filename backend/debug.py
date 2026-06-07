import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_ZWb5lX1Hhgre@ep-empty-shape-aln50nml-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(DATABASE_URL)
c = conn.cursor()

id = 23
c.execute("""
    SELECT "CompanyID" as id, "Name" as name, "LogoUrl" as "logoUrl", "Description" as description
    FROM "Companies"
    WHERE "CompanyID" = %s AND "Status" = 'Active'
""", (id,))
print("Result of parameterized query:", c.fetchone())
