# core/mouth.py
import os
import asyncio
import edge_tts
import pygame
import config

async def speak(text: str):
    """Converts text to speech and plays it aloud."""
    if not text or text.isspace():
        return
        
    print("[Jarvis is speaking...]")
    
    # Generate audio
    communicate = edge_tts.Communicate(text, config.VOICE_MODEL)
    await communicate.save(config.AUDIO_CACHE_FILE)
    
    # Play audio safely
    pygame.mixer.init()
    pygame.mixer.music.load(config.AUDIO_CACHE_FILE)
    pygame.mixer.music.play()
    
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
        
    pygame.mixer.quit()
    
    # Cleanup
    if os.path.exists(config.AUDIO_CACHE_FILE):
        try:
            os.remove(config.AUDIO_CACHE_FILE)
        except PermissionError:
            pass # Handle Windows file locking