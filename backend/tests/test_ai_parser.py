import pytest
import sys
import os

# Add backend to path so we can import ai_evaluator
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai_evaluator import parse_ai_response

def test_parse_ai_response_validates_markdown_wrapper():
    """
    Isolation: Testing just the string parsing logic.
    Validation: Ensures the parser handles markdown code blocks injected by LLMs.
    """
    dirty_llm_output = "Here is the result:\n```json\n{\"overall_level\": \"C2\", \"overall_score\": 98, \"summary\": \"Good.\"}\n```\nHave a nice day!"
    
    result = parse_ai_response(dirty_llm_output)
    
    assert "overall_level" in result
    assert result["overall_level"] == "C2"
    assert result["overall_score"] == 98
    assert result["summary"] == "Good."

def test_parse_ai_response_validates_raw_json():
    """
    Validation: Ensures the parser handles pure JSON without markdown.
    """
    clean_llm_output = "{\"overall_level\": \"B2\", \"overall_score\": 60, \"summary\": \"Decent.\"}"
    
    result = parse_ai_response(clean_llm_output)
    
    assert "overall_level" in result
    assert result["overall_level"] == "B2"
    assert result["overall_score"] == 60

def test_parse_ai_response_handles_broken_json():
    """
    Validation: Ensures the fallback logic triggers if the AI hallucinates broken JSON.
    """
    broken_output = "```json\n{\"overall_level\": \"B2\", \"overall_score\": 60, \n```"
    
    result = parse_ai_response(broken_output)
    
    assert result["overall_level"] == "B1"
    assert result["overall_score"] == 60
    assert result["summary"] == "Format failed."
    
def test_parse_ai_response_handles_no_json():
    """
    Validation: Ensures the fallback logic triggers if the AI hallucinates no JSON.
    """
    no_json_output = "The candidate is very good, I give them a C1."
    
    result = parse_ai_response(no_json_output)
    
    assert result["overall_level"] == "B1"
    assert result["overall_score"] == 60
    assert result["summary"] == "Format failed."
