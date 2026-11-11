import time
import random
import json
import asyncio
from google import genai
import config

client = genai.Client(api_key=config.GEMINI_API_KEY)

# ==============================================================================
# ACCESSIBLE, RELATABLE, MIND-BLOWING CURIOSITY MATRIX
# Designed so ANY human (curious or not) gets instantly hooked!
# ==============================================================================
EVERYDAY_CURIOSITY_POOL = [
    # --- Everyday Life & Food Mysteries ---
    {
        "id": "mpemba",
        "question": "Why does boiling hot water freeze faster in the freezer than cold water?",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "paradox",
        "teaser": "Scientists call it the Mpemba Effect. Evaporation, convection currents, and hydrogen bond stretching create this counterintuitive mystery!",
        "options": ["Hot water evaporates & convects faster", "Cold water has more dissolved gas", "It's a complete myth"],
        "answer_idx": 0
    },
    {
        "id": "mirrors",
        "question": "Why do mirrors flip your reflection left-to-right, but never upside-down?",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Mirrors don't actually flip left and right at all—they flip front to back! Your brain creates the optical illusion.",
        "options": ["Mirrors flip front-to-back, not sideways", "Gravity aligns our optic nerves", "Light rays cross at 90 degrees"],
        "answer_idx": 0
    },
    {
        "id": "coffee_trick",
        "question": "Why does coffee wake you up when it actually provides zero physical energy?",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Caffeine doesn't give you energy—it is an impostor molecule that plugs into your brain's adenosine receptors, blocking sleepiness signals!",
        "options": ["It blocks the brain's fatigue receptors", "It burns extra glucose in blood", "It accelerates red blood cells"],
        "answer_idx": 0
    },
    {
        "id": "spicy_food",
        "question": "Why does spicy chili feel scorching hot even when it's ice-cold from the fridge?",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "paradox",
        "teaser": "Capsaicin in chilis triggers the exact same heat receptor (TRPV1) in your tongue that detects 43°C+ physical burns!",
        "options": ["Capsaicin tricks temperature receptors", "Chilis generate thermal heat", "Acid dissolves tongue saliva"],
        "answer_idx": 0
    },
    {
        "id": "chip_bags",
        "question": "Why are potato chip bags puffed up with gas? (Hint: It is definitely NOT air!)",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Bags are filled with pure Nitrogen gas. Oxygen would make the oils turn rancid and chips soggy, while nitrogen cushions the chips!",
        "options": ["Pure Nitrogen preserves crispiness", "Compressed air saves packaging", "Carbon dioxide adds crunch"],
        "answer_idx": 0
    },
    {
        "id": "onion_tears",
        "question": "Why does chopping onions make you cry, but chilling them first stops it?",
        "category": "Everyday Mysteries",
        "difficulty": 1,
        "hook_type": "challenge",
        "teaser": "Cutting breaks onion cells, creating syn-propanethial-S-oxide gas. Cold temperatures dramatically slow down the chemical enzyme reaction!",
        "options": ["Cold slows the tear-gas enzyme reaction", "Cold freezes the onion's acid", "Moisture absorbs the sulfur"],
        "answer_idx": 0
    },

    # --- Wild Nature & Animal Superpowers ---
    {
        "id": "cat_falls",
        "question": "Why can cats survive a 30-story skyscraper fall better than a 7-story fall?",
        "category": "Nature Superpowers",
        "difficulty": 2,
        "hook_type": "paradox",
        "teaser": "Above 7 stories, a cat reaches terminal velocity (~60 mph), relaxes its muscles, and spreads like a flying squirrel to distribute impact!",
        "options": ["They reach terminal velocity and relax", "Their bones become flexible in air", "Wind currents lift them up"],
        "answer_idx": 0
    },
    {
        "id": "powerline_birds",
        "question": "Why don't birds get electrocuted when sitting on 10,000-volt high-voltage wires?",
        "category": "Nature Superpowers",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Electricity requires a difference in voltage to flow. Both feet are on the same wire at the same electrical potential!",
        "options": ["Both feet share the same voltage", "Bird feet have thick rubber insulation", "AC current skips living tissue"],
        "answer_idx": 0
    },
    {
        "id": "gecko_feet",
        "question": "How can a gecko sprint across glass ceilings upside down with zero glue or stickiness?",
        "category": "Nature Superpowers",
        "difficulty": 2,
        "hook_type": "mindblown",
        "teaser": "Millions of microscopic hair setae create van der Waals electromagnetic attractions directly with the glass surface atoms!",
        "options": ["Atomic Van der Waals forces", "Microscopic suction cups", "Static electricity cling"],
        "answer_idx": 0
    },
    {
        "id": "woodpecker_concussion",
        "question": "Why don't woodpeckers get brain damage slamming into wood at 1,200g deceleration?",
        "category": "Nature Superpowers",
        "difficulty": 2,
        "hook_type": "paradox",
        "teaser": "Woodpeckers have a specialized hyoid bone that wraps completely around their skull like a natural Kevlar seatbelt!",
        "options": ["A skull-wrapping hyoid bone absorbs shock", "Their brains have zero fluid", "Wood is softer than bone"],
        "answer_idx": 0
    },

    # --- Pocket Tech & Everyday Magic ---
    {
        "id": "touchscreen_gloves",
        "question": "How does your phone screen know where you touch, and why does a dry glove fail?",
        "category": "Pocket Magic",
        "difficulty": 1,
        "hook_type": "challenge",
        "teaser": "Capacitive touchscreens project an electrostatic grid. Your living finger conducts electricity and distorts the field, which dry fabric cannot!",
        "options": ["Your finger conducts electrical capacitance", "Phone cameras detect shadow", "Pressure sensors measure force"],
        "answer_idx": 0
    },
    {
        "id": "noise_canceling",
        "question": "How do noise-canceling headphones silence jet engines by creating MORE sound?",
        "category": "Pocket Magic",
        "difficulty": 2,
        "hook_type": "mindblown",
        "teaser": "Destructive interference! Microphones listen to incoming engine sound waves and fire an exact opposite 'anti-wave' (inverted phase) to cancel it to zero.",
        "options": ["Destructive phase wave cancellation", "Heavy acoustic foam blocks air", "Ultrasound scatters sound waves"],
        "answer_idx": 0
    },
    {
        "id": "airplane_hole",
        "question": "Why does every passenger airplane window have a tiny mystery hole at the bottom?",
        "category": "Pocket Magic",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "It is a 'bleed hole' that balances cabin pressure between the middle and outer glass panes, preventing windows from blowing out at 35,000 feet!",
        "options": ["It regulates air pressure between panes", "It lets emergency oxygen in", "It prevents moisture frosting"],
        "answer_idx": 0
    },
    {
        "id": "gps_einstein",
        "question": "Why would your phone's GPS map drift by 10 kilometers every day without Einstein's relativity?",
        "category": "Pocket Magic",
        "difficulty": 2,
        "hook_type": "mindblown",
        "teaser": "Satellite atomic clocks tick 38 microseconds faster per day due to weaker gravity and high speed. Without relativistic math, navigation collapses!",
        "options": ["Satellite clocks run faster in weaker gravity", "Earth's magnetic poles wobble", "Radio signals slow down in clouds"],
        "answer_idx": 0
    },

    # --- Mind Tricks & Human Body Wonders ---
    {
        "id": "touch_nothing",
        "question": "Why can you never actually 'touch' anything in the universe, including your own phone?",
        "category": "Mind & Body",
        "difficulty": 2,
        "hook_type": "paradox",
        "teaser": "Electrons in your fingertips and electrons in the screen repel each other via the electromagnetic force. You only feel electrostatic repulsion!",
        "options": ["Electrons repel before atomic contact", "Air molecules form an unbreakable cushion", "Skin friction produces micro-heat"],
        "answer_idx": 0
    },
    {
        "id": "time_perception",
        "question": "Why does time feel like it passes much faster as you get older?",
        "category": "Mind & Body",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Proportional theory: When you are 5, a year is 20% of your life; at 50, it is only 2%. Plus, novel experiences produce denser memory encoding!",
        "options": ["Each year is a smaller fraction of memory", "Brain synapses physically slow down", "Earth's orbit slightly speeds up"],
        "answer_idx": 0
    },
    {
        "id": "brain_freeze",
        "question": "What actually happens inside your skull when you get an intense 'brain freeze'?",
        "category": "Mind & Body",
        "difficulty": 1,
        "hook_type": "challenge",
        "teaser": "Cold liquid hits roof-of-mouth capillaries, triggering the trigeminal nerve. The brain misinterprets the palate signal as forehead pain!",
        "options": ["Nerve referral from the roof of the mouth", "Brain tissue freezes for a millisecond", "Spinal fluid circulation pauses"],
        "answer_idx": 0
    },

    # --- Cosmic Riddles & What-Ifs ---
    {
        "id": "everyone_jump",
        "question": "What would happen to Earth's orbit if all 8 billion humans jumped at the exact same second?",
        "category": "Cosmic What-Ifs",
        "difficulty": 1,
        "hook_type": "whatif",
        "teaser": "Earth moves by less than the width of a single hydrogen atom (1/100th the width of an atom) and instantly snaps right back when we land!",
        "options": ["Earth moves less than an atom's width", "A massive 9.0 earthquake erupts", "Earth's tilt changes by 1 degree"],
        "answer_idx": 0
    },
    {
        "id": "paper_moon",
        "question": "Why would folding an ordinary piece of printer paper 42 times reach all the way to the Moon?",
        "category": "Cosmic What-Ifs",
        "difficulty": 1,
        "hook_type": "mindblown",
        "teaser": "Exponential growth! 0.1mm doubled 42 times equals 2^42 × 0.1mm ≈ 439,804 kilometers—far past the Moon's 384,400 km orbit!",
        "options": ["Exponential 2^42 thickness growth", "Paper fibers stretch in a vacuum", "Static electricity expands the paper"],
        "answer_idx": 0
    },
    {
        "id": "earth_tunnel",
        "question": "If you dug a hole through the center of the Earth and jumped in, how long until you exit the other side?",
        "category": "Cosmic What-Ifs",
        "difficulty": 2,
        "hook_type": "whatif",
        "teaser": "Exactly 42 minutes! You accelerate to 28,000 km/h at the core, then gravity decelerates you so you emerge on the other side seamlessly.",
        "options": ["About 42 minutes of harmonic fall", "You'd get permanently trapped in 5 minutes", "Over 24 hours of falling"],
        "answer_idx": 0
    },
    {
        "id": "dark_night_sky",
        "question": "If the universe has trillions of stars, why is the night sky completely black? (Olbers' Paradox)",
        "category": "Cosmic What-Ifs",
        "difficulty": 2,
        "hook_type": "paradox",
        "teaser": "The universe has a finite age (13.8B years) and is expanding. Light from distant stars hasn't had time to reach us, and is redshifted into invisible infrared!",
        "options": ["The universe has a finite age & is expanding", "Space dust absorbs 99% of starlight", "Stars only shine toward galaxies"],
        "answer_idx": 0
    }
]

# Simple in-memory cache to guarantee zero-quota, instantaneous page-load delivery
_CURATED_CACHE = []
_LAST_CACHE_TIME = 0

async def generate_curiosity_feed(recent_topics: list = None, interested_subjects: list = None, language: str = 'English') -> list:
    """
    Returns an instant, diverse, accessible selection of mind-blowing curiosity hooks.
    Uses zero-quota in-memory delivery to ensure 100% smooth uptime without hitting RPM limits.
    """
    global _CURATED_CACHE, _LAST_CACHE_TIME
    
    # Shuffle and select 6 high-engagement hooks across diverse categories
    categories = list({item["category"] for item in EVERYDAY_CURIOSITY_POOL})
    selected_hooks = []
    
    # Pick at least one from each major category to ensure great variety
    shuffled_pool = list(EVERYDAY_CURIOSITY_POOL)
    random.shuffle(shuffled_pool)
    
    seen_cats = set()
    for item in shuffled_pool:
        cat = item["category"]
        if cat not in seen_cats:
            seen_cats.add(cat)
            selected_hooks.append(item)
        if len(selected_hooks) >= 4:
            break
            
    # Fill remaining to make 6 total
    for item in shuffled_pool:
        if item not in selected_hooks:
            selected_hooks.append(item)
        if len(selected_hooks) >= 6:
            break
            
    return selected_hooks
