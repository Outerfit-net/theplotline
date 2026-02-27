#!/usr/bin/env python3
"""
Garden Conversation Engine - Plot Lines

Generates daily garden dialog conversations with fictional characters.
Adapted from garden-daily-v2.py for newsletter delivery.

Usage (subprocess from Node.js dispatcher):
  python engine.py --station BOU --author hemingway --city Boulder --state CO --context "..." --output json
"""

import os
import random
import re
import sys
import time
import json
import urllib.request
import urllib.error
import urllib.parse
import argparse
from datetime import datetime

# Load author styles from external JSON
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AUTHORS_FILE = os.path.join(SCRIPT_DIR, "authors.json")

try:
    with open(AUTHORS_FILE, encoding="utf-8") as f:
        AUTHOR_STYLES = json.load(f)
except Exception as e:
    print(f"WARNING: Could not load authors.json: {e}", file=sys.stderr)
    AUTHOR_STYLES = {
        "hemingway": {
            "name": "Ernest Hemingway",
            "style": "Short declarative sentences. Concrete nouns. Subtext over statement."
        }
    }

# Full cast of characters
CAST = [
    ("buckthorn", "Buck Thorn"),
    ("harry-kvetch", "Harry Kvetch"),
    ("miss-canthus", "Ms. Canthus"),
    ("poppy-seed", "Poppy Seed"),
    ("ivy-league", "Ivy League"),
    ("chelsea-flower", "Chelsea Flower"),
    ("buster-native", "Buster Native"),
    ("fern", "Fern Young"),
    ("esther-potts", "Esther Potts"),
    ("herb-berryman", "Herb Berryman"),
    ("muso-maple", "Muso Maple"),
    ("edie-bell", "Edie Bell"),
]


def log(msg):
    """Log to stderr"""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[garden-engine {ts}] {msg}", file=sys.stderr, flush=True)


def fetch_weather_data(lat, lon):
    """Fetch current conditions and forecast from weather.gov"""
    log(f"fetch_weather: lat={lat}, lon={lon}")

    try:
        headers = {"User-Agent": "PlotLines/1.0"}

        # Get grid metadata
        points_url = f"https://api.weather.gov/points/{lat},{lon}"
        req = urllib.request.Request(points_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            points_data = json.loads(response.read().decode())

        forecast_url = points_data["properties"]["forecast"]
        station_url = points_data["properties"]["observationStations"]

        # Get forecast
        req = urllib.request.Request(forecast_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            forecast_data = json.loads(response.read().decode())

        periods = forecast_data["properties"]["periods"][:7]
        forecast_summary = []
        for p in periods:
            forecast_summary.append(f"- {p['name']}: {p['shortForecast']}, {p['temperature']}{p['temperatureUnit']}")

        # Get current observation
        req = urllib.request.Request(station_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            stations_data = json.loads(response.read().decode())

        station_id = stations_data["features"][0]["properties"]["stationIdentifier"]
        obs_url = f"https://api.weather.gov/stations/{station_id}/observations/latest"

        req = urllib.request.Request(obs_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            obs_data = json.loads(response.read().decode())

        props = obs_data["properties"]
        temp_c = props.get("temperature", {}).get("value")
        temp_f = (temp_c * 9/5) + 32 if temp_c else None
        description = props.get("textDescription", "N/A")

        current = f"{description}, {temp_f:.0f}F" if temp_f else description

        return {
            "current": current,
            "forecast": "\n".join(forecast_summary),
            "raw_temp": temp_f
        }

    except Exception as e:
        log(f"fetch_weather error: {e}")
        return {
            "current": "Weather data unavailable",
            "forecast": "(Forecast unavailable)",
            "raw_temp": None
        }


def generate_topic(date_str, weather, city, state):
    """Generate a garden topic for the day"""
    month = datetime.now().month

    if month in [12, 1, 2]:
        topics = [
            "Planning spring beds while frost holds",
            "Seed catalogs and winter dreams",
            "Pruning dormant trees",
            "Checking perennials for heaving",
        ]
    elif month in [3, 4, 5]:
        topics = [
            "Last frost dates and early planting",
            "Starting seeds indoors",
            "Soil preparation for spring",
            "Dividing perennials",
        ]
    elif month in [6, 7, 8]:
        topics = [
            "Deep watering in the heat",
            "Succession planting for fall harvest",
            "Managing pests organically",
            "Mulching to conserve moisture",
        ]
    else:
        topics = [
            "Fall cleanup and bed prep",
            "Planting garlic for next year",
            "Protecting tender plants from frost",
            "Composting fallen leaves",
        ]

    return random.choice(topics)


def generate_quote():
    """Return a random garden quote"""
    quotes = [
        ("To plant a garden is to believe in tomorrow.", "Audrey Hepburn"),
        ("A garden requires patient labor and attention.", "Liberty Hyde Bailey"),
        ("The glory of gardening: hands in the dirt, head in the sun, heart with nature.", "Alfred Austin"),
        ("Gardens are not made by singing 'Oh, how beautiful,' and sitting in the shade.", "Rudyard Kipling"),
        ("He who plants a garden plants happiness.", "Chinese Proverb"),
        ("In every gardener there is a child who believes in The Seed Fairy.", "Robert Brault"),
        ("The garden suggests there might be a place where we can meet nature halfway.", "Michael Pollan"),
        ("A weed is but an unloved flower.", "Ella Wheeler Wilcox"),
    ]
    quote, author = random.choice(quotes)
    return f"{quote} -- {author}"


def generate_dialogue(characters, topic, quote, weather, garden_context, city, state):
    """Generate a dialogue between characters about the topic"""

    # Character voice snippets (simplified for subprocess use)
    voices = {
        "Buck Thorn": "practical, no-nonsense, references decades of experience",
        "Harry Kvetch": "perpetual worrier, sees problems everywhere, endearing pessimism",
        "Ms. Canthus": "elegant, formal, quotes poetry, slightly imperious",
        "Poppy Seed": "dreamy, optimistic, tends to wander off-topic",
        "Ivy League": "academic, loves Latin names, can be pedantic",
        "Chelsea Flower": "competition gardener, perfectionist, name-drops varieties",
        "Buster Native": "native plant advocate, environmental consciousness",
        "Fern Young": "new gardener, asks good questions, eager learner",
        "Esther Potts": "container gardening specialist, apartment gardener",
        "Herb Berryman": "culinary focus, grows for the kitchen",
        "Muso Maple": "tree specialist, long-term thinker",
        "Edie Bell": "elderly, wise, remembers how things used to be done",
    }

    # Build a simple multi-turn dialogue
    dialogue = []

    for i, (char_id, char_name) in enumerate(characters):
        voice = voices.get(char_name, "thoughtful gardener")

        if i == 0:
            # Opening line
            lines = [
                f"Been thinking about {topic.lower()} lately.",
                f"Weather like this, can't help but think about {topic.lower()}.",
                f"Anyone else wrestling with {topic.lower()} this week?",
            ]
        elif i == len(characters) - 1:
            # Closing line
            lines = [
                f"That's the thing about gardening. Patience.",
                f"Well, I better get back to it. The garden waits for no one.",
                f"Speaking of which, I've got beds to tend.",
            ]
        else:
            # Middle responses
            lines = [
                f"I've always found {topic.lower()} requires a certain approach.",
                f"My grandmother used to say something about that.",
                f"The key is paying attention to what the plants tell you.",
                f"Takes years to really understand, doesn't it?",
            ]

        dialogue.append({
            "character": char_name,
            "line": random.choice(lines)
        })

    return dialogue


def refine_to_prose(dialogue, author_key):
    """Convert dialogue list to prose narrative"""
    author_style = AUTHOR_STYLES.get(author_key, AUTHOR_STYLES['hemingway'])

    # Simple prose conversion
    prose_lines = []

    for i, turn in enumerate(dialogue):
        char = turn["character"]
        line = turn["line"]

        # Add some narrative variety
        if i == 0:
            prose_lines.append(f'"{line}" {char} said, surveying the morning garden.')
        elif i == len(dialogue) - 1:
            prose_lines.append(f'{char} nodded slowly. "{line}"')
        else:
            beats = [
                f'"{line}" {char} replied.',
                f'{char} considered this. "{line}"',
                f'"{line}"',
            ]
            prose_lines.append(random.choice(beats))

    return "\n\n".join(prose_lines)


def main():
    parser = argparse.ArgumentParser(description='Garden conversation engine')
    parser.add_argument('--station', required=True, help='NWS station code')
    parser.add_argument('--author', default='hemingway', help='Author style key')
    parser.add_argument('--city', required=True, help='City name')
    parser.add_argument('--state', required=True, help='State abbreviation')
    parser.add_argument('--lat', type=float, required=True, help='Latitude')
    parser.add_argument('--lon', type=float, required=True, help='Longitude')
    parser.add_argument('--context', default='', help='Garden context for location')
    parser.add_argument('--output', choices=['json', 'text'], default='json', help='Output format')
    parser.add_argument('--num-chars', type=int, default=4, help='Number of characters')
    args = parser.parse_args()

    log(f"Starting engine: {args.city}, {args.state} ({args.station})")

    # Seed random with current time
    random.seed(datetime.now().microsecond)

    date_str = datetime.now().strftime("%B %d, %Y")

    # Fetch weather
    weather = fetch_weather_data(args.lat, args.lon)

    # Generate topic and quote
    topic = generate_topic(date_str, weather, args.city, args.state)
    quote = generate_quote()

    # Select random characters
    num_chars = min(args.num_chars, len(CAST))
    chosen = random.sample(CAST, num_chars)
    random.shuffle(chosen)

    character_names = [c[1] for c in chosen]
    log(f"Characters: {', '.join(character_names)}")

    # Generate dialogue
    dialogue = generate_dialogue(
        chosen, topic, quote, weather,
        args.context, args.city, args.state
    )

    # Refine to prose
    prose = refine_to_prose(dialogue, args.author)

    # Build result
    result = {
        "date": date_str,
        "topic": topic,
        "quote": quote,
        "author": args.author,
        "author_name": AUTHOR_STYLES.get(args.author, {}).get("name", args.author),
        "characters": character_names,
        "weather_summary": weather["current"],
        "prose_text": prose,
        "prose_html": prose.replace("\n\n", "</p><p>").replace("\n", "<br>"),
        "generated_at": datetime.now().isoformat(),
    }

    # Wrap prose in HTML paragraphs
    result["prose_html"] = f"<p>{result['prose_html']}</p>"

    if args.output == 'json':
        print(json.dumps(result, indent=2))
    else:
        print(f"GARDEN CONVERSATION - {date_str}")
        print(f"Topic: {topic}")
        print(f"Characters: {', '.join(character_names)}")
        print()
        print(prose)
        print()
        print(quote)

    return 0


if __name__ == "__main__":
    sys.exit(main())
