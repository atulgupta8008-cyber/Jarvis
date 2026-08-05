import asyncio
import json
import time
from google import genai
import config
from core.supabase_db import cloud_engine

client = genai.Client(api_key=config.GEMINI_API_KEY)

import urllib.request
import urllib.parse

async def deep_web_search(query: str) -> str:
    """Uses Wikipedia API to fetch real academic information asynchronously."""
    try:
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
        
        def fetch_search():
            req = urllib.request.Request(search_url, headers={'User-Agent': 'JarvisDeepResearch/1.0'})
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
                
        search_data = await asyncio.to_thread(fetch_search)
        
        if not search_data.get('query', {}).get('search'):
            return f"No academic sources found for {query}."
            
        first_title = search_data['query']['search'][0]['title']
        
        page_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles={urllib.parse.quote(first_title)}&format=json"
        
        def fetch_page():
            req = urllib.request.Request(page_url, headers={'User-Agent': 'JarvisDeepResearch/1.0'})
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode())
                
        page_data = await asyncio.to_thread(fetch_page)
        
        pages = page_data.get('query', {}).get('pages', {})
        extract = list(pages.values())[0].get('extract', '')
        
        if not extract:
            return f"Source found but content is empty for {query}."
            
        return f"[Source: Wikipedia - {first_title}]\n{extract}"
        
    except Exception as e:
        return f"Failed to fetch data for {query}: {e}"

async def deep_research_protocol(query: str, session_id: str, history: list, dossier: str, send_ui_update) -> tuple:
    """
    Executes a multi-agent swarm protocol for deep research.
    Returns (synthesized_response, math_board, diagram_board, simulation_board)
    """
    # ----------------------------------------------------------------
    # AGENT 1: The Planner
    # ----------------------------------------------------------------
    await send_ui_update({"status": "Agent 1 (Planner): Decomposing query into distinct search vectors..."})
    
    planner_prompt = f"""
    You are the Lead Researcher (Agent 1) in a multi-agent swarm.
    Your job is to break down the user's complex query into exactly 3 highly specific search queries.
    Return ONLY a JSON array of strings, nothing else.
    
    User Query: {query}
    """
    
    try:
        def _plan():
            return client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=planner_prompt
            )
        plan_res = await asyncio.to_thread(_plan)
        
        # Parse JSON
        raw_text = plan_res.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        search_queries = json.loads(raw_text.strip())
        if not isinstance(search_queries, list):
            search_queries = [query]
    except Exception as e:
        print(f"Planner failed: {e}")
        search_queries = [query, f"History of {query}", f"Mathematical models of {query}"]
        
    # ----------------------------------------------------------------
    # AGENT 2: The Swarm (Concurrent Execution)
    # ----------------------------------------------------------------
    await send_ui_update({"status": f"Agent 2 (Swarm): Spawning 3 concurrent asynchronous search nodes..."})
    
    tasks = []
    for sq in search_queries[:3]:
        tasks.append(deep_web_search(sq))
        
    await send_ui_update({"status": f"Agent 2 (Swarm): Nodes active. Searching: {', '.join(search_queries[:3])}"})
    
    # Non-blocking concurrent gather
    results = await asyncio.gather(*tasks)
    
    aggregated_data = "\n\n".join([f"Source {i+1} ({search_queries[i]}): {results[i]}" for i in range(len(results))])
    
    # ----------------------------------------------------------------
    # AGENT 3: The Socratic Synthesizer
    # ----------------------------------------------------------------
    await send_ui_update({"status": "Agent 3 (Synthesizer): Aggregating data and compiling Master Response..."})
    
    messages = []
    messages.append({
        "role": "user", 
        "parts": [
            f"[SYSTEM GUARDRAILS: {dossier}]\n\n"
            f"STRICT OUTPUT CONSTRAINT:\n"
            f"1. Use the <math_board>...</math_board> tag exclusively for long, multi-step calculus or derivations written in standard LaTeX.\n"
            f"2. Use the <diagram_board>...</diagram_board> tag exclusively for free-body diagrams, system architectures, or flowcharts written in Mermaid.js syntax.\n"
            f"3. Use the <simulation_board>...</simulation_board> tag exclusively to prompt the physics engine to generate a 3D visualization using Plotly/Three.js.\n\n"
            f"Think deeply. Provide exhaustive, step-by-step derivations on the blackboard. Use simulations liberally to demonstrate complex systems. Never use these tags for normal conversation."
        ]
    })
    messages.append({"role": "model", "parts": ["Understood. I will adhere to the Socratic guardrails and strict output formatting."]})
    
    # Inject minimal history context
    last_role = "model"
    for msg in history[-4:]:
        content = msg["content"].strip()
        if not content: continue
        current_role = "model" if msg["role"] == "jarvis" else "user"
        if current_role == last_role:
            messages[-1]["parts"][0] += f"\n\n{content}"
        else:
            messages.append({"role": current_role, "parts": [content]})
            last_role = current_role
            
    # Inject the deep research payload
    research_payload = f"USER QUERY: {query}\n\nDEEP RESEARCH DATA GATHERED BY SWARM:\n{aggregated_data}\n\nSynthesize this information deeply and provide an exhaustive, academic answer using the blackboard tags."
    
    if last_role == "user":
        messages[-1]["parts"].append(research_payload)
    else:
        messages.append({"role": "user", "parts": [research_payload]})
        
    formatted_contents = [
        genai.types.Content(
            role=m["role"],
            parts=[genai.types.Part.from_text(text=p) if isinstance(p, str) else p for p in m["parts"]]
        )
        for m in messages
    ]
    def _synthesize():
        return client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=formatted_contents,
            config=genai.types.GenerateContentConfig(max_output_tokens=8192)
        )
        
    await send_ui_update({"status": "Agent 3 (Synthesizer): Generating multi-modal academic report..."})
    synth_res = await asyncio.to_thread(_synthesize)
    response_text = synth_res.text
    
    await send_ui_update({"status": "Research Complete. Rendering Whiteboard."})
    
    # ----------------------------------------------------------------
    # Post-Processing
    # ----------------------------------------------------------------
    import re
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
