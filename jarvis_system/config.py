"""Runtime configuration for Jarvis.

Secrets are read from environment variables first, then from the local,
git-ignored settings file managed by the desktop UI.  Never add fallback keys
to this module: source code is not a secrets store.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def _key(environment_name: str) -> str:
    return os.getenv(environment_name, "").strip()

GROQ_API_KEY = _key("GROQ_API_KEY")
DEEPGRAM_API_KEY = _key("DEEPGRAM_API_KEY")
SARVAM_API_KEY = _key("SARVAM_API_KEY")
GEMINI_API_KEY = _key("GEMINI_API_KEY")
SUPABASE_URL = _key("SUPABASE_URL")
SUPABASE_KEY = _key("SUPABASE_KEY")

# Voice configuration
VOICE_MODEL = "en-US-GuyNeural"
AUDIO_CACHE_FILE = "jarvis_response.mp3"

# LLM configuration
LLM_MODEL = "llama-3.1-8b-instant"
