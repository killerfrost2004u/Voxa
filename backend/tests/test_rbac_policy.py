import unittest
import sys
import os

# Ensure backend directory is in the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from policies.rbac_policy import get_policy

class TestRBACPolicy(unittest.TestCase):
    def test_leader_cannot_create_admin(self):
        policy = get_policy('Leader')
        creator_data = {'agency': 'Voxa', 'unit': 'Sales', 'team': 'Alpha'}
        
        # A Leader trying to create an Admin
        is_allowed, msg = policy.can_create_user(
            'Admin', 'Voxa', 'Sales', 'Alpha', creator_data
        )
        
        self.assertFalse(is_allowed)
        self.assertEqual(msg, "Leaders can only create Recruiters.")

    def test_leader_can_create_recruiter_in_same_team(self):
        policy = get_policy('Leader')
        creator_data = {'agency': 'Voxa', 'unit': 'Sales', 'team': 'Alpha'}
        
        is_allowed, msg = policy.can_create_user(
            'Recruiter', 'Voxa', 'Sales', 'Alpha', creator_data
        )
        
        self.assertTrue(is_allowed)

    def test_leader_cannot_create_recruiter_in_different_team(self):
        policy = get_policy('Leader')
        creator_data = {'agency': 'Voxa', 'unit': 'Sales', 'team': 'Alpha'}
        
        is_allowed, msg = policy.can_create_user(
            'Recruiter', 'Voxa', 'Sales', 'Beta', creator_data
        )
        
        self.assertFalse(is_allowed)
        self.assertEqual(msg, "Leaders can only manage staff in their exact Team.")

if __name__ == '__main__':
    unittest.main()
