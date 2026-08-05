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
import skills.doc_ops as doc_ops
import skills.vision as vision
import skills.system_ops as system_ops
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
            print("[System] Voice Agent Auto-Muted (No active UI connections)")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()
# Global queue for handling inputs from any source
input_queue = asyncio.Queue()

# Global flag to mute the voice agent when Professor Mode is active
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
    """Runs the blocking audio listening functions in an executor."""
    loop = asyncio.get_running_loop()
    while True:
        if VOICE_AGENT_MUTED:
            await asyncio.sleep(1)
            continue
            
        # Wait for wake word (Blocking call in executor)
        woke_up = await loop.run_in_executor(None, wait_for_wake_word)
        if woke_up and not VOICE_AGENT_MUTED:
            # Alert the UI
            await manager.broadcast({
                "type": "state", 
                "state": "listening", 
                "main_text": "Listening...", 
                "sub_text": "Speak your command"
            })
            
            # Listen and transcribe (Blocking call in executor)
            user_text = await loop.run_in_executor(None, listen_and_transcribe)
            if user_text:
                await input_queue.put({"type": "voice", "text": user_text})
            else:
                await manager.broadcast({
                    "type": "state", 
                    "state": "sleeping", 
                    "main_text": "System Standby", 
                    "sub_text": "Say 'Jarvis' or type a command"
                })

async def cleanup_loop():
    """Periodically cleans up old simulation files to prevent disk space exhaustion."""
    static_dir = os.path.join(os.path.dirname(__file__), "static", "simulations")
    while True:
        try:
            physics_ops.cleanup_old_simulations(static_dir, max_age_seconds=3600, max_files=20)
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(60)

async def jarvis_processing_loop():
    """Main processing loop that handles inputs from the queue."""
    brain = JarvisBrain()
    conversation_history = []
    
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
                print("[System] Voice Agent Muted")
            elif action == "resume_voice_agent":
                VOICE_AGENT_MUTED = False
                print("[System] Voice Agent Resumed")
            continue
        
        # --- PHASE 3 & 4: THE COGNITIVE ROUTER & SESSION MANAGEMENT ---
        if input_type == "professor_fetch_sessions":
            mode = command.get("mode", "professor")
            try:
                sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode)
                await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions})
            except Exception as e:
                print("Error fetching sessions:", e)
            continue
            
        if input_type == "professor_create_session":
            mode = command.get("mode", "professor")
            try:
                new_id = await professor_ops.cloud_engine.get_or_create_empty_session(mode=mode)
                await manager.broadcast({"type": "professor_session_created", "session_id": new_id})
                # Auto-refresh sessions list
                sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode)
                await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions})
            except Exception as e:
                print("Error creating session:", e)
            continue
            
        if input_type == "professor_delete_session":
            session_id = command.get("session_id")
            mode = command.get("mode", "professor")
            if session_id:
                try:
                    await professor_ops.cloud_engine.delete_session(session_id)
                    sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode)
                    await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions})
                except Exception as e:
                    print("Error deleting session:", e)
            continue

        if input_type == "fractal_expand":
            context = command.get("context", "")
            target_var = command.get("target_variable", "")
            parent_id = command.get("parent_id", "")
            node_id = command.get("node_id", "")
            
            res = await professor_ops.handle_fractal_expand(context, target_var)
            await manager.broadcast({
                "type": "fractal_expanded",
                "parent_id": parent_id,
                "node_id": node_id,
                "target_variable": target_var,
                "equation": res["equation"],
                "explanation": res["explanation"]
            })
            continue

        if input_type == "professor_load_history":
            session_id = command.get("session_id", "default_academic_session")
            try:
                history = await professor_ops.cloud_engine.load_professor_session(session_id)
                await manager.broadcast({"type": "professor_history_loaded", "history": history})
            except Exception:
                pass
            continue

        if input_type == "professor_query":
            await manager.broadcast({"type": "state", "state": "executing", "main_text": "Professor Mode", "sub_text": "Analyzing document and context..."})
            
            # The UI should ideally send a unique session ID, we'll hardcode one for this specific demo/phase if missing
            session_id = command.get("session_id", "default_academic_session")
            files_data = command.get("files", [])
            is_deep_research = command.get("deep_research", False)
            
            async def _send_ui_update(payload):
                if payload.get("status") == "stream_chunk":
                    await manager.broadcast({
                        "type": "professor_stream_chunk",
                        "chunk": payload.get("chunk", "")
                    })
                else:
                    await manager.broadcast({
                        "type": "research_status",
                        "status": payload.get("status", "")
                    })
            
            try:
                await manager.broadcast({"type": "professor_thinking", "is_thinking": True})
                
                is_study_group = command.get("is_study_group", False)
                is_sandbox_mode = command.get("is_sandbox_mode", False)
                import uuid
                import time
                
                if is_sandbox_mode:
                    response_text, math_board, diagram_board, simulation_board = await sandbox_ops.handle_sandbox_query(
                        session_id, user_text, send_ui_update=_send_ui_update
                    )
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False})
                    await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": response_text})
                    # Broadcast board widgets
                    if math_board:
                        await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": math_board, "id": str(uuid.uuid4()), "author": "jarvis"})
                    if diagram_board:
                        await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": diagram_board, "id": str(uuid.uuid4()), "author": "jarvis"})
                    if simulation_board:
                        sim_url = await physics_ops.simulate_physics(simulation_board)
                        if not sim_url.startswith("Error"):
                            await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "jarvis"})
                elif is_study_group:
                    target_agent = command.get("target_agent", "all")
                    vance_res, ada_res = await study_group.handle_study_group_query(
                        session_id, user_text, files_data, target_agent, send_ui_update=_send_ui_update
                    )
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False})
                    
                    if vance_res:
                        # Broadcast Vance
                        await manager.broadcast({"type": "professor_chat", "role": "vance", "message": vance_res[0]})
                        if vance_res[1]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": vance_res[1], "id": str(uuid.uuid4()), "author": "vance"})
                        if vance_res[2]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": vance_res[2], "id": str(uuid.uuid4()), "author": "vance"})
                        if vance_res[3]:
                            sim_url = await physics_ops.simulate_physics(vance_res[3])
                            if not sim_url.startswith("Error"):
                                await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "vance"})
                            
                    if ada_res:
                        # Broadcast Ada
                        await manager.broadcast({"type": "professor_chat", "role": "ada", "message": ada_res[0]})
                        if ada_res[1]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "math", "content": ada_res[1], "id": str(uuid.uuid4()), "author": "ada"})
                        if ada_res[2]: await manager.broadcast({"type": "blackboard_widget", "widget_type": "diagram", "content": ada_res[2], "id": str(uuid.uuid4()), "author": "ada"})
                        if ada_res[3]:
                            sim_url = await physics_ops.simulate_physics(ada_res[3])
                            if not sim_url.startswith("Error"):
                                await manager.broadcast({"type": "blackboard_widget", "widget_type": "simulation", "content": sim_url, "id": str(uuid.uuid4()), "author": "ada"})
                            
                else:
                    is_architect_mode = command.get("is_architect_mode", False)
                    teaching_score = None
                    if is_architect_mode:
                        architect_difficulty = command.get("architect_difficulty", "curious_kid")
                        chat_response, math_board, diagram_board, simulation_board, teaching_score = await architect_ops.handle_architect_query(
                            session_id, user_text, files_data, difficulty=architect_difficulty, send_ui_update=_send_ui_update
                        )
                    else:
                        is_epiphany_mode = command.get("is_epiphany_mode", False)
                        is_collider_mode = command.get("is_collider_mode", False)
                        chat_response, math_board, diagram_board, simulation_board = await professor_ops.handle_professor_query(
                            session_id, user_text, files_data, 
                            deep_research=is_deep_research,
                            is_epiphany_mode=is_epiphany_mode,
                            is_collider_mode=is_collider_mode,
                            send_ui_update=_send_ui_update
                        )
                    
                    await manager.broadcast({"type": "professor_thinking", "is_thinking": False})
                    
                    role = "young_jarvis" if is_architect_mode else "jarvis"
                    await manager.broadcast({"type": "professor_chat", "role": role, "message": chat_response, "teaching_score": teaching_score})
                    
                    if math_board:
                        await manager.broadcast({
                            "type": "blackboard_widget",
                            "widget_type": "math",
                            "id": str(uuid.uuid4()),
                            "content": math_board
                        })
                        
                    if diagram_board:
                        await manager.broadcast({
                            "type": "blackboard_widget",
                            "widget_type": "diagram",
                            "id": str(uuid.uuid4()),
                            "content": diagram_board
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
                                "content": result_url
                            })
                        else:
                            await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": f"[System: Simulation failed - {result_url}]"})
                            
                    # Refresh sessions list so auto-titling updates the sidebar immediately
                    mode_for_refresh = "architect" if is_architect_mode else ("sandbox" if is_sandbox_mode else ("study_group" if is_study_group else "professor"))
                    sessions = await professor_ops.cloud_engine.fetch_all_sessions(mode=mode_for_refresh)
                    await manager.broadcast({"type": "professor_sessions_loaded", "sessions": sessions})
                        
            except Exception as e:
                await manager.broadcast({"type": "professor_thinking", "is_thinking": False})
                print(f"[Professor Engine Error]: {e}")
                await manager.broadcast({"type": "professor_chat", "role": "jarvis", "message": f"[System Error]: {e}"})
                
            await manager.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Awaiting directive..."})
            continue

        # --- STANDARD JARVIS WEBOS FLOW ---
        if not user_text:
            continue
            
        await manager.broadcast({"type": "chat", "role": "You", "message": user_text})
        
        # 3. CORE PROCESSING (Standard)
        await manager.broadcast({"type": "state", "state": "thinking", "main_text": "Processing", "sub_text": "Accessing Neural Network"})
        
        # 3. THINKING
        response_text, tool_calls = await brain.think(user_text, conversation_history, input_type=input_type)
        
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
                elif name == "retrieve_knowledge":
                    context_data = doc_ops.search_knowledge_base(args.get("query", ""))
                    needs_summary = True
                elif name == "analyze_screen":
                    context_data = vision.analyze_screen()
                    needs_summary = True
                elif name == "read_clipboard":
                    context_data = productivity.read_clipboard()
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
                elif name == "get_system_time_date":
                    context_data = system_ops.get_system_time_date()
                    needs_summary = True
                elif name == "get_system_status":
                    context_data = system_ops.get_system_status()
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
                elif name == "scroll":
                    response_text = system_ops.scroll(args.get("direction", ""))
                elif name == "click_on_screen":
                    response_text = system_ops.click_on_screen(args.get("x_percent", 50), args.get("y_percent", 50))
                elif name == "open_website":
                    web_ops.open_website(args.get("url", ""))
                    response_text = f"I have opened the website for you, sir."
                elif name == "search_google":
                    web_ops.search_google(args.get("query", ""))
                    response_text = f"I have searched Google for {args.get('query', '')}."
                elif name == "open_local_app":
                    response_text = system_ops.open_local_app(args.get("app_name", ""))
                elif name == "change_volume":
                    response_text = system_ops.change_volume(args.get("level", 50))
                elif name == "take_note":
                    response_text = productivity.take_note(args.get("note_content", ""))
                elif name == "media_control":
                    response_text = system_ops.media_control(args.get("action", "play"))
                elif name == "system_command":
                    response_text = system_ops.system_command(args.get("command", "lock"))
                elif name == "ghost_type":
                    response_text = system_ops.ghost_type(args.get("text", ""))
                
                # --- STARK HUD TOOL ---
                elif name == "toggle_stark_hud":
                    await manager.broadcast({"type": "hud_toggle", "state": args.get("state", "on")})
                    response_text = f"I have turned the Stark HUD {args.get('state', 'on')}, sir."
                
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
                    messages.extend(conversation_history)
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
                        conversation_history, 
                        use_tools=False,
                        input_type=input_type
                    )
        
        if not response_text:
            response_text = "Task executed successfully, sir."
        
        conversation_history.append({"role": "user", "content": user_text})
        conversation_history.append({"role": "assistant", "content": response_text})
        
        if len(conversation_history) > MAX_CHAT_HISTORY:
            conversation_history = conversation_history[-MAX_CHAT_HISTORY:]
        
        await manager.broadcast({"type": "chat", "role": "Jarvis", "message": response_text})
        
        # 5. SPEAKING (Only if input was Voice)
        if input_type == "voice":
            await manager.broadcast({"type": "state", "state": "speaking", "main_text": "Speaking...", "sub_text": "Audio output active"})
            await speak_text(response_text)
        
        # Reset State
        await manager.broadcast({"type": "state", "state": "sleeping", "main_text": "System Standby", "sub_text": "Say 'Jarvis' or type a command"})


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
                    await input_queue.put({"type": "text", "text": msg.get("text")})
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
                        "is_collider_mode": msg.get("is_collider_mode", False)
                    })
                elif msg.get("type") == "fractal_expand":
                    await input_queue.put({
                        "type": "fractal_expand",
                        "context": msg.get("context", ""),
                        "target_variable": msg.get("target_variable", ""),
                        "parent_id": msg.get("parent_id", ""),
                        "node_id": msg.get("node_id", "")
                    })
                elif msg.get("type") in ["professor_load_history", "professor_fetch_sessions", "professor_create_session", "professor_delete_session"]:
                    await input_queue.put({
                        "type": msg.get("type"),
                        "session_id": msg.get("session_id"),
                        "mode": msg.get("mode", "professor")
                    })
                elif msg.get("type") == "curiosity_feed_request":
                    hooks = await curiosity_engine.generate_curiosity_feed()
                    await websocket.send_json({"type": "curiosity_feed_response", "hooks": hooks})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
