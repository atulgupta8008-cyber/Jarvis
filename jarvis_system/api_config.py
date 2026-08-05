import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.json")

def load_settings():
    if not os.path.exists(SETTINGS_FILE):
        default_settings = {
            "keys": {
                "groq": "",
                "openai": "",
                "deepgram": "",
                "gemini": ""
            },
            "preferences": {
                "active_brain": "gemini",
                "active_ears": "vosk",
                "active_voice": "edge-tts"
            }
        }
        save_settings(default_settings)
        return default_settings
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {"keys": {}, "preferences": {}}

def save_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=4)

def update_settings(new_settings):
    settings = load_settings()
    # Empty key inputs mean "keep the existing key".  This lets the web UI
    # avoid reading secrets back from disk while still saving preferences.
    if "keys" in new_settings:
        for provider, value in new_settings["keys"].items():
            if isinstance(value, str) and value.strip():
                settings["keys"][provider] = value.strip()
    if "preferences" in new_settings:
        settings["preferences"].update(new_settings["preferences"])
    save_settings(settings)
    return settings

def get_key(provider):
    return load_settings().get("keys", {}).get(provider, "")

def get_preference(key):
    return load_settings().get("preferences", {}).get(key, "")


def public_settings():
    """Return settings safe to expose to the browser (never API keys)."""
    settings = load_settings()
    return {
        "keys": {provider: "" for provider in settings.get("keys", {})},
        "preferences": settings.get("preferences", {}),
    }
