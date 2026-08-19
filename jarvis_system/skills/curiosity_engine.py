import asyncio
from google import genai
import config
import json
import random

client = genai.Client(api_key=config.GEMINI_API_KEY)

SUBJECT_HOOKS = {
    "Biology": [
        {"question": "If all DNA in human cells uncoils to 2 meters long, how does a 10-micrometer cell nucleus pack it without catastrophic tangling?", "category": "Biology", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Why do giant blue whales rarely die of cancer despite having quadrillions more dividing cells than mice? (Peto's Paradox)", "category": "Biology", "difficulty": 2, "hook_type": "paradox"},
        {"question": "What if cellular mitochondria could utilize quantum coherence to increase ATP production efficiency?", "category": "Biology", "difficulty": 3, "hook_type": "whatif"},
        {"question": "How do migratory birds use quantum entanglement in cryptochrome proteins to navigate Earth's magnetic field?", "category": "Biology", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "Why are our immune cells designed to commit programmed suicide (apoptosis) if they fail a basic self-tolerance test?", "category": "Biology", "difficulty": 1, "hook_type": "paradox"},
        {"question": "If CRISPR can rewrite any gene, what biological feedback loops stop an edited organism from collapsing?", "category": "Biology", "difficulty": 2, "hook_type": "challenge"},
        {"question": "How do tardigrades survive extreme radiation and absolute zero in space by turning their cells into biological glass?", "category": "Biology", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Why do trees have a theoretical maximum height limit of 130 meters due to xylem fluid tension?", "category": "Biology", "difficulty": 2, "hook_type": "challenge"},
        {"question": "What happens if a virus evolves to encode its own metabolic enzymes instead of hijacking host machinery?", "category": "Biology", "difficulty": 3, "hook_type": "whatif"},
        {"question": "Why did sexual reproduction evolve in almost all eukaryotes despite the 50% genetic transmission cost?", "category": "Biology", "difficulty": 2, "hook_type": "paradox"}
    ],
    "Physics": [
        {"question": "You learned F=ma in school. Why is Newton's second law technically an incomplete approximation in relativity?", "category": "Physics", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "What if gravity suddenly became 10x stronger right now? How would the human circulatory system react?", "category": "Physics", "difficulty": 2, "hook_type": "whatif"},
        {"question": "Can you design a bridge or truss structure that uses ONLY tension with zero compression elements?", "category": "Physics", "difficulty": 3, "hook_type": "challenge"},
        {"question": "Why does a spinning bicycle wheel resist falling over? The counterintuitive math of gyroscopic precession.", "category": "Physics", "difficulty": 1, "hook_type": "paradox"},
        {"question": "If kinetic energy is 1/2 mv², where does the lost mechanical energy actually go during an inelastic collision?", "category": "Physics", "difficulty": 2, "hook_type": "challenge"},
        {"question": "Why does a sonic boom follow a supersonic aircraft continuously rather than happening only at the moment it breaks the barrier?", "category": "Physics", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Can you construct an acoustic levitation trap using standing sound waves to suspend water droplets in mid-air?", "category": "Physics", "difficulty": 3, "hook_type": "challenge"},
        {"question": "Why do shadows cast by sunlight through tree leaves turn into perfect crescent shapes during a solar eclipse?", "category": "Physics", "difficulty": 1, "hook_type": "paradox"},
        {"question": "What if the fine-structure constant was just 4% larger? Why would stellar nuclear fusion cease to exist?", "category": "Physics", "difficulty": 3, "hook_type": "whatif"},
        {"question": "How does a solar sail generate thrust in the vacuum of space using zero propellant?", "category": "Physics", "difficulty": 2, "hook_type": "mindblown"}
    ],
    "Astrophysics": [
        {"question": "A teaspoon of neutron star weighs 6 billion tons. But why doesn't it collapse into a black hole immediately?", "category": "Astrophysics", "difficulty": 2, "hook_type": "paradox"},
        {"question": "What if Earth suddenly had two Suns in a binary orbit? How would the orbital resonance affect our climate?", "category": "Astrophysics", "difficulty": 1, "hook_type": "whatif"},
        {"question": "If the universe is expanding faster than light, how can we still see ancient galaxies billions of light years away?", "category": "Astrophysics", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "Why does dark matter interact only gravitationally while refusing to emit or absorb a single photon of electromagnetic radiation?", "category": "Astrophysics", "difficulty": 2, "hook_type": "paradox"},
        {"question": "What happens at the photon sphere of a black hole where light rays can orbit in closed loops?", "category": "Astrophysics", "difficulty": 3, "hook_type": "whatif"},
        {"question": "Why do white dwarfs have a strict upper mass limit of 1.44 solar masses? (Chandrasekhar Limit)", "category": "Astrophysics", "difficulty": 2, "hook_type": "challenge"},
        {"question": "How do supermassive black holes at galaxy centers launch relativistic jets millions of light-years long?", "category": "Astrophysics", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "What if the Moon was replaced with a neutron star of equal mass? What would happen to ocean tides?", "category": "Astrophysics", "difficulty": 2, "hook_type": "whatif"},
        {"question": "How can cosmic microwave background radiation provide a direct snapshot of the universe when it was only 380,000 years old?", "category": "Astrophysics", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Why is the night sky dark if there are trillions of stars in an infinite universe? (Olbers' Paradox)", "category": "Astrophysics", "difficulty": 1, "hook_type": "paradox"}
    ],
    "Mathematics": [
        {"question": "Why does the sum of all positive integers 1+2+3+4+... yield -1/12 in string theory zeta regularization?", "category": "Mathematics", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "Can you tile an infinite plane with a single 5-fold symmetric shape without the pattern ever repeating? (Penrose Tiling)", "category": "Mathematics", "difficulty": 2, "hook_type": "challenge"},
        {"question": "Why can no consistent mathematical axiomatic system prove all truths about basic arithmetic? (Gödel's Incompleteness)", "category": "Mathematics", "difficulty": 3, "hook_type": "paradox"},
        {"question": "Can you cut a solid ball into 5 pieces and reassemble them into two identical balls of the original size? (Banach-Tarski)", "category": "Mathematics", "difficulty": 3, "hook_type": "paradox"},
        {"question": "Why does the distribution of prime numbers appear random locally yet perfectly regular asymptotically via the Riemann Hypothesis?", "category": "Mathematics", "difficulty": 3, "hook_type": "challenge"},
        {"question": "Why is the number e (2.71828...) the universal limit of continuous compound growth across nature and finance?", "category": "Mathematics", "difficulty": 1, "hook_type": "mindblown"},
        {"question": "How can a 3D horn (Gabriel's Horn) have an infinite surface area but a finite, measurable volume?", "category": "Mathematics", "difficulty": 2, "hook_type": "paradox"},
        {"question": "Why do the Fibonacci numbers and Golden Ratio appear everywhere in sunflower seeds, pinecones, and spiral galaxies?", "category": "Mathematics", "difficulty": 1, "hook_type": "mindblown"},
        {"question": "What if you lived in a 4-dimensional hypercube? How would a rotating tesseract project shadows into our 3D world?", "category": "Mathematics", "difficulty": 2, "hook_type": "whatif"},
        {"question": "Can every even integer greater than 2 be expressed as the sum of two prime numbers? (Goldbach's Conjecture)", "category": "Mathematics", "difficulty": 2, "hook_type": "challenge"}
    ],
    "Computer Science": [
        {"question": "If P=NP is ever proven true, how will it instantly break every modern RSA encryption key in existence?", "category": "Computer Science", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Can a neural network with just one hidden layer approximate any continuous mathematical function? (Universal Approximation)", "category": "Computer Science", "difficulty": 2, "hook_type": "challenge"},
        {"question": "Why is it mathematically impossible to write a program that decides whether ANY arbitrary code will finish running? (The Halting Problem)", "category": "Computer Science", "difficulty": 3, "hook_type": "paradox"},
        {"question": "How do zero-knowledge proofs allow you to prove you know a secret without revealing a single bit of information about it?", "category": "Computer Science", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "Why do modern garbage-collected memory systems cause micro-latency spikes in real-time trading engines?", "category": "Computer Science", "difficulty": 2, "hook_type": "challenge"},
        {"question": "What if quantum computers run Shor's algorithm on elliptic curves? How fast will public key cryptography fall?", "category": "Computer Science", "difficulty": 3, "hook_type": "whatif"},
        {"question": "How can distributed consensus algorithms like Raft and Paxos guarantee leader election during network splits?", "category": "Computer Science", "difficulty": 2, "hook_type": "challenge"},
        {"question": "Why can an $O(N \\log N)$ comparison sorting algorithm NEVER be improved to $O(N)$ without domain-specific key assumptions?", "category": "Computer Science", "difficulty": 2, "hook_type": "paradox"},
        {"question": "How does Backpropagation calculate billions of gradient vectors simultaneously using the matrix chain rule?", "category": "Computer Science", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "Can self-replicating programs (quines) reproduce their own exact source code without reading from disk?", "category": "Computer Science", "difficulty": 2, "hook_type": "challenge"}
    ],
    "Quantum Mechanics": [
        {"question": "Why can you never actually touch an object? Electron degeneracy pressure says true contact is impossible.", "category": "Quantum Mechanics", "difficulty": 1, "hook_type": "paradox"},
        {"question": "In quantum entanglement, if information travels instantaneously across galaxies, why doesn't it violate special relativity?", "category": "Quantum Mechanics", "difficulty": 3, "hook_type": "paradox"},
        {"question": "Why does observing which slit an electron goes through destroy the wave interference pattern? (The Measurement Problem)", "category": "Quantum Mechanics", "difficulty": 2, "hook_type": "paradox"},
        {"question": "How does quantum tunneling allow particles to pass through solid physical energy barriers they don't have the energy to overcome?", "category": "Quantum Mechanics", "difficulty": 2, "hook_type": "mindblown"},
        {"question": "What if quantum decoherence is the only reason our everyday macro-world looks classical instead of having superpositions?", "category": "Quantum Mechanics", "difficulty": 3, "hook_type": "whatif"},
        {"question": "Why do fermions obey the Pauli Exclusion Principle while bosons condense into a single super-atom at microkelvin temperatures?", "category": "Quantum Mechanics", "difficulty": 3, "hook_type": "mindblown"}
    ],
    "Relativity": [
        {"question": "If you free-fall past the event horizon of a supermassive black hole, would you notice anything strange at that exact boundary?", "category": "Relativity", "difficulty": 3, "hook_type": "whatif"},
        {"question": "What happens if you travel at 99.999% the speed of light and turn on a forward-facing laser beam?", "category": "Relativity", "difficulty": 2, "hook_type": "whatif"},
        {"question": "Why does GPS satellite navigation drift by 38 microseconds every day if Einstein's general and special relativity aren't factored in?", "category": "Relativity", "difficulty": 1, "hook_type": "mindblown"},
        {"question": "If gravity is not a physical force but the curvature of spacetime, why does an apple accelerate when dropping from a tree?", "category": "Relativity", "difficulty": 2, "hook_type": "paradox"},
        {"question": "Why does the Twin Paradox prove that time dilation is an asymmetric physical reality rather than a mere illusion of perspective?", "category": "Relativity", "difficulty": 2, "hook_type": "challenge"}
    ],
    "Thermodynamics": [
        {"question": "Why does boiling water freeze faster than room-temperature water in certain convection regimes? (Mpemba effect)", "category": "Thermodynamics", "difficulty": 2, "hook_type": "paradox"},
        {"question": "Is Maxwell's Demon truly capable of decreasing thermodynamic entropy without doing mechanical work?", "category": "Thermodynamics", "difficulty": 3, "hook_type": "paradox"},
        {"question": "Why does the Second Law of Thermodynamics create the irreversible Arrow of Time when all micro-physical laws are time-symmetric?", "category": "Thermodynamics", "difficulty": 3, "hook_type": "paradox"},
        {"question": "How does an air conditioner or heat pump move heat from a cold room into a hotter outdoor environment without violating thermodynamic laws?", "category": "Thermodynamics", "difficulty": 1, "hook_type": "challenge"},
        {"question": "Why is Absolute Zero (-273.15°C) fundamentally unattainable in a finite number of thermodynamic cycles? (The Third Law)", "category": "Thermodynamics", "difficulty": 2, "hook_type": "mindblown"}
    ],
    "Chemistry": [
        {"question": "Why is liquid water densest at 4°C instead of at its freezing point? How does that single anomaly keep aquatic life alive?", "category": "Chemistry", "difficulty": 1, "hook_type": "paradox"},
        {"question": "Can chemical bonds form and break faster than the period of atomic vibrations? (Femtochemistry)", "category": "Chemistry", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "Why is diamond transparent and an electrical insulator, while graphite is opaque and conductive, even though both are 100% pure carbon?", "category": "Chemistry", "difficulty": 1, "hook_type": "paradox"},
        {"question": "How do chemical catalysts speed up reaction rates by orders of magnitude without being consumed in the process?", "category": "Chemistry", "difficulty": 1, "hook_type": "challenge"},
        {"question": "Why do chiral enantiomer molecules with identical chemical formulas have radically different biological and physiological effects?", "category": "Chemistry", "difficulty": 2, "hook_type": "mindblown"}
    ],
    "Engineering": [
        {"question": "Can you design a suspension bridge that withstands aerodynamic flutter and harmonic resonance during hurricane-force winds?", "category": "Engineering", "difficulty": 3, "hook_type": "challenge"},
        {"question": "Why do rocket engines operate at chamber pressures over 300 atmospheres, and how do cooling jackets prevent the nozzle from vaporizing?", "category": "Engineering", "difficulty": 3, "hook_type": "mindblown"},
        {"question": "How do stealth aircraft deflect radar cross-sections down to the size of a marble using faceted geometric surfaces and RAM coatings?", "category": "Engineering", "difficulty": 2, "hook_type": "challenge"},
        {"question": "Why does a jet engine compressor stall occur, and how do variable stator vanes prevent supersonic shockwave boundary separation?", "category": "Engineering", "difficulty": 3, "hook_type": "challenge"}
    ]
}

async def generate_curiosity_feed(recent_topics: list = None, interested_subjects: list = None, language: str = 'English') -> list:
    """
    Generates mind-blowing curiosity hooks STRICTLY tailored to the user's selected subjects only.
    """
    subjects = [s for s in (interested_subjects or []) if s]
    if not subjects:
        subjects = ["Physics", "Mathematics", "Astrophysics"]
        
    subjects_str = ", ".join(subjects)
    lang_instruction = "in conversational Hinglish (Hindi written in Roman English alphabet with technical English words)" if language == "Hinglish" else "in English"
    
    topic_context = f"a student whose chosen subjects of interest are STRICTLY: {subjects_str} {lang_instruction}"
    prompt = f"""Generate exactly 10 mind-blowing curiosity hooks for {topic_context}.

CRITICAL RULE:
- EVERY single hook MUST belong STRICTLY to one of these user-selected subjects: {subjects_str}.
- DO NOT generate questions about any other subjects outside {subjects_str}.

Each hook should be a provocative question that creates an irresistible curiosity gap — the student MUST click to find out.

Hook types to use:
- paradox: Something that seems to violate common sense
- mindblown: An astonishing fact that changes how you see the world  
- challenge: A puzzle or design challenge
- whatif: A thought experiment with dramatic consequences

Return ONLY a valid JSON array with this format:
[{{"question": "...", "category": "exact subject from {subjects_str}", "difficulty": 1-3, "hook_type": "paradox|mindblown|challenge|whatif"}}]

No markdown, no explanation, just the JSON array."""

    try:
        def _generate():
            return client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt
            )
        response = await asyncio.wait_for(asyncio.to_thread(_generate), timeout=7.0)
        raw = response.text.strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
        hooks = json.loads(raw)
        
        # Strictly validate that LLM generated hooks belonging ONLY to selected subjects
        validated_llm_hooks = []
        if isinstance(hooks, list):
            for h in hooks:
                cat = h.get("category", "")
                q = h.get("question", "")
                if q and any(s.lower() in cat.lower() or cat.lower() in s.lower() for s in subjects):
                    validated_llm_hooks.append(h)
                    
        if len(validated_llm_hooks) >= 6:
            return validated_llm_hooks[:10]
    except Exception:
        pass

    # Strictly filter curated subject-specific hooks for the chosen subjects ONLY
    matched_hooks = []
    for s in subjects:
        for cat_name, hook_list in SUBJECT_HOOKS.items():
            if s.lower() in cat_name.lower() or cat_name.lower() in s.lower():
                matched_hooks.extend(hook_list)

    # De-duplicate
    seen_q = set()
    unique_hooks = []
    for h in matched_hooks:
        if h["question"] not in seen_q:
            seen_q.add(h["question"])
            unique_hooks.append(h)

    random.shuffle(unique_hooks)
    return unique_hooks[:10]
