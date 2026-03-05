#!/usr/bin/env python3
"""
Plot Lines — Newsletter Title Generator
Generates a folksy, old-timey newspaper title via phi4 (Ollama).
Falls back to a curated static title if Ollama is unavailable.

Usage:
    python3 generate_title.py --solar-term "Rain Water" --weather rainy --region high_plains
    python3 generate_title.py --solar-term "Frost's Descent" --weather frost
    python3 generate_title.py --season fall --weather cloudy

Output:
    A single line of text — the newsletter title. Nothing else.

Interface for masthead:
    Pass --output-json to get a JSON envelope:
    {"title": "Notes from the Rain", "source": "phi4"}
"""

import argparse
import json
import random
import subprocess
import sys
import urllib.request
import urllib.error

# ── Static fallbacks (folksy, old-timey, small-town paper energy) ─────────────
# Used when phi4/Ollama is unavailable. Curated by hand.
STATIC_TITLES = {
    # Solar term × weather
    ("Rain Water",          "rainy"):  "Notes from the Rain",
    ("Rain Water",          "snowy"):  "The Wet Surprise",
    ("Rain Water",          "cloudy"): "A Gray Kind of Morning",
    ("Rain Water",          "sunny"):  "The Garden Drinks",
    ("Rain Water",          "frost"):  "The Last Hard Freeze",
    ("Rain Water",          "heat"):   "The Early Warmth",

    ("Beginning of Spring", "sunny"):  "The First Stir",
    ("Beginning of Spring", "cloudy"): "Still Waiting on Spring",
    ("Beginning of Spring", "rainy"):  "Mud Season Begins",
    ("Beginning of Spring", "snowy"):  "Under the Snow",
    ("Beginning of Spring", "frost"):  "Not Quite Yet",
    ("Beginning of Spring", "heat"):   "The Early Flush",

    ("Awakening of Insects","sunny"):  "Something Woke Up",
    ("Awakening of Insects","rainy"):  "Rain & Worms",
    ("Awakening of Insects","cloudy"): "The Ground Turns",
    ("Awakening of Insects","snowy"):  "Patience",
    ("Awakening of Insects","frost"):  "Frost Before Thaw",
    ("Awakening of Insects","heat"):   "Early Awakening",

    ("Spring Equinox",      "sunny"):  "The Balance",
    ("Spring Equinox",      "rainy"):  "Becoming Everything",
    ("Spring Equinox",      "cloudy"): "Halfway There",
    ("Spring Equinox",      "snowy"):  "Late March Snow",
    ("Spring Equinox",      "frost"):  "Equinox Frost",
    ("Spring Equinox",      "heat"):   "The Early Turn",

    ("Grain Rain",          "rainy"):  "Good Rain for the Grain",
    ("Grain Rain",          "sunny"):  "Warm Rain Coming",
    ("Grain Rain",          "cloudy"): "The Coaxing",
    ("Grain Rain",          "snowy"):  "One More Wet One",
    ("Grain Rain",          "frost"):  "Last Frost Watch",
    ("Grain Rain",          "heat"):   "Dry Grain Rain",

    ("Summer Solstice",     "sunny"):  "The Longest Day",
    ("Summer Solstice",     "heat"):   "The Summit",
    ("Summer Solstice",     "rainy"):  "Solstice Rain",
    ("Summer Solstice",     "cloudy"): "Midsummer",

    ("Autumn Equinox",      "sunny"):  "Harvest Letter",
    ("Autumn Equinox",      "frost"):  "Equinox Frost",
    ("Autumn Equinox",      "rainy"):  "Autumn Rain",
    ("Autumn Equinox",      "snowy"):  "The Frost Line",

    ("Frost's Descent",     "frost"):  "Frost's Descent",
    ("Frost's Descent",     "snowy"):  "The First Snow",
    ("Frost's Descent",     "rainy"):  "Notes from the Mud",
    ("Frost's Descent",     "cloudy"): "The Last Bloom",
    ("Frost's Descent",     "sunny"):  "Frost Descends",

    ("Beginning of Winter", "snowy"):  "First Cover",
    ("Beginning of Winter", "frost"):  "Hard Frost",
    ("Beginning of Winter", "cloudy"): "Winter's Edge",
    ("Beginning of Winter", "sunny"):  "The Garden Quiets",
    ("Beginning of Winter", "rainy"):  "The Long Rain",
    ("Beginning of Winter", "heat"):   "Indian Summer",

    ("Winter Solstice",     "snowy"):  "The Shortest Day",
    ("Winter Solstice",     "frost"):  "Deep Winter",
    ("Winter Solstice",     "sunny"):  "The Cold Light",
    ("Winter Solstice",     "cloudy"): "Solstice Dark",

    ("Major Cold",          "snowy"):  "The Deep Still",
    ("Major Cold",          "frost"):  "Deep Freeze",
    ("Major Cold",          "sunny"):  "Bright and Cold",
    ("Major Cold",          "cloudy"): "The Long Wait",

    ("Minor Cold",          "snowy"):  "The Cold Spell",
    ("Minor Cold",          "frost"):  "Hard Winter",
    ("Minor Cold",          "rainy"):  "January Thaw",
    ("Minor Cold",          "sunny"):  "Winter Plot",
}

# Season-level fallbacks (last resort)
SEASON_FALLBACKS = {
    ("spring", "sunny"):  "The First Bloom",
    ("spring", "rainy"):  "Notes from the Mud",
    ("spring", "cloudy"): "Still Waiting on Spring",
    ("spring", "snowy"):  "The Late Thaw",
    ("spring", "frost"):  "Not Quite Yet",
    ("spring", "heat"):   "The Green Wave",
    ("summer", "sunny"):  "High Summer",
    ("summer", "heat"):   "The Dry Spell Dispatch",
    ("summer", "rainy"):  "The Long Day",
    ("summer", "cloudy"): "Midseason",
    ("fall",   "sunny"):  "Harvest Letter",
    ("fall",   "rainy"):  "Notes from the Mud",
    ("fall",   "frost"):  "The Frost Line",
    ("fall",   "snowy"):  "The First Snow",
    ("fall",   "heat"):   "The Burn",
    ("fall",   "cloudy"): "The Last Bloom",
    ("winter", "snowy"):  "Snow Days",
    ("winter", "frost"):  "Winter Plot",
    ("winter", "cloudy"): "The Dormant",
    ("winter", "rainy"):  "Frost & Folly",
    ("winter", "sunny"):  "The Cold Frame",
    ("winter", "heat"):   "The Cold Frame",
}

# A pool of purely generic old-timey fallbacks (if everything else misses)
GENERIC_POOL = [
    "From the Back Forty",
    "Heard at the Feed Store",
    "The Porch Report",
    "The Mud Season Dispatch",
    "From Down the Row",
    "The Seed Catalog",
    "The Garden Gate",
    "Dirt Under the Nails",
    "The Root Cellar Report",
    "What the Ground Said",
]

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "phi4:14b"  # pull: `ollama pull phi4:14b` — falls back to static if unavailable


def static_title(solar_term=None, season=None, weather=None):
    """Return the best available static fallback title."""
    weather = (weather or "sunny").lower()
    if solar_term:
        t = STATIC_TITLES.get((solar_term, weather))
        if t:
            return t
        # Try a different weather key for same solar term
        for w in ["sunny", "rainy", "cloudy", "snowy", "frost", "heat"]:
            t = STATIC_TITLES.get((solar_term, w))
            if t:
                return t
    if season:
        t = SEASON_FALLBACKS.get((season.lower(), weather))
        if t:
            return t
    return random.choice(GENERIC_POOL)


def llm_title(solar_term=None, season=None, weather=None, region=None):
    """Ask phi4 to generate a folksy newsletter title. Returns str or None."""
    # Build context sentence
    parts = []
    if solar_term:
        parts.append(f"solar term: {solar_term}")
    elif season:
        parts.append(f"season: {season}")
    if weather:
        parts.append(f"weather: {weather}")
    if region:
        parts.append(f"region: {region.replace('_', ' ')}")
    context = ", ".join(parts) if parts else "a typical garden day"

    prompt = (
        "You write titles for a small-town garden newsletter. "
        "The titles are folksy, old-timey, and poetic — like something printed on a Thursday "
        "by someone who also sells seed corn. Short. Evocative. No more than six words. "
        "No punctuation at the end. No quotes. Just the title, nothing else.\n\n"
        f"Today's context: {context}\n\n"
        "Title:"
    )

    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.9,
            "top_p": 0.85,
            "num_predict": 24,
        }
    }).encode()

    try:
        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read())
            raw = data.get("response", "").strip()
            # Strip wrapping quotes if phi4 added them
            raw = raw.strip('"\'')
            # Take only the first line
            title = raw.splitlines()[0].strip().rstrip(".,;:")
            return title if title else None
    except Exception as e:
        print(f"[generate_title] Ollama unavailable: {e}", file=sys.stderr)
        return None


def main():
    p = argparse.ArgumentParser(description="Generate a folksy newsletter title")
    p.add_argument("--solar-term",  help="e.g. 'Rain Water'")
    p.add_argument("--season",      choices=["spring", "summer", "fall", "winter"])
    p.add_argument("--weather",     choices=["sunny", "cloudy", "rainy", "snowy", "frost", "heat"])
    p.add_argument("--region",      help="e.g. high_plains, gulf_coast, pacific_coast")
    p.add_argument("--no-llm",      action="store_true", help="Skip Ollama, use static titles only")
    p.add_argument("--output-json", action="store_true", help="Emit JSON envelope instead of plain text")
    args = p.parse_args()

    title = None
    source = "static"

    if not args.no_llm:
        title = llm_title(
            solar_term=args.solar_term,
            season=args.season,
            weather=args.weather,
            region=args.region,
        )
        if title:
            source = MODEL

    if not title:
        title = static_title(
            solar_term=args.solar_term,
            season=args.season,
            weather=args.weather,
        )
        source = "static"

    if args.output_json:
        print(json.dumps({"title": title, "source": source}))
    else:
        print(title)


if __name__ == "__main__":
    main()
