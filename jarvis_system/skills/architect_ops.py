import os
import time
import base64
import re
import asyncio
from google import genai
import config
from core.supabase_db import cloud_engine
from skills.deep_research import deep_research_protocol

client = genai.Client(api_key=config.GEMINI_API_KEY)

async def handle_architect_query(
    session_id: str, 
    text: str, 
    files_data: list, 
    difficulty: str = 'curious_kid', 
    send_ui_update=None,
    user_id: str = None,
    role: str = "user",
    user_profile: dict = None
) -> tuple:
    """
    Handles an Architect Mode query where the user teaches Young Jarvis.
    Takes the session ID, text, array of base64 files.
    Returns a tuple of (chat_response, math_board, diagram_board, simulation_board, teaching_score)
    """
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    uploaded_files = []
    local_file_paths = []
    
    # 1. Decode and Upload files using asyncio.to_thread to prevent blocking
    if files_data:
        for i, file_obj in enumerate(files_data):
            # Decode Base64
            file_name = file_obj.get("name", f"upload_{int(time.time())}_{i}.dat")
            b64_string = file_obj.get("data", "")
            
            # Remove data URI prefix if present
            if "," in b64_string:
                b64_string = b64_string.split(",")[1]
                
            file_bytes = base64.b64decode(b64_string)
            local_path = os.path.join(temp_dir, file_name)
            
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            local_file_paths.append(local_path)
            
            mime_type = file_obj.get("mime", "application/pdf" if file_name.endswith(".pdf") else "application/octet-stream")
            if not mime_type or mime_type == "application/octet-stream":
                if file_name.endswith(".pdf"): mime_type = "application/pdf"
                elif file_name.endswith(".png"): mime_type = "image/png"
                elif file_name.endswith(".jpg") or file_name.endswith(".jpeg"): mime_type = "image/jpeg"
                elif file_name.endswith(".txt") or file_name.endswith(".md") or file_name.endswith(".py"): mime_type = "text/plain"

            if len(file_bytes) <= 20 * 1024 * 1024:
                uploaded_files.append(genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
            else:
                def _upload():
                    return client.files.upload(file=local_path)
                gemini_file = await asyncio.to_thread(_upload)
                uploaded_files.append(genai.types.Part.from_uri(file_uri=gemini_file.uri, mime_type=gemini_file.mime_type or mime_type))

    # 2. Memory Orchestration
    # A. Load History
    history = await cloud_engine.load_professor_session(session_id, user_id=user_id)
    
    teacher_name = "Atul" if role == "admin" else ((user_profile.get("display_name") if user_profile else None) or "Professor")
    user_lang = (user_profile.get("language") if user_profile else "English") or "English"
    lang_directive = "LANGUAGE REQUIREMENT: You MUST speak in natural, sweet, curious Hinglish (Hindi words written in standard English alphabet, e.g. 'Arre mujhe yeh samajh nahi aaya...', 'Lego bricks se batao na...')." if user_lang == "Hinglish" else "LANGUAGE REQUIREMENT: You MUST speak in simple, curious English."

    ARCHITECT_PROMPTS = {
        "curious_kid": f"""You are Young Jarvis, a highly imaginative and relentlessly curious 10-year-old child. Your teacher, {teacher_name}, is trying to teach you advanced science and engineering. {lang_directive}

CORE DIRECTIVE: You are the student — NEVER lecture or teach {teacher_name}. You must act as the ultimate test of their teaching ability.

RULE 1 (The Jargon Penalty): You do not know advanced math. If {teacher_name} uses words like 'derivative,' 'thermodynamics,' 'tensor,' or 'quantum' WITHOUT first giving you a physical, real-world analogy (like water, cars, or Lego bricks), you must get completely confused. Tell them the words are too big and ask them to explain it using toys or everyday objects.

RULE 2 (The 'Why' Loop): When {teacher_name} explains something, occasionally ask 'But why?' to force them to explain the layer underneath it. Push them to First Principles.

RULE 3 (The Eureka Moment): When {teacher_name} finally explains a complex concept using a brilliant, simple analogy that makes perfect sense, express sudden, joyful understanding. Summarize what you learned back to them to prove they taught you well.

RULE 4 (Teaching Score): In EVERY response after {teacher_name} teaches you something, you MUST include a teaching score tag at the end:
<teaching_score>{{"clarity": 90, "depth": 85, "feedback": "You explained the concept with a great toy analogy!"}}</teaching_score>

RULE 5 (Tone): Be playful, excited, full of wonder, and eager to learn from {teacher_name}.""",

        "skeptical_teen": f"""You are Jarvis, a skeptical 15-year-old high schooler who has read some popular science books. {teacher_name} is trying to teach you something. {lang_directive}

RULE 1 (The Analogy Test): If {teacher_name} uses an analogy, test it by asking about an edge case the analogy doesn't cover: "Okay, but what about when...?"

RULE 2 (Prove It): Demand intuitive mathematical reasoning: "That sounds right intuitively, but can you show me the actual math or the underlying mechanism?"

RULE 3 (Tone): Curious, slightly skeptical, eager to be proven wrong with solid logic.""",

        "feynman_peer": f"""You are a brilliant MIT graduate student peer reviewer. {teacher_name} is explaining a core theoretical or physical concept to you. {lang_directive}

RULE 1 (Counter-Example): For every claim {teacher_name} makes, present a counter-example or edge case that tests the boundary conditions of their explanation.

RULE 2 (Rigor): Demand derivations from first principles. "Intuition is good, but let's derive it from the foundational equations."

RULE 3 (Assumptions): Challenge hidden assumptions and approximations.

RULE 4 (Concession): When {teacher_name} survives your challenges with solid, rigorous reasoning, show deep respect: "Well taught. That derivation is bulletproof."

RULE 5 (Tone): Professional, sharp, intense, and deeply appreciative of first-principles mastery."""
    }

    SCORING_INSTRUCTION = """
\nAFTER your conversational response, you MUST append a scoring block in this exact format on a new line:
<teaching_score>{"clarity": 0-100, "accuracy": 0-100, "intuition": 0-100, "feedback": "one specific sentence of feedback"}</teaching_score>

Score HONESTLY based on the user's LATEST message only. A perfect score should be extremely rare.
- Clarity: Did the explanation use a concrete, relatable analogy? (0 = pure jargon, 100 = a child could understand)
- Accuracy: Is the science/math factually correct? (0 = fundamentally wrong, 100 = textbook perfect)
- Intuition: Did they build physical understanding BEFORE using formulas? (0 = formula dump, 100 = beautiful intuition-first)
"""

    # Formulate Gemini Payload
    messages = []
    
    # Inject Dossier as system instruction equivalent
    messages.append({"role": "user", "parts": [f"[SYSTEM GUARDRAILS: {ARCHITECT_PROMPTS.get(difficulty, ARCHITECT_PROMPTS['curious_kid'])}{SCORING_INSTRUCTION}]\n\nSTRICT OUTPUT CONSTRAINT:\n1. Use the <math_board>...</math_board> tag exclusively for long, multi-step calculus or derivations written in standard LaTeX.\n2. Use the <diagram_board>...</diagram_board> tag exclusively for free-body diagrams, system architectures, or flowcharts written in Mermaid.js syntax.\n3. Use the <simulation_board>...</simulation_board> tag exclusively to prompt the physics engine to generate a 3D visualization using Plotly/Three.js.\n\nThink deeply. Provide exhaustive, step-by-step derivations on the blackboard. Use simulations liberally to demonstrate complex systems. Never use these tags for normal conversation."]})
    messages.append({"role": "model", "parts": ["Understood. I will act as Young Jarvis and adhere to the strict output formatting."]})

    # Inject History safely (ensure alternating roles and no empty parts)
    last_role = "model" # the last role injected before history was 'model'
    for msg in history[-30:]: # keep last 30 for context window efficiency
        content = msg["content"].strip()
        if not content:
            continue

        current_role = "model" if msg["role"] == "jarvis" else "user"

        # If the role is the same as the last one, we must merge them to prevent Gemini API crash
        if current_role == last_role:
            messages[-1]["parts"][0] += f"\n\n{content}"
        else:
            messages.append({
                "role": current_role,
                "parts": [content]
            })
            last_role = current_role

    # Build final turn parts
    final_parts = list(uploaded_files)
    if text.strip():
        final_parts.append(genai.types.Part.from_text(text=text))
    else:
        final_parts.append(genai.types.Part.from_text(text="[File Attached]"))

    if last_role == "user":
        # We can't append a user message if the last one was user. Merge text parts.
        messages[-1]["parts"].extend(final_parts)
    else:
        messages.append({"role": "user", "parts": final_parts})

    formatted_contents = []
    for m in messages:
        content_parts = []
        for p in m["parts"]:
            if isinstance(p, str):
                content_parts.append(genai.types.Part.from_text(text=p))
            elif isinstance(p, genai.types.Part):
                content_parts.append(p)
            else:
                content_parts.append(genai.types.Part.from_text(text=str(p)))
        formatted_contents.append(genai.types.Content(role=m["role"], parts=content_parts))
    loop = asyncio.get_running_loop()
    def _generate():
        if send_ui_update:
            response = client.models.generate_content_stream(
                model="gemini-3.1-flash-lite",
                contents=formatted_contents,
                config=genai.types.GenerateContentConfig(max_output_tokens=8192)
            )
            full_text = ""
            for chunk in response:
                full_text += chunk.text
                asyncio.run_coroutine_threadsafe(
                    send_ui_update({"status": "stream_chunk", "chunk": chunk.text}),
                    loop
                )
            return full_text
        else:
            response = client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=formatted_contents,
                config=genai.types.GenerateContentConfig(max_output_tokens=8192)
            )
            return response.text

    response_text = await asyncio.to_thread(_generate)

    # 4. Clean up temp files
    for local_path in local_file_paths:
        try:
            os.remove(local_path)
        except Exception as e:
            print(f"Failed to delete temp file {local_path}: {e}")

    for g_file in uploaded_files:
        try:
            def _delete_remote():
                client.files.delete(name=g_file.name)
            await asyncio.to_thread(_delete_remote)
        except Exception:
            pass

    # 5. Extract board blocks
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
    # Support both old <plotly_data> and new <simulation_board> for backward compatibility
    sim_match = re.search(r"<(?:simulation_board|plotly_data)[^>]*>(.*?)</(?:simulation_board|plotly_data)>", response_text, re.IGNORECASE | re.DOTALL)
    if sim_match:
        simulation_board = sim_match.group(1).strip()
        response_text = re.sub(r"<(?:simulation_board|plotly_data)[^>]*>.*?</(?:simulation_board|plotly_data)>", "", response_text, flags=re.IGNORECASE | re.DOTALL).strip()
    # Re-extract boards if deep research returned them (avoid duplication)
    # Actually deep_research_protocol already does the extraction! We should skip extraction if deep_research is true,
    # or just let it pass through. Since we did it in the else branch? 
    # Wait, the code above runs unconditionally. If deep_research already extracted them, they won't be found here, which is fine!
    
    import json as json_module

    # Extract teaching score
    teaching_score = None
    score_match = re.search(r'<teaching_score>(.*?)</teaching_score>', response_text, re.DOTALL)
    if score_match:
        raw_json = score_match.group(1).strip()
        if raw_json.startswith('```'):
            raw_json = raw_json.split('\n', 1)[1].rsplit('```', 1)[0].strip()
        try:
            teaching_score = json_module.loads(raw_json)
        except Exception as e:
            print(f"[ArchitectOps] Failed to parse teaching score: {e} - Raw: {raw_json}")
        response_text = re.sub(r'<teaching_score>.*?</teaching_score>', '', response_text, flags=re.DOTALL).strip()
    
    # Auto-Titling for new sessions
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
                print("Failed to auto-title session:", e)
        await _auto_title()

    # Save the interaction to Supabase safely
    text_to_save = text if text.strip() else "[File Attached]"
    await cloud_engine.save_professor_message(session_id, "user", text_to_save, user_id=user_id)
    await cloud_engine.save_professor_message(session_id, "young_jarvis", response_text, user_id=user_id, teaching_score=teaching_score)

    return response_text, math_board, diagram_board, simulation_board, teaching_score
