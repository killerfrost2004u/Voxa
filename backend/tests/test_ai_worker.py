import pytest
import sys
import os
from unittest.mock import patch, MagicMock

# Add backend to path so we can import local_ai_worker
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@patch('local_ai_worker.s3_client')
@patch('local_ai_worker.psycopg2.connect')
@patch('local_ai_worker.CandidateGrader.grade_audio')
def test_process_application_updates_database_correctly(mock_grade, mock_db, mock_s3):
    from local_ai_worker import process_application
    
    # 1. Provide a fake AI Response (Validation)
    mock_grade.return_value = {
        "overall_level": "C1",
        "overall_score": 85,
        "fluency_level": "C1",
        "pronunciation_level": "B2",
        "grammar_level": "C1",
        "accent_profile": "Clear Egyptian",
        "summary": "Great English.",
        "transcript": "Hello"
    }
    
    mock_cursor = MagicMock()
    mock_db.return_value.cursor.return_value = mock_cursor

    # 2. Run the function
    process_application(999, "test_file.wav")
    
    # 3. Assert the database was called with the exact right parsed data
    called_args = mock_cursor.execute.call_args[0][1]
    
    assert called_args[1] == "C1 (85)", f"Expected C1 (85) but got {called_args[1]}"
    assert called_args[8] == 999, f"Expected 999 but got {called_args[8]}"
    assert called_args[6] == "Clear Egyptian", f"Expected 'Clear Egyptian' but got {called_args[6]}"
