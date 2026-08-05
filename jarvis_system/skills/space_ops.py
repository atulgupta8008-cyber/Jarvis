import requests
import datetime
import numpy as np
import matplotlib.pyplot as plt
import os
import threading
import urllib.parse

def run_3d_iss_simulation() -> str:
    """Fetches live ISS telemetry and plots it in a 3D Cartesian space."""
    try:
        # 1. Fetch live telemetry
        response = requests.get("http://api.open-notify.org/iss-now.json", timeout=5)
        data = response.json()
        
        lat = float(data['iss_position']['latitude'])
        lon = float(data['iss_position']['longitude'])
        
        # 2. Physics / Math Conversion 
        # Earth radius is approx 6371 km, ISS orbits at ~420 km altitude
        R = 6371 + 420 
        lat_rad = np.radians(lat)
        lon_rad = np.radians(lon)
        
        x = R * np.cos(lat_rad) * np.cos(lon_rad)
        y = R * np.cos(lat_rad) * np.sin(lon_rad)
        z = R * np.sin(lat_rad)
        
        # 3. Generate the 3D Plot
        def build_and_show_plot():
            fig = plt.figure(figsize=(8, 8), facecolor='black')
            ax = fig.add_subplot(111, projection='3d')
            ax.set_facecolor('black')
            
            # Draw Earth Wireframe
            u = np.linspace(0, 2 * np.pi, 100)
            v = np.linspace(0, np.pi, 100)
            earth_x = 6371 * np.outer(np.cos(u), np.sin(v))
            earth_y = 6371 * np.outer(np.sin(u), np.sin(v))
            earth_z = 6371 * np.outer(np.ones(np.size(u)), np.cos(v))
            
            ax.plot_wireframe(earth_x, earth_y, earth_z, color='cyan', alpha=0.1)
            
            # Plot the ISS
            ax.scatter(x, y, z, color='red', s=100, label='ISS (Live)')
            ax.plot([0, x], [0, y], [0, z], color='red', linestyle='--', alpha=0.5)
            
            # Styling
            ax.set_title(f"Live ISS Orbital Telemetry\nLat: {lat} | Lon: {lon}", color='cyan')
            ax.xaxis.pane.fill = False
            ax.yaxis.pane.fill = False
            ax.zaxis.pane.fill = False
            ax.legend(facecolor='black', edgecolor='cyan', labelcolor='cyan')
            
            # Save and open the image so it doesn't block the AI thread
            save_path = os.path.join(os.environ['USERPROFILE'], 'Desktop', 'ISS_Telemetry.png')
            plt.savefig(save_path, facecolor=fig.get_facecolor(), edgecolor='none')
            plt.close(fig)
            os.startfile(save_path) # Opens image natively on Windows
            
        # Run plot generation in a quick background thread to keep Jarvis responsive
        threading.Thread(target=build_and_show_plot).start()
        
        return f"Telemetry acquired. The ISS is currently at Latitude {lat}, Longitude {lon}. I have generated a 3D orbital projection on your screen."
        
    except Exception as e:
        return f"Failed to run ISS orbital simulation: {e}"

def nasa_asteroid_radar() -> str:
    """Pings NASA's NeoWs API to find near-earth objects passing today."""
    try:
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        # Using NASA's public demo key (limit 30 requests/IP/hour)
        url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={today}&end_date={today}&api_key=DEMO_KEY"
        
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if 'near_earth_objects' not in data or today not in data['near_earth_objects']:
            return "NASA radar is currently clear. No significant Near Earth Objects detected today."
            
        asteroids = data['near_earth_objects'][today]
        total_count = len(asteroids)
        
        # Sort by closest approach
        asteroids.sort(key=lambda a: float(a['close_approach_data'][0]['miss_distance']['lunar']))
        
        closest = asteroids[0]
        name = closest['name']
        diameter_max = closest['estimated_diameter']['meters']['estimated_diameter_max']
        miss_dist_lunar = float(closest['close_approach_data'][0]['miss_distance']['lunar'])
        velocity_kph = float(closest['close_approach_data'][0]['relative_velocity']['kilometers_per_hour'])
        
        # Convert KPH to Mach speed (1 Mach is roughly 1234.8 km/h at sea level)
        mach_speed = round(velocity_kph / 1234.8, 1)
        threat_level = "High" if miss_dist_lunar < 1.0 else "Minimal"
        
        report = (f"NASA Radar sweep complete. Detected {total_count} asteroids passing Earth today. "
                  f"The closest object is '{name}', with a maximum diameter of {round(diameter_max, 1)} meters. "
                  f"It is traveling at Mach {mach_speed}, missing Earth by {round(miss_dist_lunar, 2)} Lunar Distances. "
                  f"Calculated threat level is {threat_level}.")
        return report
        
    except Exception as e:
        return f"NASA uplink failed: {e}"

def solar_system_telemetry(planet_name: str) -> str:
    """Returns exact physics, atmospheric, and soil data for solar system bodies."""
    planet = planet_name.lower().strip()
    
    database = {
        "mars": "Gravity: 3.721 m/s² (38% of Earth). Atmosphere: Extremely thin, ~610 Pa (0.6% of Earth's), 95% Carbon Dioxide (CO2). Soil: Basaltic regolith, rich in Iron Oxide (giving the red color), highly toxic due to high concentrations of perchlorates. Temperature: Avg -60°C.",
        "venus": "Gravity: 8.87 m/s² (90% of Earth). Atmosphere: Crushing pressure, ~9.3 MPa (93 times Earth's), 96.5% Carbon Dioxide with clouds of sulfuric acid. Soil: Volcanic basaltic rock, extremely dry. Temperature: Avg 464°C (hot enough to melt lead).",
        "earth": "Gravity: 9.807 m/s². Atmosphere: 101.3 kPa (1 atm), 78% Nitrogen, 21% Oxygen. Soil: Rich in organic matter, silica, and water. Magnetosphere: Strong, protects from solar radiation.",
        "moon": "Gravity: 1.62 m/s² (16.5% of Earth). Atmosphere: Basically a vacuum (exosphere of helium/neon). Soil: Lunar regolith, sharp silicate glass shards, no organic matter. Pressure: 3×10^-15 atm.",
        "titan": "Gravity: 1.35 m/s². Atmosphere: 1.45 atm (thicker than Earth's), 95% Nitrogen, 5% Methane. Surface: Hydrocarbon lakes (liquid methane/ethane), water-ice bedrock."
    }
    
    if planet in database:
        return f"Planetary Telemetry for {planet.upper()}: {database[planet]}"
    else:
        return f"Telemetry for {planet_name} not found in local quick-cache. Please use the deep_space_research tool instead."

def deep_space_research(topic: str) -> str:
    """Pulls highly detailed scientific data from Wikipedia for Terraforming and Exoplanets."""
    print(f"\n[System]: Initiating Deep Space Uplink for -> '{topic}'")
    try:
        # Use Wikipedia's REST API for raw text extraction (No extra libraries needed!)
        safe_topic = urllib.parse.quote(topic)
        url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles={safe_topic}&format=json"
        
        response = requests.get(url, timeout=5).json()
        pages = response.get('query', {}).get('pages', {})
        
        for page_id in pages:
            if page_id == "-1":
                return f"No deep research files found on '{topic}'. Try querying a more specific scientific term or exoplanet designation."
            
            extract = pages[page_id].get('extract', '')
            
            # Truncate to the first 3500 characters to prevent API token overflow while keeping high detail
            max_chars = 3500
            truncated_extract = extract[:max_chars] + "...\n[DATA TRUNCATED FOR MEMORY]" if len(extract) > max_chars else extract
            
            return f"--- ASTROPHYSICS ARCHIVE: {topic.upper()} ---\n{truncated_extract}"
            
    except Exception as e:
        return f"Deep space research uplink failed: {e}"