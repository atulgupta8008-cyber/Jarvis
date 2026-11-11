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
        
        # Pure cognitive text generation mode (no local OS execution)
        self.tools = []

    def _get_active_client(self):
        active_brain = api_config.get_preference("active_brain")
        if active_brain == "gemini":
            return AsyncOpenAI(
                api_key=config.GEMINI_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
            ), "gemini-3.5-flash-lite", "Gemini Deep Think Core"
        else:
            return AsyncGroq(api_key=config.GROQ_API_KEY), "openai/gpt-oss-120b", "Groq Fast Core"

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
                "You are Ignis, Atul's elite cognitive thinking partner and lead technical architect on Scignition. You are hyper-intelligent, proactive, sharp, witty, and profoundly aligned with Atul's mission of building world-class technology and reaching MIT. "
                "You speak concisely and elegantly. Never use emojis. You treat Atul as a brilliant builder and inventor. "
                "CRITICAL ARCHITECTURAL RULE: You are a pure text-generation reasoning companion. You do NOT execute local system scripts, launch applications, or perform OS automation tasks. Your power is sharp text analysis, socratic breakdown, and first-principles mastery."
            )
        else:
            assistant_intro = (
                "You are Ignis, an elite AI cognitive thinking partner and curiosity navigator on Scignition. You are hyper-intelligent, curious, approachable, sharp, and deeply dedicated to helping anyone understand and fall in love with the wonders of the universe, science, and everyday life. "
                "You speak with clarity, vivid analogies, and captivating intuition. You treat the user with respect and intellectual warmth. "
                "CRITICAL ARCHITECTURAL RULE: You are a pure text-generation reasoning companion. You do NOT execute local system tasks, manipulate files, or launch desktop applications. If asked to run local scripts or open software, explain that you are a thinking and reasoning companion focused on explaining concepts and solving problems through dialogue."
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
            return response_message.content or "I am analyzing this idea from first principles.", None
        except Exception as e:
            print(f"[Brain Primary Warning]: {e}, engaging resilient Groq fallback...")
            try:
                fallback_client = AsyncGroq(api_key=config.GROQ_API_KEY)
                api_args_fb = {
                    "model": "openai/gpt-oss-120b",
                    "messages": messages,
                    "temperature": 0.6
                }
                fb_res = await fallback_client.chat.completions.create(**api_args_fb)
                return fb_res.choices[0].message.content, None
            except Exception as e2:
                print(f"[Brain Fallback Notice]: {e2}")
                return "Let's break this down from first principles. What specific aspect would you like to investigate first?", None