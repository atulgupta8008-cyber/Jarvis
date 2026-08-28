import os
import time
import asyncio
from openai import AsyncOpenAI
import config

def cleanup_old_simulations(static_dir: str, max_age_seconds: int = 180, max_files: int = 2):
    """
    Deletes temporary python scripts immediately and prunes old simulation HTML files
    that are older than max_age_seconds (default 3 minutes) or exceed max_files count (default 2).
    """
    try:
        if not os.path.exists(static_dir):
            return
        
        now = time.time()
        html_files = []
        
        for item in os.listdir(static_dir):
            file_path = os.path.join(static_dir, item)
            if not os.path.isfile(file_path):
                continue
                
            # Immediately remove leftover python scripts or temporary files
            if (item.startswith("script_") and item.endswith(".py")) or item.endswith(".tmp"):
                try:
                    os.remove(file_path)
                except Exception:
                    pass
                continue
                
            # Prune html simulation files
            if item.startswith("sim_") and item.endswith(".html"):
                try:
                    file_age = now - os.path.getmtime(file_path)
                    if file_age > max_age_seconds:
                        os.remove(file_path)
                    else:
                        html_files.append((file_path, os.path.getmtime(file_path)))
                except Exception:
                    pass
                    
        # Prune if file count exceeds max_files (keep only newest)
        html_files.sort(key=lambda x: x[1], reverse=True)
        for old_file_path, _ in html_files[max_files:]:
            try:
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            except Exception:
                pass
    except Exception as e:
        print(f"Error cleaning up simulations: {e}")

async def simulate_physics(prompt: str) -> str:
    """
    Spawns a Gemini generation to write complex Physics/Math code,
    executes it in a background subprocess, cleans up temporary files,
    and returns the HTML URL.
    """
    timestamp = int(time.time())
    output_html_name = f"sim_{timestamp}.html"
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static", "simulations")
    output_html_path = os.path.join(static_dir, output_html_name)
    script_path = os.path.join(static_dir, f"script_{timestamp}.py")
    
    # Ensure directory exists & prune old simulation files on local storage
    os.makedirs(static_dir, exist_ok=True)
    cleanup_old_simulations(static_dir)

    # 1. Ask Gemini to write the script
    gemini_client = AsyncOpenAI(api_key=config.GEMINI_API_KEY, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
    
    # Ensure Windows paths are formatted safely for the Python string injection
    safe_html_path = output_html_path.replace('\\', '\\\\')

    system_prompt = f"""
    You are The Swarm, an elite computational physics simulation engine.
    Write a complete, zero-error Python script that creates a BEAUTIFUL, PUBLICATION-QUALITY interactive visualization.

    CRITICAL CODE INSTRUCTIONS:
    1. Use numpy arrays and vectorized mathematics for physical simulations and numerical step integrations (Euler, RK4, or parametric equations).
    2. Do NOT import scipy or any other non-standard packages. Only import numpy, math, and plotly (plotly.graph_objects as go, plotly.express as px).
    3. The script MUST NOT use any GUI popups (do NOT use plt.show() or fig.show()).
    4. NEVER use invalid Plotly properties (e.g. wireframe=True in go.Surface).
    5. The final step MUST save the HTML file to this exact path:
       fig.write_html('{safe_html_path}')
    6. Return ONLY the raw executable python code. Do not include markdown codeblocks (```python) or any other text. Start directly with imports.

    CRITICAL VISUALIZATION QUALITY INSTRUCTIONS:
    7. The visualization MUST fill the ENTIRE canvas. Use layout settings:
       - margin=dict(l=20, r=20, t=50, b=20) — minimal margins so the plot fills the space
       - width=None (omit or don't set) — let it be responsive to container
       - height=700 minimum for 3D, 500 minimum for 2D
       - autosize=True
    8. Use a DARK THEME: paper_bgcolor='#0a0e17', plot_bgcolor='#0a0e17', font_color='#e0e6f0'
    9. Use VIBRANT, HIGH-CONTRAST colors for traces: electric cyan (#00f7ff), neon violet (#a855f7), bright amber (#ffd166), emerald (#34d399), hot rose (#ff6b9d). Never use dull or muted colors.
    10. Include CLEAR, DESCRIPTIVE axis titles with units (e.g. 'Displacement x (meters)', 'Time t (seconds)').
    11. Include a DESCRIPTIVE chart title that explains what the simulation shows.
    12. For 3D plots: Use camera=dict(eye=dict(x=1.5, y=1.5, z=1.2)) for a good viewing angle. Add colorscale='Viridis' or 'Plasma' for surfaces.
    13. For line plots: Use line_width=2.5 minimum. Add hover info. Use mode='lines' (not markers) unless scatter is needed.
    14. Generate ENOUGH data points for smooth, beautiful curves (at least 200-500 for parametric, 50x50 grid for surfaces).
    15. The simulation must be PHYSICALLY MEANINGFUL — compute real values, use actual physical constants where appropriate, and create visualizations that genuinely illustrate the physics described in the prompt.
    """
    
    try:
        response = await gemini_client.chat.completions.create(
            model="gemini-3.1-flash-lite",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.15
        )
        
        raw_code = response.choices[0].message.content.strip()
        # Clean up codeblocks just in case the LLM ignores instructions
        if raw_code.startswith("```python"):
            raw_code = raw_code.replace("```python", "")
        if raw_code.startswith("```"):
            raw_code = raw_code.replace("```", "")
        if raw_code.endswith("```"):
            raw_code = raw_code[:-3]
            
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(raw_code.strip())
            
        # 2. Execute the script asynchronously using the current Python environment (virtualenv compatible)
        import sys
        process = await asyncio.create_subprocess_exec(
            sys.executable, script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode('utf-8')
            return f"Error executing simulation: {error_msg}"
            
        if os.path.exists(output_html_path):
            backend_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL") or "http://localhost:8000"
            backend_url = backend_url.rstrip("/")
            return f"{backend_url}/static/simulations/{output_html_name}"
        else:
            return "Simulation ran successfully, but the output HTML was not created."
            
    except Exception as e:
        return f"Physics Engine Failure: {str(e)}"
    finally:
        # Immediately delete the temporary Python script file
        if os.path.exists(script_path):
            try:
                os.remove(script_path)
            except Exception:
                pass
