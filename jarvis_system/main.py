import asyncio
import json
import os
try:
    import pygame
    HAS_PYGAME = True
except ImportError:
    pygame = None
    HAS_PYGAME = False
import edge_tts
import time
import psutil

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Import Core Modules
from core.ears import wait_for_wake_word, listen_and_transcribe
from core.brain import JarvisBrain

# Import All Skill Modules
import skills.web_ops as web_ops
import skills.productivity as productivity
import skills.interpreter as interpreter
import skills.macro_ops as macro_ops
import skills.space_ops as space_ops
import skills.visualizer as visualizer
import skills.physics_ops as physics_ops
import skills.professor_ops as professor_ops
import skills.study_group as study_group
import skills.architect_ops as architect_ops
import skills.curiosity_engine as curiosity_engine
import skills.sandbox_ops as sandbox_ops

import api_config

MAX_CHAT_HISTORY = 20
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("JARVIS_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]


def is_local_client(host: str | None) -> bool:
    return host in {"127.0.0.1", "::1", "localhost"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Say 'Jarvis' or type a command"})

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if len(self.active_connections) == 0:
            global VOICE_AGENT_MUTED
            VOICE_AGENT_MUTED = True

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()
# Global queue for handling inputs from any source
input_queue = asyncio.Queue()

# Global flag to mute the voice agent on the main learning platform
VOICE_AGENT_MUTED = True

async def speak_text(text: str):
    """Uses Edge-TTS to generate speech and pygame to play it cleanly."""
    if not text or text.isspace():
        return
        
    try:
        communicate = edge_tts.Communicate(text, "en-US-GuyNeural")
        audio_file = "response.mp3"
        await communicate.save(audio_file)
        
        if HAS_PYGAME and pygame:
            pygame.mixer.init()
            pygame.mixer.music.load(audio_file)
            pygame.mixer.music.play()
            
            while pygame.mixer.music.get_busy():
                await asyncio.sleep(0.1)
                
            pygame.mixer.quit()
        if os.path.exists(audio_file):
            os.remove(audio_file)
    except Exception as e:
        print(f"[TTS Error]: {e}")

async def telemetry_loop():
    """Background task to stream system telemetry to the UI."""
    while True:
        try:
            cpu = psutil.cpu_percent()
            ram = psutil.virtual_memory().percent
            batt_info = psutil.sensors_battery()
            batt = batt_info.percent if batt_info else 100
            
            await manager.broadcast({
                "type": "telemetry",
                "cpu": cpu,
                "ram": ram,
                "batt": batt
            })
        except Exception:
            pass
        await asyncio.sleep(1) # 1 second updates

async def audio_listener_loop():
    """Background listener disabled for main learning platform (Voice Assistant runs in standalone project)."""
    while True:
        await asyncio.sleep(3600)

async def cleanup_loop():
    """Periodically cleans up old simulation files to prevent disk space exhaustion."""
    static_dir = os.path.join(os.path.dirname(__file__), "static", "simulations")
    # Immediate cleanup on startup
    try:
        physics_ops.cleanup_old_simulations(static_dir, max_age_seconds=180, max_files=2)
    except Exception as e:
        print(f"Initial cleanup error: {e}")
        
    while True:
        try:
            physics_ops.cleanup_old_simulations(static_dir, max_age_seconds=180, max_files=2)
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(20)

async def jarvis_processing_loop():
    """Main processing loop that handles inputs from the queue."""
    brain = JarvisBrain()
    user_conversation_histories = {}
    
    os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
    
    while True:
        command = await input_queue.get()
        user_text = command.get("text", "")
        input_type = command.get("type", "text")
        
        global VOICE_AGENT_MUTED
        if input_type == "system_command":
            action = command.get("action")
            if action == "pause_voice_agent":
                VOICE_AGENT_MUTED = True
            elif action == "resume_voice_agent":
                VOICE_AGENT_MUTED = False
            continue
        
        # --- PHASE 3 & 4: THE COGNITIVE ROUTER & SESSION MANAGEMENT ---
        if input_type == "professor_fetch_sessions":
            mode = command.get("mode", "professor")
            user_id = command.get("user_id")
            try:
                sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode, user_id=user_id)
                await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions, "user_id": user_id, "mode": mode})
            except Exception as e:
                print("Error fetching sessions:", e)
            continue
            
        if input_type == "professor_create_session":
            mode = command.get("mode", "professor")
            user_id = command.get("user_id")
            try:
                new_id = await professor_ops.cloud_engine.get_or_create_empty_session(mode=mode, user_id=user_id)
                await manager.broadcast({"type": "professor_session_created", "session_id": new_id, "user_id": user_id, "mode": mode})
                # Auto-refresh sessions list for this user
                sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode, user_id=user_id)
                await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions, "user_id": user_id, "mode": mode})
            except Exception as e:
                print("Error creating session:", e)
            continue
            
        if input_type == "professor_delete_session":
            session_id = command.get("session_id")
            mode = command.get("mode", "professor")
            user_id = command.get("user_id")
            if session_id:
                try:
                    await professor_ops.cloud_engine.delete_session(session_id)
                    sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode, user_id=user_id)
                    await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions, "user_id": user_id, "mode": mode})
                except Exception as e:
                    print("Error deleting session:", e)
            continue

        if input_type == "fractal_expand":
            context = command.get("context", "")
            target_var = command.get("target_variable", "")
            parent_id = command.get("parent_id", "")
            node_id = command.get("node_id", "")
            
            try:
                res = await professor_ops.handle_fractal_expand(context, target_var)
                await manager.broadcast({
                    "type": "fractal_expanded",
                    "parent_id": parent_id,
                    "node_id": node_id,
                    "target_variable": target_var,
                    "equation": res["equation"],
                    "explanation": res["explanation"]
                })
            except Exception as e:
                print(f"Error expanding fractal: {e}")
            continue

        if input_type == "professor_load_history":
            session_id = command.get("session_id", "default_academic_session")
            user_id = command.get("user_id")
            try:
                history = await professor_ops.cloud_engine.load_professor_session(session_id, user_id=user_id)
                await manager.broadcast({"type": "professor_history_loaded", "history": history, "session_id": session_id, "user_id": user_id})
                media_list = await professor_ops.cloud_engine.fetch_session_media(session_id, user_id=user_id)
                await manager.broadcast({"type": "professor_media_loaded", "session_id": session_id, "media": media_list, "user_id": user_id})
            except Exception:
                pass
            continue

        if input_type == "professor_fetch_media":
            session_id = command.get("session_id")
            if session_id:
                try:
                    media_list = await professor_ops.cloud_engine.fetch_session_media(session_id)
                    await manager.broadcast({"type": "professor_media_loaded", "session_id": session_id, "media": media_list})
                except Exception as e:
                    print(f"Error fetching media for {session_id}: {e}")
            continue

        if input_type == "professor_delete_media":
            session_id = command.get("session_id")
            media_id = command.get("media_id")
            if session_id and media_id:
                try:
                    await professor_ops.cloud_engine.delete_session_media(session_id, media_id)
                    media_list = await professor_ops.cloud_engine.fetch_session_media(session_id)
                    await manager.broadcast({"type": "professor_media_loaded", "session_id": session_id, "media": media_list})
                except Exception as e:
                    print(f"Error deleting media {media_id}: {e}")
            continue

        if input_type == "professor_upload_media":
            session_id = command.get("session_id")
            file_obj = command.get("file", {})
            if session_id and file_obj:
                try:
                    await professor_ops.cloud_engine.save_session_media(
                        session_id=session_id,
                        name=file_obj.get("name", "document.pdf"),
                        mime=file_obj.get("mime", "application/pdf"),
                        size=file_obj.get("size", 0),
                        base64_data=file_obj.get("data", "")
                    )
                    media_list = await professor_ops.cloud_engine.fetch_session_media(session_id)
                    await manager.broadcast({"type": "professor_media_loaded", "session_id": session_id, "media": media_list})
                except Exception as e:
                    print(f"Error uploading media for {session_id}: {e}")
            continue

        if input_type == "professor_query":
            await manager.broadcast({"type": "state", "state": "executing", "main_text": "Professor Mode", "sub_text": "Analyzing document and context..."})
            
            # Extract user_id and session_id at the TOP so all branches use them
            session_id = command.get("session_id", "default_academic_session")
            user_id = command.get("user_id")
            files_data = command.get("files", [])
            is_deep_research = command.get("deep_research", False)
            
            async def _send_ui_update(payload):
                if payload.get("status") == "stream_chunk":
                    await manager.broadcast({
                        "type": "professor_stream_chunk",
                        "chunk": payload.get("chunk", ""),
                        "session_id": session_id,
                        "user_id": user_id
                    })
                else:
                    await manager.broadcast({
                        "type": "research_status",
                        "status": payload.get("status", ""),
                        "session_id": session_id,
                        "user_id": user_id
                    })
            
            try:
                await manager.broadcast({"type": "professor_thinking", "is_thinking": True, "session_id": session_id, "user_id": user_id})
                
                is_study_group = command.get("is_study_group", False)
                is_sandbox_mode = command.get("is_sandbox_mode", False)
                import uuid
                import time
                
                if is_sandbox_mode:
                    response_text, math_board, diagram_board, simulation_board = await sandbox_ops.handle_sandbox_query(
                        session_id, user_text, send_ui_update=_send_ui_update
                    )
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False, "session_id": session_id, "user_id": user_id})
                    await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": response_text, "session_id": session_id, "user_id": user_id})
                    # Broadcast board widgets
                    if math_board:
                        await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": math_board, "id": str(uuid.uuid4()), "author": "jarvis", "session_id": session_id, "user_id": user_id})
                    if diagram_board:
                        await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": diagram_board, "id": str(uuid.uuid4()), "author": "jarvis", "session_id": session_id, "user_id": user_id})
                    if simulation_board:
                        sim_url = await physics_ops.simulate_physics(simulation_board)
                        if not sim_url.startswith("Error"):
                            await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "jarvis", "session_id": session_id, "user_id": user_id})
                elif is_study_group:
                    target_agent = command.get("target_agent", "all")
                    vance_res, ada_res = await study_group.handle_study_group_query(
                        session_id, user_text, files_data, target_agent, 
                        send_ui_update=_send_ui_update,
                        user_id=user_id,
                        role=command.get("role", "user"),
                        user_profile=command.get("user_profile")
                    )
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False, "session_id": session_id, "user_id": user_id})
                    
                    if vance_res:
                        # Broadcast Vance
                        await manager.broadcast({"type": "professor_chat", "role": "vance", "message": vance_res[0], "session_id": session_id, "user_id": user_id})
                        if vance_res[1]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": vance_res[1], "id": str(uuid.uuid4()), "author": "vance", "session_id": session_id, "user_id": user_id})
                        if vance_res[2]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": vance_res[2], "id": str(uuid.uuid4()), "author": "vance", "session_id": session_id, "user_id": user_id})
                        if vance_res[3]:
                            sim_url = await physics_ops.simulate_physics(vance_res[3])
                            if not sim_url.startswith("Error"):
                                await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "vance", "session_id": session_id, "user_id": user_id})
                            
                    if ada_res:
                        # Broadcast Ada
                        await manager.broadcast({"type": "professor_chat", "role": "ada", "message": ada_res[0], "session_id": session_id, "user_id": user_id})
                        if ada_res[1]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": ada_res[1], "id": str(uuid.uuid4()), "author": "ada", "session_id": session_id, "user_id": user_id})
                        if ada_res[2]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": ada_res[2], "id": str(uuid.uuid4()), "author": "ada", "session_id": session_id, "user_id": user_id})
                        if ada_res[3]:
                            sim_url = await physics_ops.simulate_physics(ada_res[3])
                            if not sim_url.startswith("Error"):
                                await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "ada", "session_id": session_id, "user_id": user_id})
                            
                else:
                    is_architect_mode = command.get("is_architect_mode", False)
                    teaching_score = None
                    user_profile = command.get("user_profile")
                    user_role = command.get("role", "user")

                    if is_architect_mode:
                        architect_difficulty = command.get("architect_difficulty", "curious_kid")
                        chat_response, math_board, diagram_board, simulation_board, teaching_score = await architect_ops.handle_architect_query(
                            session_id, user_text, files_data, difficulty=architect_difficulty, send_ui_update=_send_ui_update,
                            user_id=user_id, role=user_role, user_profile=user_profile
                        )
                    else:
                        is_epiphany_mode = command.get("is_epiphany_mode", False)
                        is_collider_mode = command.get("is_collider_mode", False)
                        chat_response, math_board, diagram_board, simulation_board = await professor_ops.handle_professor_query(
                            session_id, user_text, files_data, 
                            deep_research=is_deep_research,
                            is_epiphany_mode=is_epiphany_mode,
                            is_collider_mode=is_collider_mode,
                            send_ui_update=_send_ui_update,
                            user_profile=user_profile,
                            role=user_role,
                            user_id=user_id
                        )
                    
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False, "session_id": session_id, "user_id": user_id})
                    
                    role = "young_jarvis" if is_architect_mode else "jarvis"
                    await manager.broadcast({"type": "professor_chat", "role": role, "message": chat_response, "teaching_score": teaching_score, "session_id": session_id, "user_id": user_id})
                    
                    if math_board:
                        await manager.broadcast({
                            "type": "blackboard_widget",
                            "widget_type": "math",
                            "id": str(uuid.uuid4()),
                            "content": math_board,
                            "session_id": session_id,
                            "user_id": user_id
                        })
                        
                    if diagram_board:
                        await manager.broadcast({
                            "type": "blackboard_widget",
                            "widget_type": "diagram",
                            "id": str(uuid.uuid4()),
                            "content": diagram_board,
                            "session_id": session_id,
                            "user_id": user_id
                        })
                    
                    # If a graph was requested, silently route it to The Swarm Physics Engine
                    if simulation_board:
                        await manager.broadcast({"type": "state", "state": "executing", "main_text": "The Swarm", "sub_text": "Generating mathematical visualization..."})
                        result_url = await physics_ops.simulate_physics(simulation_board)
                        if result_url.startswith("http"):
                            await manager.broadcast({
                                "type": "blackboard_widget",
                                "widget_type": "simulation",
                                "id": str(uuid.uuid4()),
                                "content": result_url,
                                "session_id": session_id,
                                "user_id": user_id
                            })
                        else:
                            await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": f"[System: Simulation failed - {result_url}]", "session_id": session_id, "user_id": user_id})
                            
                # Refresh sessions list so auto-titling updates the sidebar immediately (ALL branches)
                mode_for_refresh = "architect" if command.get("is_architect_mode") else ("sandbox" if is_sandbox_mode else ("study_group" if is_study_group else "professor"))
                sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode_for_refresh, user_id=user_id)
                await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions, "user_id": user_id, "mode": mode_for_refresh})
                        
            except Exception as e:
                await manager.broadcast({"type": "professor_thinking", "is_thinking": False, "session_id": session_id, "user_id": user_id})
                print(f"[Professor Engine Error]: {e}")
                await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": f"[System Error]: {e}", "session_id": session_id, "user_id": user_id})
                
            await manager.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Awaiting directive..."})
            continue

        # --- STANDARD JARVIS WEBOS FLOW ---
        if not user_text:
            continue
            
        user_profile = command.get("user_profile")
        user_role = command.get("role", "user")
        user_id = command.get("user_id")
        user_key = user_id or ("admin_master" if user_role == "admin" else "guest_local")

        await manager.broadcast({"type": "chat", "role": "You", "message": user_text, "user_id": user_key})
        
        # 3. CORE PROCESSING (Standard)
        await manager.broadcast({"type": "state", "state": "thinking", "main_text": "Processing", "sub_text": "Accessing Neural Network"})
        
        # 3. THINKING
        if user_key not in user_conversation_histories:
            user_conversation_histories[user_key] = []
        user_history = user_conversation_histories[user_key]

        try:
            response_text, tool_calls = await brain.think(user_text, user_history, input_type=input_type, user_profile=user_profile, role=user_role, user_id=user_id)
            
            # 4. EXECUTING
            if tool_calls:
                await manager.broadcast({"type": "state", "state": "executing", "main_text": "Executing Action...", "sub_text": "Running system tools"})
                
                for tool in tool_calls:
                    name = tool.function.name
                    try:
                        args = json.loads(tool.function.arguments)
                    except json.JSONDecodeError:
                        args = {}
                        
                    needs_summary = False
                    context_data = ""
                    
                    # --- MACRO ROUTINES ---
                    if name == "learn_routine":
                        response_text = macro_ops.learn_routine(args.get("trigger_phrase", ""), args.get("actions_description", ""))
                    elif name == "delete_routine":
                        response_text = macro_ops.delete_routine(args.get("trigger_phrase", ""))
                
                    # --- INFORMATION GATHERING TOOLS ---
                    elif name == "live_web_search":
                        context_data = web_ops.live_web_search(args.get("query", ""))
                        needs_summary = True
                    elif name == "extract_active_window_text":
                        context_data = productivity.extract_active_window_text()
                        needs_summary = True
                    elif name == "execute_python_code": 
                        context_data = interpreter.execute_python_code(args.get("code", ""))
                        needs_summary = True
                    elif name == "get_weather":
                        context_data = productivity.get_weather(args.get("city", ""))
                        needs_summary = True

                    # --- ADVANCED SPACE & ASTROPHYSICS ---
                    elif name == "run_3d_iss_simulation":
                        context_data = space_ops.run_3d_iss_simulation()
                        needs_summary = True
                    elif name == "nasa_asteroid_radar":
                        context_data = space_ops.nasa_asteroid_radar()
                        needs_summary = True
                    elif name == "solar_system_telemetry":
                        context_data = space_ops.solar_system_telemetry(args.get("planet_name", ""))
                        needs_summary = True
                    elif name == "deep_space_research":
                        context_data = space_ops.deep_space_research(args.get("topic", ""))
                        needs_summary = True

                    # --- ACTION TOOLS ---
                    elif name == "search_google":
                        web_ops.search_google(args.get("query", ""))
                        response_text = f"I have searched Google for {args.get('query', '')}."
                    
                    # --- STARK HUD TOOL ---
                    elif name == "toggle_stark_hud":
                        state = args.get("state", "on")
                        productivity.toggle_stark_hud(state)
                        response_text = f"Stark HUD resource overlay has been turned {state}."

                    # --- MEMORY TOOL ---
                    elif name == "store_new_memory":
                        fact = args.get("fact", "")
                        if fact:
                            if brain.memory_manager.add_fact(fact):
                                response_text = f"I have permanently committed that to my core memory files, sir: '{fact}'."
                            else:
                                response_text = f"I already have that recorded in my memory banks, sir."

                    # --- DATA VISUALIZATION ---
                    elif name == "create_interactive_dashboard":
                        await manager.broadcast({
                            "type": "dashboard",
                            "title": args.get("title", "Data Dashboard"),
                            "chart_type": args.get("chart_type", "bar"),
                            "x_data": args.get("x_data", []),
                            "y_data": args.get("y_data", []),
                            "x_label": args.get("x_label", "X"),
                            "y_label": args.get("y_label", "Y")
                        })
                        response_text = "I have rendered the dashboard for you, sir."
                        needs_summary = False
                        
                    # --- PHYSICS ENGINE (THE SWARM) ---
                    elif name == "simulate_physics":
                        await manager.broadcast({"type": "state", "state": "executing", "main_text": "Physics Engine Online", "sub_text": "Calculating topological matrices..."})
                        result_url = await physics_ops.simulate_physics(args.get("prompt", ""))
                        if result_url.startswith("http"):
                            await manager.broadcast({
                                "type": "html_view",
                                "html_url": result_url
                            })
                            response_text = "I have generated the interactive physics simulation for you. Rendering in the Data Panel now."
                        else:
                            response_text = f"Simulation encountered an error: {result_url}"
                        needs_summary = False
                        
                    # --- DUAL-CORE HANDOFF ---
                    elif name == "delegate_to_deep_think_core":
                        await manager.broadcast({"type": "state", "state": "executing", "main_text": "Deep Think Engaged", "sub_text": "Routing to Gemini Core..."})
                        
                        # Temporarily force Gemini for this prompt
                        from openai import AsyncOpenAI
                        import config
                        gemini_client = AsyncOpenAI(api_key=config.GEMINI_API_KEY, base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
                        
                        messages = [{"role": "system", "content": "You are J.A.R.V.I.S Deep Think Core (Gemini). Solve this complex problem brilliantly."}]
                        messages.extend(user_history)
                        messages.append({"role": "user", "content": args.get("task_description", "")})
                        
                        try:
                            resp = await gemini_client.chat.completions.create(model="gemini-1.5-pro", messages=messages, temperature=0.5)
                            context_data = resp.choices[0].message.content
                        except Exception as e:
                            context_data = f"Gemini Core failed: {e}"
                            
                        needs_summary = True
                        
                    # --- RE-EVALUATION ---
                    if needs_summary:
                        await manager.broadcast({"type": "state", "state": "thinking", "main_text": "Analyzing Data...", "sub_text": "Synthesizing results"})
                        follow_up_prompt = (
                            f"Regarding my command: '{user_text}', you gathered this tool data: {context_data}\n\n"
                            f"Please respond directly to my command using this data. If the data is empty or irrelevant, use your own knowledge and personal memory to answer."
                        )
                        response_text, _ = await brain.think(
                            follow_up_prompt, 
                            user_history, 
                            use_tools=False,
                            input_type=input_type,
                            user_profile=user_profile,
                            role=user_role,
                            user_id=user_id
                        )
            
            if not response_text:
                response_text = "Task executed successfully, sir."
            
            user_history.append({"role": "user", "content": user_text})
            user_history.append({"role": "assistant", "content": response_text})
            
            if len(user_history) > MAX_CHAT_HISTORY:
                user_conversation_histories[user_key] = user_history[-MAX_CHAT_HISTORY:]
            
            await manager.broadcast({"type": "chat", "role": "Jarvis", "message": response_text, "user_id": user_key})
            
            # 5. SPEAKING (Only if input was Voice)
            if input_type == "voice":
                await manager.broadcast({"type": "state", "state": "speaking", "main_text": "Speaking...", "sub_text": "Audio output active"})
                await speak_text(response_text)
            
            # Reset State
            await manager.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Say 'Jarvis' or type a command"})
        except Exception as e:
            print(f"[Jarvis Flow Error]: {e}")
            await manager.broadcast({"type": "chat", "role": "Jarvis", "message": f"[System Error]: {e}", "user_id": user_key})
            await manager.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Awaiting directive..."})


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create background tasks
    task1 = asyncio.create_task(jarvis_processing_loop())
    task2 = asyncio.create_task(audio_listener_loop())
    task3 = asyncio.create_task(telemetry_loop())
    task4 = asyncio.create_task(cleanup_loop())
    yield
    # Shutdown: Cancel tasks
    task1.cancel()
    task2.cancel()
    task3.cancel()
    task4.cancel()

app = FastAPI(title="Jarvis Quantum API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for Physics Engine output
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

class SettingsModel(BaseModel):
    keys: dict
    preferences: dict

class FeedbackModel(BaseModel):
    name: str = "Anonymous Explorer"
    email: str = "no-reply@jarvis-os.ai"
    topic: str = "General Feedback"
    rating: str = "5 / 5 Stars"
    message: str
    diagnostics: str = ""

@app.post("/api/feedback")
async def submit_feedback(data: FeedbackModel):
    access_key = os.getenv("WEB3FORMS_ACCESS_KEY") or os.getenv("VITE_WEB3FORMS_ACCESS_KEY") or "430cbfce-3745-4425-959e-a9909eb7c128"
    if not access_key:
        raise HTTPException(status_code=500, detail="Web3Forms access key not configured on server.")
    
    payload = {
        "access_key": access_key,
        "subject": f"[Jarvis Feedback] {data.topic} from {data.name}",
        "from_name": data.name,
        "name": data.name,
        "email": data.email,
        "topic": data.topic,
        "rating": data.rating,
        "message": data.message,
        "diagnostics": data.diagnostics,
        "botcheck": ""
    }
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://api.web3forms.com/submit",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            return res_json
    except Exception as e:
        print(f"Error submitting feedback via backend: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings")
def get_settings(request: Request):
    if not is_local_client(request.client.host if request.client else None):
        raise HTTPException(status_code=403, detail="Settings are only available locally.")
    return api_config.public_settings()

@app.post("/settings")
def update_settings(settings: SettingsModel, request: Request):
    if not is_local_client(request.client.host if request.client else None):
        raise HTTPException(status_code=403, detail="Settings are only available locally.")
    api_config.update_settings(settings.dict())
    return {"status": "success", "settings": api_config.public_settings()}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    if origin and ("*" not in ALLOWED_ORIGINS and origin not in ALLOWED_ORIGINS):
        await websocket.close(code=1008)
        return
    await manager.connect(websocket)
    try:
        while True:
            # We receive text commands from the web UI
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "text_command":
                    # Send text input to the queue
                    await input_queue.put({
                        "type": "text", 
                        "text": msg.get("text"),
                        "user_profile": msg.get("user_profile"),
                        "role": msg.get("role", "user"),
                        "user_id": msg.get("user_id")
                    })
                elif msg.get("type") == "system_command":
                    await input_queue.put({"type": "system_command", "action": msg.get("action")})
                elif msg.get("type") == "professor_query":
                    # Send multimodal professor query to the queue
                    await input_queue.put({
                        "type": "professor_query",
                        "session_id": msg.get("session_id"),
                        "text": msg.get("text", ""),
                        "files": msg.get("files", []),
                        "deep_research": msg.get("deep_research", False),
                        "is_study_group": msg.get("is_study_group", False),
                        "is_sandbox_mode": msg.get("is_sandbox_mode", False),
                        "target_agent": msg.get("target_agent", "all"),
                        "is_architect_mode": msg.get("is_architect_mode", False),
                        "architect_difficulty": msg.get("architect_difficulty", "curious_kid"),
                        "is_epiphany_mode": msg.get("is_epiphany_mode", False),
                        "is_collider_mode": msg.get("is_collider_mode", False),
                        "user_profile": msg.get("user_profile"),
                        "role": msg.get("role", "user"),
                        "user_id": msg.get("user_id")
                    })
                elif msg.get("type") == "fractal_expand":
                    await input_queue.put({
                        "type": "fractal_expand",
                        "context": msg.get("context", ""),
                        "target_variable": msg.get("target_variable", ""),
                        "parent_id": msg.get("parent_id", ""),
                        "node_id": msg.get("node_id", "")
                    })
                elif msg.get("type") in ["professor_load_history", "professor_fetch_sessions", "professor_create_session", "professor_delete_session", "professor_fetch_media", "professor_delete_media", "professor_upload_media"]:
                    await input_queue.put({
                        "type": msg.get("type"),
                        "session_id": msg.get("session_id"),
                        "mode": msg.get("mode", "professor"),
                        "media_id": msg.get("media_id"),
                        "file": msg.get("file"),
                        "user_id": msg.get("user_id"),
                        "role": msg.get("role", "user")
                    })
                elif msg.get("type") == "curiosity_feed_request":
                    hooks = await curiosity_engine.generate_curiosity_feed(
                        interested_subjects=msg.get("interested_subjects"),
                        language=msg.get("language", "English")
                    )
                    try:
                        await websocket.send_json({"type": "curiosity_feed_response", "hooks": hooks})
                    except Exception:
                        pass
            except json.JSONDecodeError:
                pass
            except Exception:
                pass
    except (WebSocketDisconnect, RuntimeError, Exception):
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
