import asyncio
import json
import time
import re
import urllib.request
import urllib.parse
from google import genai
import config
from core.supabase_db import cloud_engine

client = genai.Client(api_key=config.GEMINI_API_KEY)

def is_conversational_query(text: str) -> bool:
    """Detects if user input is small talk, greeting, or simple conversational remark that doesn't need web research."""
    clean = re.sub(r"[^\w\s]", "", text.strip().lower())
    greetings = {
        "hi", "hello", "hey", "hiya", "howdy", "hola", "namaste",
        "good morning", "good afternoon", "good evening", "good day",
        "sup", "yo", "greeting", "greetings",
        "thanks", "thank you", "thx", "ok", "okay", "cool", "got it", "understood",
        "who are you", "what can you do", "help", "help me"
    }
    if clean in greetings:
        return True
    words = clean.split()
    if len(words) <= 2 and words[0] in ["hi", "hello", "hey", "yo"]:
        return True
    return False

async def deep_web_search(query: str) -> str:
    """Uses Wikipedia API to fetch verified academic information asynchronously with disambiguation handling."""
    try:
        clean_q = re.sub(r'[^\w\s\-]', ' ', query).strip()
        if not clean_q:
            return ""

        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(clean_q)}&utf8=&format=json"
        
        def fetch_search():
            req = urllib.request.Request(
                search_url, 
                headers={'User-Agent': 'JarvisAcademicResearch/2.0 (mailto:admin@jarvis.local)'}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                return json.loads(response.read().decode())
                
        search_data = await asyncio.to_thread(fetch_search)
        results = search_data.get('query', {}).get('search', [])
        if not results:
            return ""
            
        # Select best title, avoiding disambiguation pages
        selected_title = None
        for item in results[:3]:
            title = item.get('title', '')
            if 'disambiguation' not in title.lower():
                selected_title = title
                break
        if not selected_title:
            selected_title = results[0]['title']
            
        page_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&titles={urllib.parse.quote(selected_title)}&format=json"
        
        def fetch_page():
            req = urllib.request.Request(
                page_url, 
                headers={'User-Agent': 'JarvisAcademicResearch/2.0 (mailto:admin@jarvis.local)'}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                return json.loads(response.read().decode())
                
        page_data = await asyncio.to_thread(fetch_page)
        pages = page_data.get('query', {}).get('pages', {})
        if not pages:
            return ""
            
        extract = list(pages.values())[0].get('extract', '').strip()
        if not extract or extract.lower().startswith("may refer to:"):
            return ""
            
        # Return high-signal academic extract (trimmed to 1200 characters)
        return f"[Academic Reference: {selected_title}]\n{extract[:1200]}"
        
    except Exception as e:
        print(f"[Deep Research Web Node Notice for '{query}']: {e}")
        return ""

async def deep_research_protocol(query: str, session_id: str, history: list, dossier: str, send_ui_update) -> tuple:
    """
    Executes an intelligent multi-agent swarm protocol for deep STEM research.
    Returns (synthesized_response, math_board, diagram_board, simulation_board)
    """
    # ----------------------------------------------------------------
    # FAST-PATH: Greetings & Conversational Remarks (No Web Search)
    # ----------------------------------------------------------------
    if is_conversational_query(query):
        await send_ui_update({"status": "Deep Research Swarm: Standing by."})
        
        # Formulate direct conversational response in character
        conv_messages = []
        conv_messages.append({"role": "user", "parts": [dossier]})
        conv_messages.append({"role": "model", "parts": ["Understood. I will respond warmly and in character as Professor Jarvis."]})
        
        last_role = "model"
        for msg in history[-6:]:
            content = msg.get("content", "").strip()
            if not content: continue
            current_role = "model" if msg.get("role") == "jarvis" else "user"
            if current_role == last_role:
                conv_messages[-1]["parts"][0] += f"\n\n{content}"
            else:
                conv_messages.append({"role": current_role, "parts": [content]})
                last_role = current_role

        user_turn = (
            f"{query}\n\n"
            f"[CONTEXT: The student just greeted you or made small talk while Deep Research mode is ON. "
            f"Respond naturally, warmly, and eloquently in character as Professor Jarvis. Mention that the Deep Research swarm is "
            f"ready to investigate any complex STEM problem, equation, or physical phenomenon from first principles. "
            f"Do NOT generate any blackboard boards or citation tags.]"
        )
        if last_role == "user":
            conv_messages[-1]["parts"][0] += f"\n\n{user_turn}"
        else:
            conv_messages.append({"role": "user", "parts": [user_turn]})

        formatted_contents = [
            genai.types.Content(
                role=m["role"],
                parts=[genai.types.Part.from_text(text=p) if isinstance(p, str) else p for p in m["parts"]]
            )
            for m in conv_messages
        ]

        def _direct_reply():
            return client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=formatted_contents,
                config=genai.types.GenerateContentConfig(max_output_tokens=1024)
            )
        
        reply_res = await asyncio.to_thread(_direct_reply)
        await send_ui_update({"status": ""})
        return reply_res.text.strip(), None, None, None

    # ----------------------------------------------------------------
    # AGENT 1: The Research Strategist (Planner)
    # ----------------------------------------------------------------
    await send_ui_update({"status": "Agent 1 (Planner): Formulating multi-vector research strategy..."})
    
    # Provide recent history context so follow-up inquiries have coherent vectors
    recent_context = ""
    if history:
        recent_turns = []
        for m in history[-3:]:
            role_label = "Student" if m.get("role") != "jarvis" else "Professor"
            c = m.get("content", "").strip()
            if c:
                recent_turns.append(f"{role_label}: {c[:160]}")
        if recent_turns:
            recent_context = f"\nRecent Context:\n" + "\n".join(recent_turns) + "\n"

    planner_prompt = f"""You are the Lead STEM Research Strategist in an elite computational research swarm.
The student has asked a scientific or mathematical inquiry.
Your mission is to decompose this inquiry into exactly 3 high-signal, academic encyclopedia search terms to uncover:
1. The governing theoretical mechanisms and physical laws
2. The exact mathematical formulation, calculus, or conservation equations
3. Physical experiments, experimental verification, or notable edge cases

Student Inquiry: {query}{recent_context}

Return ONLY a valid JSON array of exactly 3 short search terms (2 to 5 words each).
Example: ["Navier-Stokes equations", "Reynolds transport theorem", "Viscous fluid turbulence"]
Do not return any explanations, markdown text, or other wrappers outside the JSON array."""

    search_queries = []
    try:
        def _plan():
            return client.models.generate_content(
                model="gemini-3.5-flash-lite",
                contents=planner_prompt,
                config=genai.types.GenerateContentConfig(temperature=0.2)
            )
        plan_res = await asyncio.to_thread(_plan)
        
        raw_text = plan_res.text.strip()
        json_match = re.search(r"\[.*?\]", raw_text, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, list) and len(parsed) > 0:
                search_queries = [str(x).strip() for x in parsed[:3]]
    except Exception as e:
        print(f"[Deep Research Planner Notice]: {e}")

    if not search_queries:
        search_queries = [query, f"{query} physics", f"{query} equations"]

    # ----------------------------------------------------------------
    # AGENT 2: The Search Swarm (Concurrent Gathering)
    # ----------------------------------------------------------------
    query_labels = ", ".join(search_queries[:3])
    await send_ui_update({"status": f"Agent 2 (Swarm): Searching academic sources for: {query_labels}..."})
    
    tasks = [deep_web_search(sq) for sq in search_queries[:3]]
    results = await asyncio.gather(*tasks)
    
    # Filter out empty or failed results
    valid_sources = [r for r in results if r and len(r.strip()) > 40]
    
    if valid_sources:
        aggregated_data = "\n\n".join(valid_sources)
        swarm_briefing = (
            f"[SWARM RESEARCH BRIEFING: The multi-agent swarm retrieved the following verified academic reference material:\n\n"
            f"{aggregated_data}\n\n"
            f"SYNTHESIS DIRECTIVE:\n"
            f"- Seamlessly integrate this scientific knowledge to explain the mechanisms with absolute factual and mathematical accuracy.\n"
            f"- CRITICAL PERSONA RULE: Speak strictly as Professor Jarvis. NEVER say 'Source 1 states', 'According to Source 2', 'The swarm retrieved', or cite the sources like a bibliography. Deliver the knowledge directly and authoritatively from first principles.\n"
            f"- Anchor abstract concepts in clear real-world physical analogies and thought experiments before deriving formulas.\n"
            f"- Adhere to all OUTPUT INTELLIGENCE RULES (clean LaTeX in <math_board>, Mermaid in <diagram_board>, Plotly in <simulation_board>).]"
        )
    else:
        swarm_briefing = (
            "[SWARM RESEARCH BRIEFING: Synthesize this topic thoroughly from foundational first principles of physics and mathematics as Professor Jarvis. "
            "Speak directly to the student without referencing external search mechanics.]"
        )
    
    # ----------------------------------------------------------------
    # AGENT 3: The Socratic Synthesizer
    # ----------------------------------------------------------------
    await send_ui_update({"status": "Agent 3 (Synthesizer): Synthesizing data into first-principles Socratic breakdown..."})
    
    messages = []
    messages.append({
        "role": "user", 
        "parts": [dossier]
    })
    messages.append({
        "role": "model", 
        "parts": ["Understood. I will synthesize the inquiry from first principles, integrate the swarm research seamlessly without citation jargon, and deliver an authoritative Socratic breakdown."]
    })
    
    # Inject history safely
    last_role = "model"
    for msg in history[-8:]:
        content = msg.get("content", "").strip()
        if not content: continue
        current_role = "model" if msg.get("role") == "jarvis" else "user"
        if current_role == last_role:
            messages[-1]["parts"][0] += f"\n\n{content}"
        else:
            messages.append({"role": current_role, "parts": [content]})
            last_role = current_role
            
    # Inject the user query with the research context
    research_turn = f"{query}\n\n{swarm_briefing}"
    if last_role == "user":
        messages[-1]["parts"][0] += f"\n\n{research_turn}"
    else:
        messages.append({"role": "user", "parts": [research_turn]})
        
    formatted_contents = [
        genai.types.Content(
            role=m["role"],
            parts=[genai.types.Part.from_text(text=p) if isinstance(p, str) else p for p in m["parts"]]
        )
        for m in messages
    ]

    def _synthesize():
        return client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=formatted_contents,
            config=genai.types.GenerateContentConfig(max_output_tokens=8192)
        )
        
    synth_res = await asyncio.to_thread(_synthesize)
    response_text = synth_res.text.strip()
    
    await send_ui_update({"status": "Research Complete. Rendering Whiteboard."})
    
    # ----------------------------------------------------------------
    # Blackboard Post-Processing
    # ----------------------------------------------------------------
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
