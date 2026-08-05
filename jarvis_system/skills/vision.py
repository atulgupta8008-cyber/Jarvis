import base64
import io
from PIL import ImageGrab
from groq import Groq
import config

def analyze_screen() -> str:
    """Takes a screenshot and uses Groq's free Vision model to describe it."""
    try:
        # 1. Take a screenshot of the primary monitor
        screenshot = ImageGrab.grab()
        
        # 2. Resize to save tokens, speed up API transfer, and stay within free limits
        screenshot.thumbnail((1024, 1024)) 
        
        # 3. Convert the image to base64 format (which Groq requires)
        buffered = io.BytesIO()
        screenshot.save(buffered, format="JPEG", quality=80)
        base64_image = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # 4. Call Groq Vision API
        client = Groq(api_key=config.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct", # Groq's super-fast free vision model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this screen in detail. What applications are open? What is the main content? Be concise but accurate."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            temperature=0.2,
            max_tokens=256
        )
        
        description = response.choices[0].message.content
        return f"I am currently looking at the user's screen. Here is what is visible: {description}"
    except Exception as e:
        print(f"[Vision Error]: {e}")
        return f"Failed to analyze screen due to an error: {e}"