import requests
import json

def test_ollama_json():
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "llama3",
        "prompt": "Return a JSON object with a key 'message' containing 'hello'",
        "format": "json",
        "stream": False
    }
    
    print(f"Testing JSON constraint on host...")
    try:
        response = requests.post(url, json=payload, timeout=20)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ollama_json()
