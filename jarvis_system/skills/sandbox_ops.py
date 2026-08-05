import os
import re
import asyncio
from google import genai
import config
from core.supabase_db import cloud_engine

client = genai.Client(api_key=config.GEMINI_API_KEY)

SANDBOX_PROMPT = """SYSTEM OVERRIDE: SIMULATION SANDBOX MODE.
You are a physics simulation engine with the personality of a curious, dramatic scientist.

When the user asks "What if X?", you MUST follow this format:

1. IMMEDIATE CONSEQUENCES (2-3 paragraphs):
   - Describe what happens in the first seconds/minutes/hours with vivid, cinematic language
   - Use actual physics calculations where possible (show your numbers!)
   - Make the reader FEEL the physics — describe sensory details

2. VISUALIZATION:
   - Generate a <simulation_board type="plotly"> with a Plotly visualization showing the key variable changes
   - Use compelling chart titles and axis labels
   - Plot at least 2 variables to show the dramatic contrast

3. CASCADE EFFECTS (1-2 paragraphs):
   - What happens in the days/years/millennia after?
   - How does this change biology, civilization, the planet?

4. THE HOOK:
   - End with a provocative follow-up question that makes them want to push the simulation further
   - Example: "But here's where it gets REALLY interesting — what if we also removed the atmosphere?"

CRITICAL RULES:
- Use REAL physics. Calculate actual numbers.
- Be dramatic and cinematic. Make them feel like they're watching the universe break.
- Always suggest what to explore next to keep the curiosity loop going.
- Use <math_board> for any important equations you derive.
- Use <diagram_board> for system-level cause-and-effect chains.
"""

async def handle_sandbox_query(session_id: str, text: str, send_ui_update=None) -> tuple:
    """Handles a What-If sandbox query."""
    history = await cloud_engine.load_professor_session(session_id)

    messages = []
    messages.append({"role": "user", "parts": [SANDBOX_PROMPT]})
    messages.append({"role": "model", "parts": ["Understood. I am the Simulation Sandbox. I will simulate physics dramatically and visually. Awaiting scenario."]})

    # Inject history
    last_role = "model"
    for msg in history[-20:]:
        content = msg["content"].strip()
        if not content:
            continue
        current_role = "model" if msg["role"] == "jarvis" else "user"
        if current_role == last_role:
            messages[-1]["parts"][0] += f"\n\n{content}"
        else:
            messages.append({"role": current_role, "parts": [content]})
            last_role = current_role

    # Add current query
    if last_role == "user":
        messages[-1]["parts"][0] += f"\n\n{text}"
    else:
        messages.append({"role": "user", "parts": [text]})

    formatted_contents = [
        genai.types.Content(
            role=m["role"],
            parts=[genai.types.Part.from_text(text=p) if isinstance(p, str) else p for p in m["parts"]]
        )
        for m in messages
    ]
    def _generate():
        return client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=formatted_contents,
            config=genai.types.GenerateContentConfig(max_output_tokens=8192)
        )

    if send_ui_update:
        await send_ui_update({"status": "Simulating universe parameters..."})

    response = await asyncio.to_thread(_generate)
    response_text = response.text

    # Extract boards
    math_board = None
    math_match = re.search(r'<math_board[^>]*>(.*?)</math_board>', response_text, re.IGNORECASE | re.DOTALL)
    if math_match:
        math_board = math_match.group(1).strip()
        response_text = re.sub(r'<math_board[^>]*>.*?</math_board>', '', response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    diagram_board = None
    diagram_match = re.search(r'<diagram_board[^>]*>(.*?)</diagram_board>', response_text, re.IGNORECASE | re.DOTALL)
    if diagram_match:
        diagram_board = diagram_match.group(1).strip()
        response_text = re.sub(r'<diagram_board[^>]*>.*?</diagram_board>', '', response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    simulation_board = None
    sim_match = re.search(r'<(?:simulation_board|plotly_data)[^>]*>(.*?)</(?:simulation_board|plotly_data)>', response_text, re.IGNORECASE | re.DOTALL)
    if sim_match:
        simulation_board = sim_match.group(1).strip()
        response_text = re.sub(r'<(?:simulation_board|plotly_data)[^>]*>.*?</(?:simulation_board|plotly_data)>', '', response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    # Save to history
    await cloud_engine.save_professor_message(session_id, "user", text)
    await cloud_engine.save_professor_message(session_id, "jarvis", response_text)

    return response_text, math_board, diagram_board, simulation_board
