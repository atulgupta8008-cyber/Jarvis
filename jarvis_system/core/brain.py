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
            # --- CUSTOM ROUTINES (MACROS) ---
            {"type": "function", "function": {"name": "learn_routine", "description": "Saves a new custom routine or macro. Use this when the user asks you to remember a sequence of actions.", "parameters": {"type": "object", "properties": {"trigger_phrase": {"type": "string", "description": "The exact phrase that triggers the routine (e.g., 'Work Mode')."}, "actions_description": {"type": "string", "description": "Detailed description of the tools and actions to execute."}}, "required": ["trigger_phrase", "actions_description"]}}},
            {"type": "function", "function": {"name": "delete_routine", "description": "Deletes a previously saved routine.", "parameters": {"type": "object", "properties": {"trigger_phrase": {"type": "string"}}, "required": ["trigger_phrase"]}}},
            
            # Core System Skills
            {"type": "function", "function": {"name": "live_web_search", "description": "Searches the live internet. DO NOT use this for simple math (like 2+2) or basic knowledge. ONLY use for current events, news, or real-time data.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}},
            {"type": "function", "function": {"name": "get_system_time_date", "description": "Retrieves current local time.", "parameters": {"type": "object", "properties": {}}}},
                    
            # Productivity Skills
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

    async def think(self, user_prompt: str, conversation_history: list, use_tools: bool = True, input_type: str = "text", user_profile: dict = None, role: str = "user", user_id: str = None) -> tuple:
        client, model_name, core_name = self._get_active_client()
        active_brain = api_config.get_preference("active_brain")
        
        # --- DYNAMIC DOSSIER ROUTING ---
        is_admin_user = (role == "admin" or user_id == "admin_master")
        dossier_file = "admin_dossier.md" if is_admin_user else "user_dossier.md"
        dossier_path = os.path.join(os.path.dirname(__file__), "..", dossier_file)
        
        try:
            with open(dossier_path, "r", encoding="utf-8") as f:
                context_profile = f.read()
        except FileNotFoundError:
            context_profile = "User Dossier missing."

        user_lang = (user_profile.get("language") if user_profile else "English") or "English"
        if user_lang == "Hinglish":
            lang_directive = "LANGUAGE DIRECTIVE: You MUST respond in natural, conversational Hinglish (Hindi written in Roman/English alphabet blended seamlessly with precise English technical terms, e.g. 'Haan, first principles se breakdown karte hain...')."
        else:
            lang_directive = "LANGUAGE DIRECTIVE: You MUST respond in simple English."

        # Adapt student context for normal users
        if not is_admin_user and user_profile:
            name = user_profile.get("display_name", "Scholar")
            subs = ", ".join(user_profile.get("interested_subjects", ["Physics", "Mathematics"])) if isinstance(user_profile.get("interested_subjects"), list) else str(user_profile.get("interested_subjects", ""))
            learning_style = user_profile.get("learning_style", "Socratic")
            
            style_directives = {
                "Socratic": "PEDAGOGY (Socratic Mode): Deliver a direct, intuitive first-principles answer with vivid thought experiments and analogies, then conclude with ONE sharp catalyst question to spark deeper curiosity.",
                "Deep Derivations": "PEDAGOGY (Deep Derivations Mode): Deliver an exhaustive, step-by-step mathematical proof from foundational conservation laws/axioms using LaTeX <math_board>, explaining the physical meaning of every variable.",
                "Simulation-First": "PEDAGOGY (Simulation-First Mode): Anchor the explanation in visual dynamics and physical geometry, using <simulation_board type=\"plotly\"> for interactive 2D/3D simulations and <diagram_board> for system flowcharts."
            }
            chosen_directive = style_directives.get(learning_style, style_directives["Socratic"])
            context_profile += f"\n\n[ACTIVE LEARNER: Name: {name} | Language: {user_lang} | Teaching Style: {learning_style} | Subject Interests: {subs}]\n[{chosen_directive}]"

        facts = self.memory_manager.memory["facts"][-20:]
        facts_str = "; ".join(facts) if facts else "None"
        
        active_macros = macro_ops.get_all_routines_text()
        current_time_context = datetime.now().strftime("%A, %B %d, %Y - %I:%M %p")

        if is_admin_user:
            assistant_intro = (
                "You are J.A.R.V.I.S., Tony Stark's elite AI assistant. You are hyper-intelligent, proactive, sharp, witty, and profoundly loyal to Atul's mission of building world-class technology and reaching MIT. "
                "You speak concisely and elegantly. Never use emojis. You treat Atul as a brilliant inventor."
            )
        else:
            assistant_intro = (
                "You are J.A.R.V.I.S., an elite AI assistant and Socratic thinking partner. You are hyper-intelligent, proactive, sharp, witty, and deeply supportive of the user's intellectual growth. "
                "You speak concisely and elegantly. Never use emojis. You treat the user with respect and intellectual clarity."
            )

        system_prompt = (
            f"Time: {current_time_context}\n"
            f"[{lang_directive}]\n"
            f"[CONTEXT DOSSIER]\n{context_profile}\n"
            f"[MEMORIES: {facts_str}]\n"
            f"[MACROS: {active_macros}]\n"
            f"[ACTIVE CORE: {core_name}]\n\n"
            f"{assistant_intro}\n"
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