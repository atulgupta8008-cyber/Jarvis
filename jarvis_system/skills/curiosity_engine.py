import asyncio
from google import genai
import config
import json

client = genai.Client(api_key=config.GEMINI_API_KEY)

HARDCODED_HOOKS = [
    {"question": "A teaspoon of neutron star weighs 6 billion tons. But why doesn't it collapse into a black hole?", "category": "Astrophysics", "difficulty": 2, "hook_type": "paradox"},
    {"question": "You learned F=ma in school. What if I told you Newton's version is technically wrong?", "category": "Physics", "difficulty": 2, "hook_type": "mindblown"},
    {"question": "Can you design a bridge that uses ONLY tension — no compression allowed?", "category": "Engineering", "difficulty": 3, "hook_type": "challenge"},
    {"question": "What if Earth suddenly had two Suns? Would we even survive the first week?", "category": "Astrophysics", "difficulty": 1, "hook_type": "whatif"},
    {"question": "Why does hot water freeze faster than cold water? Even scientists can't fully agree.", "category": "Thermodynamics", "difficulty": 2, "hook_type": "paradox"},
    {"question": "If you fell into a black hole, you'd see the entire future of the universe flash before your eyes. Why?", "category": "Relativity", "difficulty": 3, "hook_type": "mindblown"},
    {"question": "Can you calculate how much energy is stored in a single raisin using E=mc²?", "category": "Nuclear Physics", "difficulty": 1, "hook_type": "challenge"},
    {"question": "What if gravity suddenly became 10x stronger right now? How long would buildings last?", "category": "Physics", "difficulty": 2, "hook_type": "whatif"},
    {"question": "Why can you never actually touch anything? Quantum mechanics says it's impossible.", "category": "Quantum Physics", "difficulty": 1, "hook_type": "paradox"},
    {"question": "What happens if you travel at the speed of light and turn on a flashlight?", "category": "Relativity", "difficulty": 2, "hook_type": "whatif"}
]

async def generate_curiosity_feed(recent_topics: list = None) -> list:
    """
    Generates 10 mind-blowing curiosity hooks.
    Uses AI if recent_topics are provided, otherwise returns curated hardcoded hooks.
    """
    topic_context = f"a student who has been studying these topics: {', '.join(recent_topics)}" if recent_topics else "a student looking to be amazed by the universe"
    prompt = f"""Generate exactly 10 mind-blowing curiosity hooks for {topic_context}.

Each hook should be a provocative question that creates an irresistible curiosity gap — the student MUST click to find out.

Hook types to use:
- paradox: Something that seems to violate common sense
- mindblown: An astonishing fact that changes how you see the world  
- challenge: A puzzle or design challenge
- whatif: A thought experiment with dramatic consequences

Return ONLY a valid JSON array with this format:
[{{"question": "...", "category": "...", "difficulty": 1-3, "hook_type": "paradox|mindblown|challenge|whatif"}}]

No markdown, no explanation, just the JSON array."""

    try:
        def _generate():
            return client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt
            )
        response = await asyncio.to_thread(_generate)
        raw = response.text.strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1].rsplit('```', 1)[0]
        hooks = json.loads(raw)
        if isinstance(hooks, list) and len(hooks) > 0:
            return hooks[:10]
    except Exception as e:
        print(f"[CuriosityEngine] AI generation failed: {e}")

    import random
    return random.sample(HARDCODED_HOOKS, min(10, len(HARDCODED_HOOKS)))
