import os
import time
import base64
import re
import asyncio
from google import genai
import config
from core.supabase_db import cloud_engine

client = genai.Client(api_key=config.GEMINI_API_KEY)

VANCE_PROMPT = "You are Dr. Vance, an elite MIT Aerospace and Systems Safety Engineer. Your student, Atul, is pitching a new idea. You are the ultimate skeptic. RULE 1: Do NOT be pedantic. Ignore minor math errors or small logic gaps. RULE 2: You MUST call out massive, fatal, anti-science flaws. If his idea violates the laws of thermodynamics, conservation of energy, or material stress limits, ruthlessly (but professionally) dismantle the idea using First Principles. If the idea is physically sound, simply state 'The physics hold up. Proceed.' Keep it under 4 sentences."
ADA_PROMPT = "You are Ada, an elite MIT Polymath and Innovator. Atul is pitching an idea. Your job is to say 'Yes, and...' RULE 1: Take his core concept and suggest a wildly creative, cross-disciplinary improvement. RULE 2: Link his idea to advanced fields like biomimicry, quantum mechanics, or nanotechnology. Help him see how his idea could be 10x bigger or more efficient. Keep it under 4 sentences."

STRICT_GUARDRAILS = """
STRICT OUTPUT CONSTRAINT:
1. Use the <math_board>...</math_board> tag exclusively for long, multi-step calculus or derivations written in standard LaTeX.
2. Use the <diagram_board>...</diagram_board> tag exclusively for free-body diagrams, system architectures, or flowcharts written in Mermaid.js syntax.
3. Use the <simulation_board>...</simulation_board> tag exclusively to prompt the physics engine to generate a 3D visualization using Plotly/Three.js.

Think deeply. Provide exhaustive, step-by-step derivations on the blackboard. Use simulations liberally to demonstrate complex systems. Never use these tags for normal conversation.
"""

def extract_boards(response_text: str):
    math_board = None
    math_match = re.search(r"<math_board[^>]*>(.*?)</math_board>", response_text, re.IGNORECASE | re.DOTALL)
    if math_match:
        math_board = math_match.group(1).strip()
        response_text = re.sub(r"<math_board[^>]*>.*?</math_board>", "", response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    diagram_board = None
    diagram_match = re.search(r"<diagram_board[^>]*>(.*?)</diagram_board>", response_text, re.IGNORECASE | re.DOTALL)
    if diagram_match:
        diagram_board = diagram_match.group(1).strip()
        response_text = re.sub(r"<diagram_board[^>]*>.*?</diagram_board>", "", response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    simulation_board = None
    sim_match = re.search(r"<(?:simulation_board|plotly_data)[^>]*>(.*?)</(?:simulation_board|plotly_data)>", response_text, re.IGNORECASE | re.DOTALL)
    if sim_match:
        simulation_board = sim_match.group(1).strip()
        response_text = re.sub(r"<(?:simulation_board|plotly_data)[^>]*>.*?</(?:simulation_board|plotly_data)>", "", response_text, flags=re.IGNORECASE | re.DOTALL).strip()

    return response_text, math_board, diagram_board, simulation_board

async def generate_for_agent(agent_prompt: str, history: list, text: str, uploaded_files: list) -> tuple:
    messages = []
    messages.append({"role": "user", "parts": [f"{agent_prompt}\n\n{STRICT_GUARDRAILS}"]})
    messages.append({"role": "model", "parts": ["Understood. I will adhere to my persona and the strict output formatting."]})

    last_role = "model"
    for msg in history[-30:]:
        content = msg["content"].strip()
        if not content:
            continue

        current_role = "user" if msg["role"] == "user" else "model"
        
        # Prepend the actual persona name so the LLM knows who said what if it's another bot
        if current_role == "model" and msg["role"] != "jarvis":
            content = f"[{msg['role'].capitalize()}]: {content}"

        if current_role == last_role:
            messages[-1]["parts"][0] += f"\n\n{content}"
        else:
            messages.append({"role": current_role, "parts": [content]})
            last_role = current_role

    final_parts = []
    for g_file in uploaded_files:
        final_parts.append(g_file)
    final_parts.append(text if text.strip() else "[File Attached]")

    if last_role == "user":
        messages[-1]["parts"].extend(final_parts)
    else:
        messages.append({"role": "user", "parts": final_parts})

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

    response = await asyncio.to_thread(_generate)
    response_text = response.text
    
    return extract_boards(response_text)

async def handle_study_group_query(session_id: str, text: str, files_data: list, target_agent: str = "all", send_ui_update=None) -> tuple:
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    uploaded_files = []
    local_file_paths = []
    
    if files_data:
        for i, file_obj in enumerate(files_data):
            file_name = file_obj.get("name", f"upload_{int(time.time())}_{i}.dat")
            b64_string = file_obj.get("data", "")
            if "," in b64_string:
                b64_string = b64_string.split(",")[1]
                
            file_bytes = base64.b64decode(b64_string)
            local_path = os.path.join(temp_dir, file_name)
            
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            local_file_paths.append(local_path)
            
            def _upload():
                print(f"Uploading {file_name} to Gemini...")
                return client.files.upload(file=local_path)
                
            gemini_file = await asyncio.to_thread(_upload)
            uploaded_files.append(gemini_file)

    history = await cloud_engine.load_professor_session(session_id)
    
    if send_ui_update:
        status_msg = "Study Group: Vance and Ada are debating..." if target_agent == "all" else f"Study Group: {target_agent.capitalize()} is analyzing..."
        await send_ui_update({"status": status_msg})
        
    tasks = []
    if target_agent in ["all", "vance"]:
        tasks.append(generate_for_agent(VANCE_PROMPT, history, text, uploaded_files))
    if target_agent in ["all", "ada"]:
        tasks.append(generate_for_agent(ADA_PROMPT, history, text, uploaded_files))
        
    results = await asyncio.gather(*tasks)
    
    vance_res = None
    ada_res = None
    
    if target_agent == "all":
        vance_res, ada_res = results
    elif target_agent == "vance":
        vance_res = results[0]
    elif target_agent == "ada":
        ada_res = results[0]

    for local_path in local_file_paths:
        try:
            os.remove(local_path)
        except Exception:
            pass

    for g_file in uploaded_files:
        try:
            def _delete_remote():
                client.files.delete(name=g_file.name)
            await asyncio.to_thread(_delete_remote)
        except Exception:
            pass

    text_to_save = text if text.strip() else "[File Attached]"
    await cloud_engine.save_professor_message(session_id, "user", text_to_save)
    
    if vance_res:
        await cloud_engine.save_professor_message(session_id, "vance", vance_res[0])
    if ada_res:
        await cloud_engine.save_professor_message(session_id, "ada", ada_res[0])
    
    # Auto-title logic
    if len(history) == 0 and text.strip():
        async def _auto_title():
            try:
                def _gen_title():
                    return client.models.generate_content(
                        model="gemini-3.1-flash-lite",
                        contents=f"Summarize this query into a short 3 to 5 word title. Only return the title, no quotes or preamble:\n{text[:500]}"
                    )
                title_res = await asyncio.to_thread(_gen_title)
                title = title_res.text.strip().replace('"', '')
                if title:
                    await cloud_engine.update_session_title(session_id, title)
            except Exception as e:
                pass
        asyncio.create_task(_auto_title())

    if send_ui_update:
        await send_ui_update({"status": "Debate Complete."})

    return vance_res, ada_res
