import os
import urllib.request
import zipfile
import json
import speech_recognition as sr
from deepgram import DeepgramClient
import config

try:
    import pyaudio
except ImportError:
    pyaudio = None

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
except ImportError:
    Model = KaldiRecognizer = SetLogLevel = None

def ensure_vosk_model():
    """Checks if the lightweight Vosk model exists, downloads it if not."""
    model_dir = "vosk-model-small-en-us-0.15"
    if not os.path.exists(model_dir):
        print(f"\n[System]: Downloading offline wake word model (40MB)...")
        print("[System]: This will only happen once. Please wait...")
        url = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
        urllib.request.urlretrieve(url, "model.zip")
        
        print("[System]: Extracting model...")
        with zipfile.ZipFile("model.zip", 'r') as zip_ref:
            zip_ref.extractall(".")
        os.remove("model.zip")
        print("[System]: Model ready!")
        
    return model_dir

def wait_for_wake_word() -> bool:
    """Listens in the background using Vosk until 'Jarvis' is spoken."""
    if not pyaudio or not Model:
        print("[Ears]: Offline wake-word detection (PyAudio/Vosk) is not available on this platform.")
        return False
    model_path = ensure_vosk_model()
    
    # Hide Vosk's internal C++ logging from the terminal for a cleaner look
    from vosk import SetLogLevel
    SetLogLevel(-1)
    
    model = Model(model_path)
    recognizer = KaldiRecognizer(model, 16000)
    
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=8000)
    stream.start_stream()
    
    try:
        while True:
            # exception_on_overflow=False prevents crashes on slower CPUs
            data = stream.read(4000, exception_on_overflow=False)
            if recognizer.AcceptWaveform(data):
                result = json.loads(recognizer.Result())
                text = result.get("text", "")
                
                # Check if our wake word is in the transcribed chunk
                if "a" in text.lower():
                    print("\n[Wake Word Detected!]")
                    return True
    except Exception as e:
        print(f"[Wake Word Error]: {e}")
        return False
    finally:
        # Crucial: Cleanly close the mic so SpeechRecognition can use it next
        stream.stop_stream()
        stream.close()
        p.terminate()

def listen_and_transcribe() -> str:
    """Listens to the microphone and transcribes via Deepgram V6 SDK."""
    print("\n[Jarvis is listening...]")
    recognizer = sr.Recognizer()
    
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source, duration=1) #earlier 0.5
        print("[Speak now...]")
        
        try:
            # INCREASED TIMEOUT: Now waits 12 seconds for you to start speaking before going to sleep
            audio = recognizer.listen(source, timeout=12, phrase_time_limit=15)
        except sr.WaitTimeoutError:
            print("[Silence detected. Returning to sleep...]")
            return ""
            
    try:
        print("[Sending audio to Deepgram...]")
        wav_data = audio.get_wav_data()
        
        deepgram = DeepgramClient(api_key=config.DEEPGRAM_API_KEY)
        response = deepgram.listen.v1.media.transcribe_file(
            request=wav_data,
            model="nova-3",
            smart_format=True
        )
        
        user_input = response.results.channels[0].alternatives[0].transcript
        if user_input.strip():
            print(f"[You]: {user_input}")
            return user_input
        return ""
        
    except Exception as e:
        print(f"[Ears Error]: {e}")
        return ""