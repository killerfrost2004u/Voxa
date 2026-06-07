from app import get_db_connection

class JobRepository:
    def get_admin_jobs(self, company_id=None):
        conn = get_db_connection()
        if not conn: return []
        c = conn.cursor()
        
        query = """SELECT j.*, 
                  (SELECT COUNT(*) FROM "JobApplications" a WHERE a."JobTitle" = j."JobTitle" OR a."Company" = j."Company") as "Applicants"
                  FROM "Jobs" j"""
                  
        if company_id:
            query += f" WHERE j.\"CompanyID\" = {company_id}"
            
        query += ' ORDER BY j."CreatedAt" DESC'
        
        c.execute(query)
        cols = [desc[0] for desc in c.description]
        jobs = [dict(zip(cols, row)) for row in c.fetchall()]
        conn.close()
        
        return jobs
