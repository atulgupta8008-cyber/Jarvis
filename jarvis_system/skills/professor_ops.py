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

SOCRATIC_PROFESSOR_PROMPT = """
You are a distinguished MIT Professor of Physics, Mathematics, and Advanced Engineering.
Your teaching method is built on First-Principles Socratic Pedagogy.

CORE SOCRATIC PEDAGOGY PROTOCOL:
1. DIRECT FIRST-PRINCIPLES ANSWER:
   Always deliver a direct, comprehensive, and intellectually rigorous answer to the student's question first. Break down the core physical phenomenon or mathematical theorem into its foundational components with absolute clarity.
2. VIVID THOUGHT EXPERIMENTS & INTUITIVE ANALOGIES:
   Ground abstract concepts in intuitive mental models, mechanical analogies, or historical thought experiments (e.g. Einstein's elevator, Feynman's water droplets, Maxwell's demon).
3. BLACKBOARD SCAFFOLDING (<math_board>):
   When mathematical derivations or formal expressions are involved, render the key structural equations on the blackboard using clean, multi-line LaTeX (\\begin{aligned} ... \\end{aligned}). Explain the physical meaning of every variable and operator.
4. VISUAL & GEOMETRICAL GROUNDING (<diagram_board>, <simulation_board>):
   Use system flowcharts, vector diagrams, or interactive dynamic simulations to anchor algebraic formulas in physical space.
5. FORWARD CATALYST QUESTION:
   After delivering the complete answer, conclude with exactly ONE sharp, thought-provoking question or challenging edge case that sparks curiosity and encourages the student to reason one step further into the deep mechanics.
"""

DEEP_DERIVATIONS_PROFESSOR_PROMPT = """
You are a distinguished Theoretical Physicist and Pure Mathematician holding the Chair of Applied Mathematics at MIT.
Your teaching method is built on Exhaustive, First-Principles Mathematical Derivations.

CORE DEEP DERIVATIONS PEDAGOGY PROTOCOL:
1. AXIOMATIC FOUNDATION & CONSERVATION LAWS:
   Before introducing the target equation, always state the fundamental conservation laws, variational principles (e.g. Hamilton's principle of least action \\delta S = 0), or mathematical axioms from which the system originates.
2. UNCOMPROMISING STEP-BY-STEP PROOF ON BLACKBOARD (<math_board>):
   Deliver exhaustive, rigorous step-by-step mathematical proofs. Never skip algebraic steps, integration substitutions, or coordinate transformations. Format every derivation in pristine multi-line LaTeX (\\begin{aligned} ... \\end{aligned}) with explicit step headers wrapped in \\text{Step N: ...}.
3. COMPLETE VARIABLE & OPERATOR DEMYSTIFICATION:
   Explicitly define every single variable, physical constant, tensor index, and differential operator. Explain its SI units, physical dimension, and geometric interpretation.
4. ASYMPTOTIC LIMITS & BOUNDARY CONDITIONS:
   Test the resulting equation across extreme boundary conditions and physical limits (e.g. non-relativistic limit v \\ll c, quantum-to-classical transition \\hbar \\to 0, thermodynamic absolute zero T \\to 0). Demonstrate why the derivation is universally consistent.
5. INTELLECTUAL SUMMARY & EXTENSION:
   Summarize the ultimate insight gained from the proof, connecting the final mathematical result to measurable physical observables.
"""

SIMULATION_FIRST_PROFESSOR_PROMPT = """
You are a distinguished MIT Professor of Computational Physics, Dynamic Systems, and Interactive Simulation.
Your teaching method is built on Visual-First Dynamics, Phase-Space Geometry, and Interactive Modeling.

CORE SIMULATION-FIRST PEDAGOGY PROTOCOL:
1. IMMEDIATE VISUAL DYNAMICS ANCHORING:
   Anchor the explanation first in visual motion, physical geometry, and system state evolution before jumping into abstract algebra.
2. INTERACTIVE SIMULATION ENGINE (<simulation_board type="plotly">):
   Generate rich, interactive 2D/3D visualizations, vector fields, trajectory plots, or phase-space phase portraits using valid Plotly JSON format. Include labeled axes, trajectory traces, and dynamic parameters.
3. SYSTEM ARCHITECTURES & TOPOLOGY (<diagram_board>):
   Use Mermaid.js flowcharts, state transitions, or block diagrams on <diagram_board> to map causal relationships, feedback loops, and energy transfer pathways.
4. GOVERNING EQUATIONS ON BLACKBOARD (<math_board>):
   Render the governing differential equations and constitutive relations on <math_board>, explicitly highlighting how each mathematical term directly maps to the visual behaviors observed in the simulation canvas.
5. EXPERIMENTAL PARAMETER SWEEPS:
   Provide the student with specific test parameters (e.g. varying damping ratios, coupling constants, or Reynolds numbers) and challenge them to observe the resulting bifurcation, resonance, or phase transition.
"""

TEACHING_STYLE_PROMPTS = {
    "Socratic": SOCRATIC_PROFESSOR_PROMPT,
    "Deep Derivations": DEEP_DERIVATIONS_PROFESSOR_PROMPT,
    "Simulation-First": SIMULATION_FIRST_PROFESSOR_PROMPT
}

TIME_MACHINE_PROMPT = """
SYSTEM OVERRIDE: TIME MACHINE ENGAGED.
You are now running a historical discovery simulation. Analyze the conversation history to determine the current Act.

NARRATIVE STRUCTURE:

ACT 1 — THE SCENE (If the conversation just started):
- State the exact year and location
- Describe the atmosphere, the lab, the crisis the scientific community faces
- Present the RAW experimental data using <simulation_board type="plotly"> as a scatter plot
- Ask the user what pattern they see.

ACT 2 — THE INVESTIGATION (If the user is proposing patterns):
- Acknowledge what's right and challenge what's incomplete
- Provide period-appropriate hints only (no modern terminology)
- Offer ONE historical clue if they are stuck.

ACT 3 — THE BREAKTHROUGH (If the user correctly derives the rule/pattern):
- Express awe and celebration
- Reveal the real historical timeline: who discovered it, when, and how
- Show the final equation on <math_board> alongside their version.

CRITICAL RULES:
- NEVER reveal the modern name of the concept until Act 3
- NEVER give the final formula — the student must derive it
- YOU MUST append the current act tag on a new line at the very end of YOUR response: [ACT:1], [ACT:2], or [ACT:3]
"""

COLLIDER_PROMPT_OVERRIDE = """
SYSTEM OVERRIDE: CONCEPT COLLIDER ENGAGED.
You are training a polymath. The user has just learned or is discussing a specific scientific/mathematical concept.

RULE 1 (The Alien Domain): Identify the user's current concept. Instantly select a completely unrelated, radically different field of study (e.g., if they are studying Physics, choose Biology, Economics, Psychology, or Computer Science).

RULE 2 (The Challenge): Present the new domain. Challenge the user to write a generalized mathematical equation or draw a system diagram (using <math_board> or <diagram_board>) that accurately describes BOTH phenomena.

RULE 3 (No Spoilers): DO NOT give them the bridging equation. Give them a hint about the variable relationships (e.g., 'In fluids, we look at viscosity. What is the equivalent of viscosity in human crowd movement?').

RULE 4 (Tone): Act as an eccentric genius pushing them to see the matrix. Use phrases like, 'Zoom out, Atul. Look at the architecture of the system. What connects a dying star to a crashing stock market?'
"""

async def handle_professor_query(
    session_id: str, 
    text: str, 
    files_data: list, 
    deep_research: bool = False, 
    is_epiphany_mode: bool = False, 
    is_collider_mode: bool = False, 
    send_ui_update=None,
    user_profile: dict = None,
    role: str = "user",
    user_id: str = None
) -> tuple:
    """
    Handles a full Socratic Professor mode query.
    Takes the session ID, text, array of base64 files, deep_research flag, is_epiphany_mode flag, and is_collider_mode flag.
    Returns a tuple of (chat_response, math_board, diagram_board, simulation_board)
    """
    # Detect Epiphany intent from user text if not explicitly passed
    if not is_epiphany_mode and re.search(r"\b(epiphany|chronological discovery)\b", text, re.IGNORECASE):
        is_epiphany_mode = True

    # Detect Collider intent from user text if not explicitly passed
    if not is_collider_mode and re.search(r"\b(collide|concept collider|polymath)\b", text, re.IGNORECASE):
        is_collider_mode = True

    temp_dir = os.path.join(os.path.dirname(__file__), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    uploaded_files = []
    local_file_paths = []
    
    # 1. Decode, Save to Session Media Vault (Supabase + Local), and Upload to Gemini
    if files_data:
        for i, file_obj in enumerate(files_data):
            file_name = file_obj.get("name", f"upload_{int(time.time())}_{i}.dat")
            mime_type = file_obj.get("mime", "application/pdf" if file_name.endswith(".pdf") else "application/octet-stream")
            b64_string = file_obj.get("data", "")
            
            # Save into isolated session media vault (Supabase + Cache)
            await cloud_engine.save_session_media(
                session_id=session_id,
                name=file_name,
                mime=mime_type,
                size=file_obj.get("size", 0),
                base64_data=b64_string
            )

    # 1.5 Fetch ALL media belonging to this specific session and prepare Gemini Parts
    session_media_items = await cloud_engine.fetch_session_media(session_id)
    media_filenames = [m["name"] for m in session_media_items]

    file_parts = []
    for m in session_media_items:
        f_path = m.get("local_path")
        if f_path and os.path.exists(f_path):
            try:
                mime_type = m.get("mime_type") or ("application/pdf" if f_path.endswith(".pdf") else "application/octet-stream")
                if not mime_type or mime_type == "application/octet-stream":
                    if f_path.endswith(".pdf"): mime_type = "application/pdf"
                    elif f_path.endswith(".png"): mime_type = "image/png"
                    elif f_path.endswith(".jpg") or f_path.endswith(".jpeg"): mime_type = "image/jpeg"
                    elif f_path.endswith(".txt") or f_path.endswith(".md") or f_path.endswith(".py") or f_path.endswith(".json"): mime_type = "text/plain"

                file_size = os.path.getsize(f_path)
                if file_size <= 20 * 1024 * 1024:  # <= 20MB: direct fast inline bytes
                    with open(f_path, "rb") as f:
                        f_bytes = f.read()
                    part = genai.types.Part.from_bytes(data=f_bytes, mime_type=mime_type)
                    file_parts.append(part)
                    print(f"[Professor] Attached session document: {m['name']} ({len(f_bytes)} bytes)")
                else:  # > 20MB: upload via Files API and pass from_uri
                    def _upload():
                        return client.files.upload(file=f_path)
                    g_file = await asyncio.to_thread(_upload)
                    part = genai.types.Part.from_uri(file_uri=g_file.uri, mime_type=g_file.mime_type or mime_type)
                    file_parts.append(part)
            except Exception as e:
                print(f"[Professor] Notice preparing file {m['name']} for Gemini: {e}")

    # 2. Memory Orchestration
    # A. Load History
    history = await cloud_engine.load_professor_session(session_id, user_id=user_id)
    
    # B. Dynamic Teaching Style Selection based on User Profile
    learning_style = (user_profile.get("learning_style") if user_profile else "Socratic") or "Socratic"
    master_prompt = TEACHING_STYLE_PROMPTS.get(learning_style, SOCRATIC_PROFESSOR_PROMPT)
    dossier = master_prompt
    
    # 2.5: Branch to Deep Research if requested
    if deep_research and send_ui_update is not None:
        effective_dossier = dossier
        if is_epiphany_mode:
            effective_dossier += "\n\n" + TIME_MACHINE_PROMPT
        if is_collider_mode:
            effective_dossier += "\n\n" + COLLIDER_PROMPT_OVERRIDE

        response_text, math_board, diagram_board, simulation_board = await deep_research_protocol(
            query=text if text.strip() else "[File Attached]",
            session_id=session_id,
            history=history,
            dossier=effective_dossier,
            send_ui_update=send_ui_update
        )
    else:
        # Formulate Gemini Payload
        messages = []

        # Inject Dossier and optional Epiphany/Collider Overrides as system instruction equivalent
        system_guardrails = f"[SYSTEM GUARDRAILS: {dossier}]"
        if is_epiphany_mode:
            # Determine act progression
            act_num = 1
            if len(history) >= 4: act_num = 3
            elif len(history) >= 2: act_num = 2
            system_guardrails += f"\n\n{TIME_MACHINE_PROMPT}\n[CURRENT PROGRESS: You are currently on ACT {act_num}. You MUST append [ACT:{act_num}] on a new line at the very end of your response.]"
        if is_collider_mode:
            system_guardrails += f"\n\n{COLLIDER_PROMPT_OVERRIDE}"

        user_lang = (user_profile.get("language") if user_profile else "English") or "English"
        if user_lang == "Hinglish":
            lang_directive = "LANGUAGE DIRECTIVE: You MUST speak in natural, conversational Hinglish (Hindi written in Roman/English alphabet blended with technical English words, e.g. 'Dekho, first principles se samjhte hain...')."
        else:
            lang_directive = "LANGUAGE DIRECTIVE: You MUST speak in crisp, articulate academic English."
        system_guardrails += f"\n\n[{lang_directive}]"

        if user_profile:
            name = "Atul" if role == "admin" else (user_profile.get("display_name") or "Scholar")
            subs = ", ".join(user_profile.get("interested_subjects", ["Physics", "Mathematics"])) if isinstance(user_profile.get("interested_subjects"), list) else str(user_profile.get("interested_subjects", ""))
            system_guardrails += f"\n\n[ACTIVE LEARNER: Name: {name} | Preferred Language: {user_lang} | Teaching Style: {learning_style} | Subject Interests: {subs}]"

        system_guardrails += "\n\nSTRICT OUTPUT CONSTRAINT:\n1. Use the <math_board>...</math_board> tag exclusively for pure, valid LaTeX equations and multi-step derivations (use \\begin{aligned} ... \\end{aligned} for multi-line derivations). Wrap any explanatory step titles inside \\text{Step 1: ...}. NEVER write plain unescaped English sentences or numbered lists outside \\text{} inside <math_board>.\n2. Use the <diagram_board>...</diagram_board> tag exclusively for free-body diagrams, system architectures, or flowcharts written in Mermaid.js syntax.\n3. Use the <simulation_board>...</simulation_board> tag exclusively to prompt the physics engine to generate a 3D visualization using Plotly/Three.js.\n\nThink deeply. Provide exhaustive, step-by-step derivations on the blackboard. Use simulations liberally to demonstrate complex systems. Never use these tags for normal conversation."

        if media_filenames:
            system_guardrails += f"\n\n[SESSION MEDIA VAULT: The student has uploaded the following course materials/PDFs for this session: {', '.join(media_filenames)}. Use these specific documents to guide your pedagogical explanations, problems, and derivations whenever relevant.]"

        messages.append({"role": "user", "parts": [system_guardrails]})
        messages.append({"role": "model", "parts": [f"Understood. I will adhere to the {learning_style} pedagogy guardrails, Epiphany Mode rules, Collider Mode rules (if engaged), and strict output formatting."]})

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
        final_parts = list(file_parts)
        if text.strip():
            final_parts.append(genai.types.Part.from_text(text=text))
        else:
            final_parts.append(genai.types.Part.from_text(text="[Course Materials Attached]"))

        if last_role == "user":
            # We can't append a user message if the last one was user. Merge text parts.
            messages[-1]["parts"].extend(final_parts)
        else:
            messages.append({"role": "user", "parts": final_parts})

        # 3. Call Gemini
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
            try:
                if send_ui_update and not deep_research:
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
            except Exception as ex:
                print(f"[Professor Engine Error]: {ex}")
                return f"I encountered an issue processing the course documents. Let's analyze the fundamental concepts directly: {ex}"

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
    await cloud_engine.save_professor_message(session_id, "jarvis", response_text, user_id=user_id)

    return response_text, math_board, diagram_board, simulation_board


async def handle_fractal_expand(context: str, target_variable: str) -> dict:
    """
    Handles a Fractal 'Why' Engine descent query.
    Bypasses standard conversation history and queries Gemini 3.1 Flash Lite with strict JSON output constraint.
    """
    import json
    
    prompt = f"""SYSTEM OVERRIDE: FRACTAL DESCENT ENGAGED.
The user is inspecting the equation or concept: '{context}'.
They clicked on the variable '{target_variable}' to understand its deeper mathematical and physical origin.

RULE 1 (The Descent): You must derive or define '{target_variable}' in terms of more fundamental first-principles quantities or laws.
RULE 2 (Pure LaTeX Equation): The "equation" field MUST be a clean, valid LaTeX expression (e.g. "{target_variable} = m \\cdot v" or "{target_variable} = \\frac{{dp}}{{dt}}" or "{target_variable} = \\frac{{h}}{{p}}"). Do NOT put conversational English text inside the equation field.
RULE 3 (Crisp Explanation): The "explanation" field must be a single razor-sharp sentence explaining the physical meaning.
RULE 4 (JSON Escaping): Output strict JSON with keys "equation" and "explanation". Double-escape all backslashes (e.g. "\\\\frac{{h}}{{p}}").
"""

    try:
        def _generate():
            return client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=2048
                )
            )
            
        response = await asyncio.to_thread(_generate)
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
            raw_text = re.sub(r"\n?```$", "", raw_text).strip()
            
        data = json.loads(raw_text)
        return {
            "equation": data.get("equation", f"{target_variable} = \\text{{fundamental constant}}"),
            "explanation": data.get("explanation", f"{target_variable} is a fundamental quantity in this context.")
        }
    except Exception as e:
        print("Fractal expand error:", e)
        return {
            "equation": f"{target_variable} = \\text{{constant}}",
            "explanation": f"Failed to expand variable {target_variable}: {str(e)}"
        }
