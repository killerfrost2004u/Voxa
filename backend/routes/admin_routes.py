from flask import Blueprint, jsonify, request
from repositories.job_repository import JobRepository
from policies.rbac_policy import get_policy

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/admin')
job_repo = JobRepository()

@admin_bp.route('/jobs', methods=['GET'])
def get_jobs():
    company_id = request.args.get('companyId')
    jobs = job_repo.get_admin_jobs(company_id)
    return jsonify(jobs)

@admin_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    creator_role = data.get('creator_role')
    policy = get_policy(creator_role)
    
    if not policy:
        # Fallback to SuperAdmin check or reject
        if creator_role in ['SuperAdmin', 'Admin']:
            pass # Admins can do anything
        else:
            return jsonify({"error": "You do not have permission to manage staff."}), 403
            
    if policy:
        creator_data = {
            'agency': data.get('creator_agency'), 
            'unit': data.get('creator_unit'), 
            'team': data.get('creator_team')
        }
        is_allowed, error_msg = policy.can_create_user(
            data.get('target_role'), 
            data.get('target_agency'), 
            data.get('target_unit'), 
            data.get('target_team'), 
            creator_data
        )
        
        if not is_allowed:
            return jsonify({"error": error_msg}), 403
        
    # TODO: Pass payload to a UserRepository.create_user(data)
    # ...
    return jsonify({"message": "User successfully created"}), 201
