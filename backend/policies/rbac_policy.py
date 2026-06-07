from abc import ABC, abstractmethod

class BaseAccessPolicy(ABC):
    @abstractmethod
    def can_create_user(self, target_role, target_agency, target_unit, target_team, creator_data):
        pass

class CEOPolicy(BaseAccessPolicy):
    def can_create_user(self, target_role, target_agency, target_unit, target_team, creator_data):
        if target_agency != creator_data.get('agency'): 
            return False, "You can only manage staff within your own agency."
        if target_role in ['SuperAdmin', 'Admin', 'CEO']: 
            return False, "You cannot create Admins or CEOs."
        return True, ""

class LeaderPolicy(BaseAccessPolicy):
    def can_create_user(self, target_role, target_agency, target_unit, target_team, creator_data):
        if (target_agency != creator_data.get('agency') or 
            target_unit != creator_data.get('unit') or 
            target_team != creator_data.get('team')):
            return False, "Leaders can only manage staff in their exact Team."
        if target_role != 'Recruiter':
            return False, "Leaders can only create Recruiters."
        return True, ""

def get_policy(role_name) -> BaseAccessPolicy:
    policies = {
        'CEO': CEOPolicy(),
        'Leader': LeaderPolicy(),
    }
    return policies.get(role_name)
