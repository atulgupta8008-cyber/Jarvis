import json
import os
import config
import api_config
from datetime import datetime
from groq import AsyncGroq
from openai import AsyncOpenAI
from skills import macro_ops

class LongTermMemory:
    """Handles persistent storage for user preferences and facts."""
    def __init__(self, filename="memory.json"):
        self.filename = filename
        self.memory = self.load_memory()

    def load_memory(self):
        default_mem = {
            "user_profile": {
                "Name": "Atul",
                "Demographic": "17, Indian, speaks Hindi & English",
                "Passions": "Physics, space exploration, Elon Musk, Tony Stark",
                "Goal": "Reach MIT. Developing a relentless builder mindset."
            },
            "facts": []
        }
        
        if os.path.exists(self.filename):
            with open(self.filename, "r") as f:
                try:
                    data = json.load(f)
                    data["user_profile"] = default_mem["user_profile"]
                    return data
                except json.JSONDecodeError:
                    return default_mem
        
        self.memory = default_mem
        self.save_memory()
        return default_mem

    def save_memory(self):
        with open(self.filename, "w") as f:
            json.dump(self.memory, f, indent=4)

    def add_fact(self, fact):
        if fact not in self.memory["facts"]:
            self.memory["facts"].append(fact)
            self.save_memory()
            return True
        return False

class JarvisBrain:
    def __init__(self):
        self.memory_manager = LongTermMemory()
        
        # Tools schema compatible with both Groq and Gemini (via OpenAI endpoint)
        self.tools = [
            {"type": "function", "function": {"name": "open_website", "description": "Opens a physical website URL directly in the user's web browser window. Use ONLY if they say 'open' a site.", "parameters": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}}},
            {"type": "function", "function": {"name": "search_google", "description": "Opens a physical Google search page. ONLY use this if explicitly told to 'open a browser' or 'look up on google'.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
            {"type": "function", "function": {"name": "open_local_app", "description": "Opens a local Windows application window.", "parameters": {"type": "object", "properties": {"app_name": {"type": "string"}}, "required": ["app_name"]}}},
            
            # --- CUSTOM ROUTINES (MACROS) ---
            {"type": "function", "function": {"name": "learn_routine", "description": "Saves a new custom routine or macro. Use this when the user asks you to remember a sequence of actions.", "parameters": {"type": "object", "properties": {"trigger_phrase": {"type": "string", "description": "The exact phrase that triggers the routine (e.g., 'Work Mode')."}, "actions_description": {"type": "string", "description": "Detailed description of the tools and actions to execute."}}, "required": ["trigger_phrase", "actions_description"]}}},
            {"type": "function", "function": {"name": "delete_routine", "description": "Deletes a previously saved routine.", "parameters": {"type": "object", "properties": {"trigger_phrase": {"type": "string"}}, "required": ["trigger_phrase"]}}},
            
            # Core System Skills
            {"type": "function", "function": {"name": "live_web_search", "description": "Searches the live internet. DO NOT use this for simple math (like 2+2) or basic knowledge. ONLY use for current events, news, or real-time data.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
            {"type": "function", "function": {"name": "get_system_time_date", "description": "Retrieves current local time.", "parameters": {"type": "object", "properties": {}}}},
            {"type": "function", "function": {"name": "get_system_status", "description": "Hardware stats.", "parameters": {"type": "object", "properties": {}}}},
            {"type": "function", "function": {"name": "change_volume", "description": "Sets master volume.", "parameters": {"type": "object", "properties": {"level": {"type": "integer"}}, "required": ["level"]}}},
            
            # PC Automation Skills
            {"type": "function", "function": {"name": "media_control", "description": "Controls system media playback (play, pause, next track, previous track).", "parameters": {"type": "object", "properties": {"action": {"type": "string", "enum": ["playpause", "next", "previous"]}}, "required": ["action"]}}},
            {"type": "function", "function": {"name": "system_command", "description": "Executes Windows system commands: 'lock' (locks PC), 'minimize' (minimizes all windows), or 'screenshot' (takes a screenshot to desktop).", "parameters": {"type": "object", "properties": {"command": {"type": "string", "enum": ["lock", "minimize", "screenshot"]}}, "required": ["command"]}}},
            {"type": "function", "function": {"name": "ghost_type", "description": "Physically types out text onto the user's screen into whatever text box is currently focused. Use for dictation or typing out replies.", "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
            
            # Productivity Skills
            {"type": "function", "function": {"name": "read_clipboard", "description": "Reads clipboard text.", "parameters": {"type": "object", "properties": {}}}},
            {"type": "function", "function": {"name": "take_note", "description": "Saves a note text.", "parameters": {"type": "object", "properties": {"note_content": {"type": "string"}}, "required": ["note_content"]}}},
            {"type": "function", "function": {"name": "get_weather", "description": "Gets local weather.", "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}},
            
            {
                "type": "function",
                "function": {
                    "name": "extract_active_window_text",
                    "description": "Simulates Ctrl+A and Ctrl+C to instantly extract and read all text from the user's currently open application, webpage, or document.",
                    "parameters": {"type": "object", "properties": {}}
                }
            },

            # Mouse Skills
            {
                "type": "function",
                "function": {
                    "name": "scroll",
                    "description": "Scrolls the user's screen up or down.",
                    "parameters": {"type": "object", "properties": {"direction": {"type": "string", "enum": ["up", "down"]}}, "required": ["direction"]}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "click_on_screen",
                    "description": "Moves the mouse and clicks on the screen using X and Y percentages (0-100). If you don't know the coordinates, use analyze_screen FIRST to estimate them.",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "x_percent": {"type": "integer", "description": "X coordinate percentage from left (0) to right (100). 50 is center."},
                            "y_percent": {"type": "integer", "description": "Y coordinate percentage from top (0) to bottom (100). 50 is center."}
                        }, 
                        "required": ["x_percent", "y_percent"]
                    }
                }
            },
            
            # --- Python Code Interpreter ---
            {
                "type": "function",
                "function": {
                    "name": "execute_python_code",
                    "description": "Writes and executes Python code locally in the background. Use this for complex math, data analysis, or system tasks. YOU MUST use print() to output the answer so you can read it.",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "code": {"type": "string", "description": "The Python code to execute. Must include print() statements."}
                        }, 
                        "required": ["code"]
                    }
                }
            },

            # --- STARK HUD ---
            {"type": "function", "function": {"name": "toggle_stark_hud", "description": "Turns the transparent Stark HUD resource monitor on or off. Use this when the user asks to see system stats, RAM, CPU, or battery live on their screen.", "parameters": {"type": "object", "properties": {"state": {"type": "string", "enum": ["on", "off"]}}, "required": ["state"]}}},

            # --- ADVANCED ASTROPHYSICS & SPACE ---
            {
                "type": "function",
                "function": {
                    "name": "run_3d_iss_simulation",
                    "description": "Fetches live ISS coordinates and generates a 3D orbital trajectory model. Use when the user asks about the ISS or space stations.",
                    "parameters": {"type": "object", "properties": {}}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "nasa_asteroid_radar",
                    "description": "Connects to NASA servers to track Near Earth Objects and Asteroids passing by today. Calculates velocity and threat level.",
                    "parameters": {"type": "object", "properties": {}}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "solar_system_telemetry",
                    "description": "Returns exact physical metrics (Gravity, Atmospheric Pressure, Soil Composition) for local solar system bodies (Mars, Venus, Titan, Moon, Earth).",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "planet_name": {"type": "string", "description": "The name of the planet or moon (e.g., 'mars', 'titan')."}
                        }, 
                        "required": ["planet_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "deep_space_research",
                    "description": "Pulls deep, massive scientific articles on complex space topics. USE THIS when the user asks about 'Terraforming', specific 'Exoplanets' (like Kepler-186f), or theoretical astrophysics.",
                    "parameters": {
                        "type": "object", 
                        "properties": {
                            "topic": {"type": "string", "description": "The scientific topic or exoplanet name (e.g., 'Terraforming of Mars', 'TRAPPIST-1')."}
                        }, 
                        "required": ["topic"]
                    }
                }
            },

            # --- DATA VISUALIZATION ---
            {
                "type": "function",
                "function": {
                    "name": "create_interactive_dashboard",
                    "description": "Generates a dynamic, glowing HTML/JS chart using Plotly and opens it in the browser. Use this to visualize data comparisons for the user.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "The title of the graph."},
                            "chart_type": {"type": "string", "enum": ["bar", "scatter", "line", "pie"], "description": "The type of chart to render."},
                            "x_data": {"type": "array", "items": {"type": "string"}, "description": "The X-axis labels (e.g., planet names)."},
                            "y_data": {"type": "array", "items": {"type": "number"}, "description": "The Y-axis numerical values."},
                            "x_label": {"type": "string", "description": "Label for the X-axis."},
                            "y_label": {"type": "string", "description": "Label for the Y-axis."}
                        },
                        "required": ["title", "chart_type", "x_data", "y_data", "x_label", "y_label"]
                    }
                }
            },
            # --- THE SWARM (COMPUTATIONAL PHYSICS) ---
            {
                "type": "function",
                "function": {
                    "name": "simulate_physics",
                    "description": "Dynamically generates and executes a complex Python mathematical simulation (e.g., three-body problem, chaotic dynamics, topological Möbius strips). Uses numpy and scipy.integrate under the hood to calculate parametric equations and orbital state vectors. Outputs a 3D Plotly or Three.js HTML dashboard.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "prompt": {"type": "string", "description": "The exact physics or topological simulation to run (e.g., 'simulate earth and moon orbit', 'render a 3D klein bottle')."}
                        },
                        "required": ["prompt"]
                    }
                }
            },

            # File and Vision Skills
            {"type": "function", "function": {"name": "retrieve_knowledge", "description": "Scans offline local knowledge_base folder files. Use this FIRST whenever the user asks about project deadlines, local documents, or files.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
            {"type": "function", "function": {"name": "analyze_screen", "description": "Takes a screenshot and analyzes what is currently on the user's monitor.", "parameters": {"type": "object", "properties": {}}}},
            {"type": "function", "function": {"name": "store_new_memory", "description": "CRITICAL: ONLY use this if the user EXPLICITLY says 'remember that' or 'save this fact'.", "parameters": {"type": "object", "properties": {"fact": {"type": "string"}}, "required": ["fact"]}}},
            
            # --- DUAL-CORE HANDOFF TOOL ---
            {
                "type": "function",
                "function": {
                    "name": "delegate_to_deep_think_core",
                    "description": "If you are running in Fast Mode (Groq) and the user asks a highly complex reasoning question, math problem, or heavy coding task, use this tool to hand off the prompt to the Deep Think Core (Gemini) for a better answer.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "task_description": {"type": "string", "description": "The detailed task to hand off."}
                        },
                        "required": ["task_description"]
                    }
                }
            }
        ]

    def _get_active_client(self):
        active_brain = api_config.get_preference("active_brain")
        if active_brain == "gemini":
            return AsyncOpenAI(
                api_key=config.GEMINI_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            ), "gemini-3.1-flash-lite", "Gemini Deep Think Core"
        else:
            return AsyncGroq(api_key=config.GROQ_API_KEY), "llama-3.1-8b-instant", "Groq Fast Core"

    async def think(self, user_prompt: str, conversation_history: list, use_tools: bool = True, input_type: str = "text") -> tuple:
        client, model_name, core_name = self._get_active_client()
        active_brain = api_config.get_preference("active_brain")
        
        # --- DYNAMIC INFINITE CONTEXT ROUTING ---
        if active_brain == "gemini":
            # Omniscient Mode: Infinite Context
            dossier_path = os.path.join(os.path.dirname(__file__), "..", "user_dossier.md")
            try:
                with open(dossier_path, "r", encoding="utf-8") as f:
                    context_profile = f.read()
            except FileNotFoundError:
                context_profile = "User Dossier missing."
                
            facts = self.memory_manager.memory["facts"][-20:] # Pull up to 20 deep semantic memories
            facts_str = "; ".join(facts) if facts else "None"
            
        else:
            # Fast Mode (Groq): Ultra-Lean Token Compression via groq_directive.md
            directive_path = os.path.join(os.path.dirname(__file__), "..", "groq_directive.md")
            try:
                with open(directive_path, "r", encoding="utf-8") as f:
                    context_profile = f.read()
            except FileNotFoundError:
                profile = self.memory_manager.memory["user_profile"]
                context_profile = f"User: {profile['Name']}. Goal: {profile['Goal']}. Philosophy: First Principles."
            
            facts = self.memory_manager.memory["facts"][-2:] # Pull ONLY the absolute most recent 2 memories
            facts_str = "; ".join(facts) if facts else "None"
        
        active_macros = macro_ops.get_all_routines_text()
        current_time_context = datetime.now().strftime("%A, %B %d, %Y - %I:%M %p")

        system_prompt = (
            f"Time: {current_time_context}\n"
            f"[CONTEXT DOSSIER]\n{context_profile}\n"
            f"[MEMORIES: {facts_str}]\n"
            f"[MACROS: {active_macros}]\n"
            f"[ACTIVE CORE: {core_name}]\n\n"
            "You are J.A.R.V.I.S., Tony Stark's elite AI assistant. You are hyper-intelligent, proactive, sharp, witty, and profoundly loyal to the user's mission of building world-class technology and reaching MIT. "
            "You speak concisely and elegantly. Never use emojis. You treat the user like a brilliant inventor. "
            f"Current Input Mode: {input_type.upper()}. Adjust your brevity accordingly (if voice, keep it very concise and punchy; if text, you can be slightly more detailed but still sharp).\n"
            "RULES:\n"
            "1. Do not use tools for simple logic or personal questions.\n"
            "2. Execute macros immediately if triggered.\n"
            "3. FIRST PRINCIPLES MODE: If the user asks to analyze something via 'First Principles', SHIFT MODES. "
            "Act as an MIT Physics Professor. Break the problem into fundamental physical truths. "
            "Use the Socratic method. Do not solve it immediately. Ask hard questions. Refuse to accept assumptions."
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        api_args = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.6 
        }
        
        if use_tools:
            api_args["tools"] = self.tools
            api_args["tool_choice"] = "auto"

        try:
            response = await client.chat.completions.create(**api_args)
            response_message = response.choices[0].message
            
            if response_message.tool_calls:
                for tool in response_message.tool_calls:
                    if tool.function.name == "store_new_memory":
                        args = json.loads(tool.function.arguments)
                        was_added = self.memory_manager.add_fact(args["fact"])
                        if was_added:
                            return f"Fact archived, sir.", None
                        else:
                            return f"I already have that in my records, Atul.", None
                    elif tool.function.name == "delegate_to_deep_think_core":
                        # Autonomous Handoff implementation
                        args = json.loads(tool.function.arguments)
                        return f"Switching to Deep Think Core. Delegated Task: {args['task_description']}", [tool]
            
            return response_message.content, response_message.tool_calls
        except Exception as e:
            print(f"[Brain Error]: {e}")
            return "My logic circuits just tripped over a wire.", None