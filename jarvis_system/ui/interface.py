import customtkinter as ctk
import math
import psutil

class StarkHUD(ctk.CTkToplevel):
    def __init__(self, master):
        super().__init__(master)
        
        self.title("Stark HUD")
        # Position it roughly in the top right of the screen
        screen_width = self.winfo_screenwidth()
        self.geometry(f"250x150+{screen_width - 300}+50") 
        
        self.overrideredirect(True) # Removes window borders (hologram effect)
        self.attributes('-topmost', True) # Always on top
        self.attributes('-alpha', 0.85) # Semi-transparent
        self.configure(fg_color="#0a0a0a") # Deep black background

        # Make the window draggable
        self.bind("<ButtonPress-1>", self.start_move)
        self.bind("<B1-Motion>", self.do_move)

        # Holographic Cyan Font
        hud_font = ("Courier", 18, "bold")
        
        self.cpu_label = ctk.CTkLabel(self, text="CPU: 0%", font=hud_font, text_color="#00FFFF")
        self.cpu_label.pack(pady=(20, 5), padx=20, anchor="w")

        self.ram_label = ctk.CTkLabel(self, text="RAM: 0%", font=hud_font, text_color="#00FFFF")
        self.ram_label.pack(pady=5, padx=20, anchor="w")

        self.batt_label = ctk.CTkLabel(self, text="BATT: 0%", font=hud_font, text_color="#00FFFF")
        self.batt_label.pack(pady=5, padx=20, anchor="w")

        self.update_stats()

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def do_move(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.winfo_x() + deltax
        y = self.winfo_y() + deltay
        self.geometry(f"+{x}+{y}")

    def update_stats(self):
        cpu = psutil.cpu_percent()
        ram = psutil.virtual_memory().percent
        batt = psutil.sensors_battery()
        batt_pc = batt.percent if batt else 100

        self.cpu_label.configure(text=f"CPU : {cpu}%")
        self.ram_label.configure(text=f"RAM : {ram}%")
        self.batt_label.configure(text=f"BATT: {batt_pc}%")
        
        # Turn red if resources are stressed!
        self.cpu_label.configure(text_color="#FF0000" if cpu > 85 else "#00FFFF")
        self.ram_label.configure(text_color="#FF0000" if ram > 85 else "#00FFFF")

        # Loop this check every 1 second
        self.after(1000, self.update_stats)

class InfinityAnimation(ctk.CTkCanvas):
    def __init__(self, master, **kwargs):
        # Initialize the canvas with a dark background to match the theme
        super().__init__(master, bg="#242424", highlightthickness=0, **kwargs)
        
        # Animation mathematical variables
        self.t = 0
        self.points = []
        self.max_length = 50 # How long the "tail" of the infinity loop is
        self.speed = 0.05
        self.color = "#808080" # Default gray
        
        # Start the animation loop
        self.animate()

    def set_state(self, state: str):
        """Changes the color and speed of the animation based on Jarvis's state."""
        if state == "sleeping":
            self.color = "#808080" # Gray
            self.speed = 0.03      # Slow
        elif state == "listening":
            self.color = "#00FF00" # Neon Green
            self.speed = 0.12      # Fast
        elif state == "thinking":
            self.color = "#FFCC00" # Yellow/Gold
            self.speed = 0.08      # Medium-fast
        elif state == "executing":
            self.color = "#FF00FF" # Magenta/Purple
            self.speed = 0.10      # Fast
        elif state == "speaking":
            self.color = "#00FFFF" # Cyan
            self.speed = 0.06      # Smooth, wavy

    def animate(self):
        self.delete("all")
        
        # Canvas dimensions and curve size
        width = int(self.cget("width"))
        height = int(self.cget("height"))
        center_x, center_y = width // 2, height // 2
        
        A = width // 2 - 20   # X-axis spread
        B = height // 2 - 20  # Y-axis spread
        
        # Calculate new X, Y coordinates using Lissajous curve for an infinity symbol
        # x = A * sin(t), y = B * sin(2t)
        x = center_x + A * math.sin(self.t)
        y = center_y + B * math.sin(2 * self.t)
        
        self.points.append((x, y))
        if len(self.points) > self.max_length:
            self.points.pop(0)
            
        # Draw the tail with fading thickness
        for i in range(len(self.points) - 1):
            p1 = self.points[i]
            p2 = self.points[i+1]
            
            # Make the head of the loop thicker and the tail thinner
            thickness = max(1, int(3 * (i / self.max_length)))
            self.create_line(p1[0], p1[1], p2[0], p2[1], fill=self.color, width=thickness)
            
        # Advance time and schedule the next frame (30 milliseconds = ~33 FPS)
        self.t += self.speed
        self.after(30, self.animate)

class JarvisUI(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # --- UI Window Setup ---
        self.title("Jarvis AI")
        self.geometry("400x650")
        ctk.set_appearance_mode("dark")
        
        self.attributes('-topmost', True) # Keep window on top

        # --- Top Animation Canvas ---
        self.anim_canvas = InfinityAnimation(self, width=400, height=150)
        self.anim_canvas.pack(pady=(10, 0))

        # --- Status Labels ---
        self.status_label = ctk.CTkLabel(self, text="Initializing...", font=("Helvetica", 22, "bold"))
        self.status_label.pack(pady=(10, 0))
        
        self.sub_status_label = ctk.CTkLabel(self, text="Please wait", font=("Helvetica", 14), text_color="gray")
        self.sub_status_label.pack(pady=(0, 10))

        # --- Chat Box ---
        self.chat_box = ctk.CTkTextbox(self, width=360, height=380, font=("Helvetica", 14), wrap="word", corner_radius=10)
        self.chat_box.pack(pady=10)
        self.chat_box.insert("0.0", "=== System Online ===\n\n")
        self.chat_box.configure(state="disabled")
        
        self.hud = None # Track the Stark HUD state

    def toggle_hud(self, state: str):
        """Thread-safe method to turn the HUD on or off."""
        self.after(0, self._toggle_hud_sync, state)
        
    def _toggle_hud_sync(self, state):
        if state == "on" and self.hud is None:
            self.hud = StarkHUD(self)
        elif state == "off" and self.hud is not None:
            self.hud.destroy()
            self.hud = None

    def update_state(self, state: str, main_text: str, sub_text: str = ""):
        """Thread-safe method to update everything on the screen at once."""
        self.after(0, self._update_state_sync, state, main_text, sub_text)
        
    def _update_state_sync(self, state, main_text, sub_text):
        # Update animation color and speed
        self.anim_canvas.set_state(state)
        
        # Update text and match color to animation
        self.status_label.configure(text=main_text, text_color=self.anim_canvas.color)
        self.sub_status_label.configure(text=sub_text)

    def append_chat(self, role, message):
        self.after(0, self._append_chat_sync, role, message)
        
    def _append_chat_sync(self, role, message):
        self.chat_box.configure(state="normal")
        
        if role == "You":
            self.chat_box.insert("end", f"You: {message}\n\n")
        else:
            self.chat_box.insert("end", f"Jarvis: {message}\n\n")
            
        self.chat_box.see("end")
        self.chat_box.configure(state="disabled")