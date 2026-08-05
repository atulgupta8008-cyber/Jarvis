import pyperclip
import requests
import os
import time
try:
    import pyautogui
except ImportError:
    pyautogui = None
from datetime import datetime

def extract_active_window_text() -> str:
    """Simulates Ctrl+A and Ctrl+C to instantly read all text from the active window."""
    try:
        # Give a tiny 0.5s buffer for the user to release keys after triggering the command
        time.sleep(0.5)
        
        # 1. Select All
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(0.1)
        
        # 2. Copy
        pyautogui.hotkey('ctrl', 'c')
        time.sleep(0.1)
        
        # 3. Deselect (so the user's screen isn't permanently highlighted blue)
        pyautogui.press('right')
        
        text = pyperclip.paste()
        if not text or text.isspace():
            return "I tried to copy the text from the active window, but nothing was found. The application might not support text selection."
            
        # Truncate to approx 4000 chars to prevent crashing the LLM's token limit
        if len(text) > 4000:
            text = text[:4000] + "... [Content truncated for length]"
            
        return f"Here is the text I extracted from the user's active window:\n\n{text}"
    except Exception as e:
        return f"Failed to extract text from active window: {e}"

def read_clipboard() -> str:
    """Reads the user's current clipboard text for Jarvis to analyze."""
    try:
        text = pyperclip.paste()
        if not text or text.isspace():
            return "The clipboard is currently empty or contains no text."
            
        # Truncate to prevent crashing the LLM token limit (approx 3000 chars)
        if len(text) > 3000:
            text = text[:3000] + "... [Content truncated for length]"
            
        return f"Here is the content currently on the user's clipboard:\n\n{text}"
    except Exception as e:
        return f"Failed to read clipboard due to system error: {e}"

def take_note(note_content: str) -> str:
    """Appends a note to a local text file with a timestamp."""
    try:
        file_path = "jarvis_notes.txt"
        timestamp = datetime.now().strftime('%Y-%m-%d %I:%M %p')
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {note_content}\n")
            
        return f"I have saved the note: '{note_content}'."
    except Exception as e:
        return f"Failed to save the note due to error: {e}"

def get_weather(city: str) -> str:
    """Fetches real-time weather for a specific city using a keyless API."""
    try:
        # wttr.in is a fantastic, free, keyless weather service
        url = f"https://wttr.in/{city}?format=%C+%t"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            weather_data = response.text.strip()
            return f"The current weather in {city} is {weather_data}."
        else:
            return f"I could not retrieve the weather for {city} at this moment."
    except Exception as e:
        return f"Weather API error: {e}"