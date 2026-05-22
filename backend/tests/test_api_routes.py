import pytest
import sys
import os
from unittest.mock import patch

# Add backend to path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@patch('app.get_db_connection')
def test_create_user_permission_firewall(mock_db, client):
    """
    Validation: Ensures a 'Leader' cannot create a 'UnitManager'
    """
    payload = {
        "creator_role": "Leader",
        "creator_agency": "Voxa",
        "creator_unit": "Direct",
        "creator_team": "Direct",
        "fullName": "Test User",
        "email": "test@voxa.com",
        "password": "Password123!",
        "target_role": "UnitManager", 
        "target_agency": "Voxa",
        "target_unit": "Direct",
        "target_team": "Direct"
    }
    
    response = client.post('/api/admin/users', json=payload)
    
    assert response.status_code == 403
    assert b"Leaders can only create Recruiters" in response.data

@patch('app.get_db_connection')
def test_create_user_permission_firewall_ceo_success(mock_db, client):
    """
    Validation: Ensures a 'CEO' can create a 'UnitManager' in their own agency.
    """
    # Mocking DB so it doesn't fail on email check
    mock_cursor = mock_db.return_value.cursor.return_value
    mock_cursor.fetchone.return_value = None # Email doesn't exist
    
    payload = {
        "creator_role": "CEO",
        "creator_agency": "Voxa",
        "creator_unit": "Direct",
        "creator_team": "Direct",
        "fullName": "Test User",
        "email": "test@voxa.com",
        "password": "Password123!",
        "target_role": "UnitManager", 
        "target_agency": "Voxa",
        "target_unit": "Direct",
        "target_team": "Direct"
    }
    
    response = client.post('/api/admin/users', json=payload)
    
    assert response.status_code == 201
    assert b"successfully created" in response.data

@patch('app.get_db_connection')
def test_create_user_permission_firewall_cross_agency(mock_db, client):
    """
    Validation: Ensures a 'CEO' cannot create staff in another agency.
    """
    payload = {
        "creator_role": "CEO",
        "creator_agency": "Voxa",
        "creator_unit": "Direct",
        "creator_team": "Direct",
        "fullName": "Test User",
        "email": "test@voxa.com",
        "password": "Password123!",
        "target_role": "Recruiter", 
        "target_agency": "OtherAgency",
        "target_unit": "Direct",
        "target_team": "Direct"
    }
    
    response = client.post('/api/admin/users', json=payload)
    
    assert response.status_code == 403
    assert b"manage staff within your own agency" in response.data
