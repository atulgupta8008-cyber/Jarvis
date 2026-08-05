import json
import os

MACRO_FILE = "macros.json"

def _load_macros():
    """Loads the macros from the local JSON file."""
    if not os.path.exists(MACRO_FILE):
        return {}
    try:
        with open(MACRO_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def _save_macros(macros):
    """Saves the macros to the local JSON file."""
    with open(MACRO_FILE, "w") as f:
        json.dump(macros, f, indent=4)

def learn_routine(trigger_phrase: str, actions_description: str) -> str:
    """Saves a new custom routine."""
    macros = _load_macros()
    macros[trigger_phrase.lower()] = actions_description
    _save_macros(macros)
    return f"Routine '{trigger_phrase}' learned successfully. I will execute those actions whenever you say it."

def delete_routine(trigger_phrase: str) -> str:
    """Deletes a saved routine."""
    macros = _load_macros()
    trigger = trigger_phrase.lower()
    if trigger in macros:
        del macros[trigger]
        _save_macros(macros)
        return f"Routine '{trigger_phrase}' has been deleted."
    return f"Routine '{trigger_phrase}' not found."

def get_all_routines_text() -> str:
    """Formats all routines into a string for Jarvis's system prompt."""
    macros = _load_macros()
    if not macros:
        return "No custom routines saved yet."
    
    text = "When the user says these exact trigger phrases, immediately perform the corresponding actions:\n"
    for trigger, actions in macros.items():
        text += f"- Trigger: '{trigger}' -> Actions: {actions}\n"
    return text