import os
import sys
import time
import asyncio
import re
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from google import genai
import config

client = genai.Client(api_key=config.GEMINI_API_KEY)

def cleanup_old_simulations(static_dir: str, max_age_seconds: int = 180, max_files: int = 3):
    """
    Deletes temporary python scripts immediately and prunes old simulation HTML files
    that are older than max_age_seconds (default 3 minutes) or exceed max_files count (default 3).
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
        print(f"[Physics Ops] Error cleaning up simulations: {e}")


def clean_code(raw_code: str) -> str:
    """Strips markdown code fences and cleans raw python text."""
    if not raw_code:
        return ""
    code = raw_code.strip()
    if code.startswith("```python"):
        code = code[9:]
    elif code.startswith("```"):
        code = code[3:]
    if code.endswith("```"):
        code = code[:-3]
    return code.strip()


def validate_syntax(code: str) -> tuple[bool, str, int, str]:
    """
    In-memory validation of Python syntax.
    Returns (is_valid, error_msg, line_number, line_text).
    """
    try:
        compile(code, "<string>", "exec")
        return True, "", 0, ""
    except SyntaxError as e:
        return False, e.msg or "SyntaxError", e.lineno or 0, (e.text or "").strip()
    except Exception as e:
        return False, str(e), 0, ""


async def self_repair_code(broken_code: str, error_msg: str, error_line: int, line_text: str, safe_html_path: str) -> str:
    """
    Calls Gemini to fix a syntax or runtime error in the generated simulation script.
    """
    repair_prompt = f"""You are an elite Python computational engineer.
The following Python script has an error and failed to execute:

ERROR TYPE: {error_msg}
LINE NUMBER: {error_line}
OFFENDING LINE: {line_text if line_text else 'See traceback below'}

CRITICAL PYTHON SYNTAX RULES FOR THE FIX:
1. In Python, NEVER place a positional argument after a keyword argument! E.g. func(a=1, 2) is a SyntaxError. All arguments following a keyword argument must also use keyword syntax: func(a=1, b=2).
2. In Plotly subplots, fig.add_trace(trace, row=1, col=1) — BOTH row and col MUST be keyword arguments! Writing (trace, row=1, 1) is a SyntaxError.
3. In Plotly fig.update_layout() and fig.add_annotation(), all arguments must be keyword arguments.
4. Keep the script under 120 lines, fully self-contained, using only numpy, math, and plotly.
5. The final step must save to: fig.write_html('{safe_html_path}')
6. Return ONLY the raw executable python script. Do NOT include markdown fences (```python) or explanations.

BROKEN SCRIPT:
{broken_code}
"""
    try:
        def _generate():
            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=repair_prompt,
                config=genai.types.GenerateContentConfig(temperature=0.1, max_output_tokens=4096)
            )
            return response.text
        fixed = await asyncio.to_thread(_generate)
        return clean_code(fixed)
    except Exception as e:
        print(f"[Physics Ops] Self-repair API call failed: {e}")
        return broken_code


async def execute_script(script_path: str, timeout_seconds: int = 15) -> tuple[bool, str]:
    """
    Executes the Python script in a subprocess with a strict timeout.
    Returns (success, stderr_or_error_message).
    """
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        try:
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            try:
                process.kill()
            except Exception:
                pass
            return False, f"Simulation script timed out after {timeout_seconds} seconds."

        if process.returncode != 0:
            return False, stderr.decode('utf-8', errors='replace')
        return True, ""
    except Exception as e:
        return False, str(e)


def generate_guaranteed_fallback(prompt: str, output_html_path: str) -> bool:
    """
    Generates a publication-quality interactive Plotly physics simulation
    based on the conceptual domain of the prompt. Guaranteed to produce zero errors.
    """
    try:
        p_lower = prompt.lower()
        fig = make_subplots(
            rows=1, cols=2,
            subplot_titles=('Spatial Profile / Field Distribution', 'Dynamic Response / Parameter Evolution'),
            horizontal_spacing=0.12
        )

        # Domain 1: Induction / Electromagnetism / Wire & Loop
        if any(k in p_lower for k in ['induction', 'emf', 'magnetic', 'flux', 'wire', 'loop', 'faraday', 'lorentz']):
            y = np.linspace(0.01, 0.25, 250)
            I = 10.0
            mu0 = 4 * np.pi * 1e-7
            B = (mu0 * I) / (2 * np.pi * y) * 1e6

            fig.add_trace(
                go.Scatter(x=y * 100, y=B, mode='lines', name='B(y) [μT]', line=dict(color='#00f7ff', width=3)),
                row=1, col=1
            )

            t = np.linspace(0.01, 1.2, 250)
            h0 = 0.05
            w = 0.1
            l_len = 0.2
            for v, col, name in [(0.5, '#ffd166', 'v = 0.5 m/s'), (1.0, '#34d399', 'v = 1.0 m/s (Nominal)'), (2.0, '#a855f7', 'v = 2.0 m/s (Fast)')]:
                h = h0 + v * t
                emf = (mu0 * I * l_len * v / (2 * np.pi)) * (1.0 / h - 1.0 / (h + w)) * 1e6
                fig.add_trace(
                    go.Scatter(x=t, y=emf, mode='lines', name=name, line=dict(color=col, width=2.5)),
                    row=1, col=2
                )
            title = "Interactive Physics Simulation: Electromagnetic Induction (Moving Loop in Wire Field)"
            x1_lbl, y1_lbl = "Distance y from Wire (cm)", "Magnetic Field B (μT)"
            x2_lbl, y2_lbl = "Time t (s)", "Induced EMF E (μV)"

        # Domain 2: Wave / Quantum / Interference
        elif any(k in p_lower for k in ['wave', 'quantum', 'schrodinger', 'oscillator', 'fourier', 'harmonic', 'resonance']):
            x = np.linspace(-5, 5, 300)
            psi0 = np.exp(-x**2 / 2) / np.pi**0.25
            psi1 = np.sqrt(2) * x * np.exp(-x**2 / 2) / np.pi**0.25
            fig.add_trace(
                go.Scatter(x=x, y=psi0**2, mode='lines', name='|ψ₀(x)|² Ground State', line=dict(color='#00f7ff', width=3)),
                row=1, col=1
            )
            fig.add_trace(
                go.Scatter(x=x, y=psi1**2, mode='lines', name='|ψ₁(x)|² 1st Excited State', line=dict(color='#a855f7', width=2.5)),
                row=1, col=1
            )

            t = np.linspace(0, 10, 300)
            for omega, col, name in [(1.0, '#34d399', 'ω = 1.0 rad/s'), (2.0, '#ffd166', 'ω = 2.0 rad/s')]:
                y_harm = np.exp(-0.15 * t) * np.cos(omega * t)
                fig.add_trace(
                    go.Scatter(x=t, y=y_harm, mode='lines', name=name, line=dict(color=col, width=2.5)),
                    row=1, col=2
                )
            title = "Interactive Physics Simulation: Wave Mechanics & State Oscillations"
            x1_lbl, y1_lbl = "Spatial Coordinate x (a.u.)", "Probability Density |ψ|²"
            x2_lbl, y2_lbl = "Time t (s)", "Amplitude A(t)"

        # Domain 3: Kinematics / Gravitation / Projectile / General Dynamics
        else:
            t = np.linspace(0, 5, 250)
            v0 = 25.0
            g = 9.81
            for angle, col in [(30, '#ffd166'), (45, '#00f7ff'), (60, '#a855f7')]:
                rad = np.radians(angle)
                t_flight = 2 * v0 * np.sin(rad) / g
                t_p = np.linspace(0, t_flight, 150)
                x_p = v0 * np.cos(rad) * t_p
                y_p = v0 * np.sin(rad) * t_p - 0.5 * g * t_p**2
                fig.add_trace(
                    go.Scatter(x=x_p, y=y_p, mode='lines', name=f'θ = {angle}° (Max R = {x_p[-1]:.1f}m)', line=dict(color=col, width=2.5)),
                    row=1, col=1
                )

            # Velocity decay / kinetic energy
            v_t = np.sqrt((v0 * np.cos(np.radians(45)))**2 + (v0 * np.sin(np.radians(45)) - g * t)**2)
            fig.add_trace(
                go.Scatter(x=t, y=0.5 * 1.0 * v_t**2, mode='lines', name='Kinetic Energy E_k(t)', line=dict(color='#34d399', width=3)),
                row=1, col=2
            )
            title = "Interactive Physics Simulation: Dynamic Trajectory & Energy Phase Space"
            x1_lbl, y1_lbl = "Horizontal Range x (m)", "Altitude y (m)"
            x2_lbl, y2_lbl = "Time t (s)", "Energy (Joules)"

        fig.update_layout(
            title_text=title,
            paper_bgcolor='#0a0e17',
            plot_bgcolor='#0a0e17',
            font=dict(color='#e0e6f0', family='Space Grotesk, sans-serif'),
            margin=dict(l=40, r=40, t=70, b=40),
            height=550,
            showlegend=True,
            legend=dict(bgcolor='rgba(10,14,23,0.85)', bordercolor='rgba(255,255,255,0.1)')
        )
        fig.update_xaxes(gridcolor='rgba(255,255,255,0.06)', title_text=x1_lbl, row=1, col=1)
        fig.update_yaxes(gridcolor='rgba(255,255,255,0.06)', title_text=y1_lbl, row=1, col=1)
        fig.update_xaxes(gridcolor='rgba(255,255,255,0.06)', title_text=x2_lbl, row=1, col=2)
        fig.update_yaxes(gridcolor='rgba(255,255,255,0.06)', title_text=y2_lbl, row=1, col=2)

        fig.write_html(output_html_path)
        return True
    except Exception as e:
        print(f"[Physics Ops] Fallback generation error: {e}")
        return False


async def simulate_physics(prompt: str) -> str:
    """
    Generates a publication-quality interactive Plotly physics simulation.
    Features:
    - Native Gemini generation with strict syntax constraints
    - In-memory AST/compile syntax verification
    - Automatic self-repair loops for syntax and runtime errors
    - Subprocess execution with timeout safeguards
    - Guaranteed fallback generation so a working interactive simulation is ALWAYS delivered
    - Safe URL resolution for both local development and Render deployment
    """
    timestamp = int(time.time())
    output_html_name = f"sim_{timestamp}.html"
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static", "simulations")
    output_html_path = os.path.join(static_dir, output_html_name)
    script_path = os.path.join(static_dir, f"script_{timestamp}.py")

    # Ensure directory exists & prune old simulation files on local storage
    os.makedirs(static_dir, exist_ok=True)
    cleanup_old_simulations(static_dir)

    safe_html_path = output_html_path.replace('\\', '\\\\')

    system_prompt = f"""You are The Swarm, an elite computational physics simulation engine.
Write a complete, zero-error Python script that creates a BEAUTIFUL, PUBLICATION-QUALITY interactive Plotly visualization.

CRITICAL PYTHON SYNTAX RULES:
1. In Python, NEVER place a positional argument after a keyword argument! E.g. func(a=1, 2) is an illegal SyntaxError. All arguments following a keyword argument must also be keyword arguments.
2. In Plotly subplots, fig.add_trace(trace, row=1, col=1) — BOTH row and col must be keyword arguments! Writing (trace, row=1, 1) is a SyntaxError.
3. In Plotly fig.update_layout(...) and fig.add_annotation(...), all parameters must be keyword arguments (e.g. title_text="...", showlegend=True).
4. Keep the script clean, modular, and under 120 lines. Avoid complex multi-frame slider animations that can introduce syntax bugs; high-resolution multi-trace interactive charts with hover tooltips are preferred.

CODE CONSTRAINTS:
5. Only import numpy as np, math, and plotly (import plotly.graph_objects as go, from plotly.subplots import make_subplots). Do NOT import scipy or any other packages.
6. The script MUST NOT use any GUI popups (NO plt.show() or fig.show()).
7. The final step MUST save the HTML file to this exact path:
   fig.write_html('{safe_html_path}')
8. Return ONLY the raw executable python code. Do NOT include markdown codeblocks (```python) or any other text. Start directly with imports.

AESTHETIC & THEME GUIDELINES:
9. Use a DARK THEME: paper_bgcolor='#0a0e17', plot_bgcolor='#0a0e17', font=dict(color='#e0e6f0', family='Space Grotesk, sans-serif').
10. Use VIBRANT colors for traces: electric cyan (#00f7ff), neon violet (#a855f7), bright amber (#ffd166), emerald (#34d399), hot rose (#ff6b9d).
11. Include CLEAR, DESCRIPTIVE axis titles with units and a compelling chart title.
12. Generate enough data points (150-300) for smooth, publication-ready curves. Prevent division by zero using small epsilons (1e-9).
"""

    code = ""
    try:
        def _generate():
            response = client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=f"{system_prompt}\n\nUSER DIRECTIVE: {prompt}",
                config=genai.types.GenerateContentConfig(temperature=0.15, max_output_tokens=4096)
            )
            return response.text

        raw_response = await asyncio.to_thread(_generate)
        code = clean_code(raw_response)

        # ------------------------------------------------------------------
        # STAGE 1: IN-MEMORY SYNTAX CHECK & REPAIR
        # ------------------------------------------------------------------
        is_valid, err_msg, err_line, err_text = validate_syntax(code)
        if not is_valid:
            print(f"[Physics Ops] SyntaxError detected in generated code ({err_msg} at line {err_line}). Engaging self-repair...")
            code = await self_repair_code(code, err_msg, err_line, err_text, safe_html_path)
            is_valid, err_msg, err_line, err_text = validate_syntax(code)

        # ------------------------------------------------------------------
        # STAGE 2: EXECUTION & RUNTIME REPAIR
        # ------------------------------------------------------------------
        if is_valid:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code)

            success, exec_err = await execute_script(script_path, timeout_seconds=15)
            if not success:
                print(f"[Physics Ops] Execution failed. Engaging runtime self-repair. Error: {exec_err[:200]}")
                # Parse the error traceback for line info
                line_match = re.search(r'line (\d+)', exec_err)
                err_line_no = int(line_match.group(1)) if line_match else 0
                code = await self_repair_code(code, exec_err, err_line_no, "", safe_html_path)
                
                # Check syntax of repaired code
                if validate_syntax(code)[0]:
                    with open(script_path, "w", encoding="utf-8") as f:
                        f.write(code)
                    success, exec_err = await execute_script(script_path, timeout_seconds=15)

        # ------------------------------------------------------------------
        # STAGE 3: RESULT VERIFICATION OR SMART FALLBACK
        # ------------------------------------------------------------------
        if not os.path.exists(output_html_path) or os.path.getsize(output_html_path) < 100:
            print("[Physics Ops] Custom script failed to produce HTML. Engaging guaranteed fallback visualizer...")
            generate_guaranteed_fallback(prompt, output_html_path)

        if os.path.exists(output_html_path):
            backend_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL") or "http://localhost:8000"
            backend_url = backend_url.rstrip("/")
            return f"{backend_url}/static/simulations/{output_html_name}"
        else:
            return "http://localhost:8000/static/simulations/fallback.html"

    except Exception as e:
        print(f"[Physics Ops] Critical exception: {e}. Generating guaranteed fallback...")
        generate_guaranteed_fallback(prompt, output_html_path)
        if os.path.exists(output_html_path):
            backend_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("BACKEND_URL") or "http://localhost:8000"
            backend_url = backend_url.rstrip("/")
            return f"{backend_url}/static/simulations/{output_html_name}"
        return f"Physics Engine Failure: {str(e)}"
    finally:
        # Immediately delete the temporary Python script file
        if os.path.exists(script_path):
            try:
                os.remove(script_path)
            except Exception:
                pass
