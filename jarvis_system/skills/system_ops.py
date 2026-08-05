import datetime
import psutil
import os
import pyautogui
from ctypes import cast, POINTER
from comtypes import CLSCTX_ALL
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from AppOpener import open as open_app # Added for opening local apps

# Set a safety pause so pyautogui doesn't go crazy and freeze your PC
pyautogui.PAUSE = 0.5

def get_system_time_date() -> str:
    """Returns the current local time and date."""
    now = datetime.datetime.now()
    current_time = now.strftime("%I:%M %p")
    current_date = now.strftime("%A, %B %d, %Y")
    return f"The current time is {current_time} and today is {current_date}."

def get_system_status() -> str:
    """Checks the laptop's battery, CPU usage, and available RAM."""
    # CPU Usage
    cpu_usage = psutil.cpu_percent(interval=0.1)
    
    # RAM Usage
    ram = psutil.virtual_memory()
    ram_usage = ram.percent
    
    # Battery Status
    battery = psutil.sensors_battery()
    if battery:
        percent = battery.percent
        power_plugged = "plugged in" if battery.power_plugged else "running on battery power"
        battery_msg = f"Your battery is at {percent}% and is currently {power_plugged}."
    else:
        battery_msg = "I could not detect a battery source on this machine."

    return f"Sir, your CPU utilization is currently at {cpu_usage}%, RAM usage is at {ram_usage}%. {battery_msg}"

def change_volume(level: int) -> str:
    """
    Changes the master system volume. 
    Expects an integer percentage from 0 to 100.
    """
    try:
        import comtypes
        # Initialize COM interface for this thread
        comtypes.CoInitialize() 
        
        devices = AudioUtilities.GetSpeakers()
        
        # Handle different versions of pycaw and potential auto-complete typos
        try:
            # Standard method (Older Pycaw versions)
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = cast(interface, POINTER(IAudioEndpointVolume))
        except AttributeError:
            # Fallback method (Newer Pycaw versions)
            volume = devices.EndpointVolume.QueryInterface(IAudioEndpointVolume)
        
        # Clamp value between 0.0 and 1.0
        normalized_level = max(0, min(level, 100)) / 100.0
        
        # Set Master Volume (Scalar takes 0.0 to 1.0)
        volume.SetMasterVolumeLevelScalar(normalized_level, None)
        
        # Clean up the COM interface
        comtypes.CoUninitialize()
        
        return f"System volume adjusted to {level}%."
    except Exception as e:
        return f"Failed to adjust volume due to error: {e}"

def open_local_app(app_name: str) -> str:
    """
    Opens a local Windows application by name.
    """
    try:
        # match_closest=True helps if the LLM says "google chrome" but the app is "chrome"
        open_app(app_name, match_closest=True)
        return f"I have opened {app_name} for you, sir."
    except Exception as e:
        return f"I was unable to find or open an application named {app_name}."

def media_control(action: str) -> str:
    """Controls media playback."""
    action = action.lower()
    try:
        if action in ["play", "pause", "playpause", "toggle"]:
            pyautogui.press("playpause")
            return "Media playback toggled."
        elif action in ["next", "skip"]:
            pyautogui.press("nexttrack")
            return "Skipped to the next track."
        elif action in ["previous", "back"]:
            pyautogui.press("prevtrack")
            return "Returned to the previous track."
        else:
            return f"Unknown media action: {action}"
    except Exception as e:
        return f"Failed to execute media control: {e}"

def system_command(command: str) -> str:
    """Executes system-level commands like locking the PC or minimizing windows."""
    command = command.lower()
    try:
        import ctypes
        if command == "lock":
            ctypes.windll.user32.LockWorkStation()
            return "PC locked successfully."
        elif command in ["minimize", "desktop", "show desktop"]:
            pyautogui.hotkey("win", "d")
            return "All windows minimized."
        elif command == "screenshot":
            desktop_path = os.path.join(os.environ['USERPROFILE'], 'Desktop')
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            file_path = os.path.join(desktop_path, f'Screenshot_{timestamp}.png')
            pyautogui.screenshot(file_path)
            return f"Screenshot saved to your desktop as Screenshot_{timestamp}.png."
        else:
            return f"Unknown system command: {command}"
    except Exception as e:
        return f"Failed to execute system command: {e}"

def ghost_type(text: str) -> str:
    """Types the given text physically onto the screen."""
    try:
        # We add a slight interval to simulate natural typing and ensure it doesn't drop characters
        pyautogui.write(text, interval=0.02)
        return "I have typed the requested text."
    except Exception as e:
        return f"Failed to type text: {e}"
    
def scroll(direction: str) -> str:
    """Scrolls the screen up or down. Also presses PageDown for web feeds."""
    direction = direction.lower()
    try:
        if direction == "up":
            pyautogui.scroll(800)
            pyautogui.press('pageup')
            return "Scrolled up."
        elif direction == "down":
            pyautogui.scroll(-800)
            pyautogui.press('pagedown') # Helps with YouTube shorts/feeds
            return "Scrolled down."
        else:
            return f"Unknown scroll direction: {direction}"
    except Exception as e:
        return f"Failed to scroll: {e}"

def click_on_screen(x_percent: int, y_percent: int) -> str:
    """Moves the mouse to the specified percentage of the screen and clicks."""
    try:
        screen_width, screen_height = pyautogui.size()
        
        # Calculate actual pixels from the percentages
        x = int((x_percent / 100.0) * screen_width)
        y = int((y_percent / 100.0) * screen_height)
        
        # Move the mouse smoothly over 0.6 seconds so it looks like a human
        pyautogui.moveTo(x, y, duration=0.6, tween=pyautogui.easeInOutQuad)
        pyautogui.click()
        
        return f"I have clicked the screen at coordinates {x_percent}%, {y_percent}%."
    except Exception as e:
        return f"Failed to click on screen: {e}"