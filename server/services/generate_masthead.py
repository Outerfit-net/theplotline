#!/usr/bin/env python3
"""
Plot Lines Masthead Generator
Generates a 600x100px PNG masthead for a given (station, author, season, weather) combo.
Lazy: checks cache first, generates only if missing.

Usage:
    python3 generate_masthead.py <station> <author> <season> <weather> [--output /path/out.png]
    python3 generate_masthead.py BOU hemingway fall frost
    python3 generate_masthead.py BOU hemingway fall frost --batch
    python3 generate_masthead.py BOU hemingway fall frost --solar-term "Rain Water"
"""

import sys, os, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DATA_DIR      = Path(os.environ.get("DATA_DIR", "/opt/plotlines/data"))
MASTHEAD_DIR  = DATA_DIR / "mastheads"
FONT_DIR = Path(os.environ.get("FONT_DIR", "/opt/plotlines/fonts/commercial"))
FALLBACK_FONTS = Path("/usr/share/fonts/truetype/dejavu")

WIDTH, HEIGHT = 700, 200

# ── Solar-term-aware titles ──────────────────────────────────────────────────
# Keyed by (solar_term_name, weather).  These take priority over the coarse
# season fallbacks below.  Weather keys: sunny, cloudy, rainy, snowy, frost, heat
SOLAR_TITLES = {
    # 1 · Beginning of Spring (Feb 4)
    ("Beginning of Spring", "sunny"):  "The Loosening",
    ("Beginning of Spring", "cloudy"): "First Stir",
    ("Beginning of Spring", "rainy"):  "Mud Season Begins",
    ("Beginning of Spring", "snowy"):  "Under the Snow",
    ("Beginning of Spring", "frost"):  "Still Winter",
    ("Beginning of Spring", "heat"):   "The Early Flush",

    # 2 · Rain Water (Feb 19)
    ("Rain Water", "sunny"):  "The Garden Drinks",
    ("Rain Water", "cloudy"): "Rain Water",
    ("Rain Water", "rainy"):  "Notes from the Rain",
    ("Rain Water", "snowy"):  "Wet Snow",
    ("Rain Water", "frost"):  "The Last Hard Freeze",
    ("Rain Water", "heat"):   "The Garden Drinks",

    # 3 · Awakening of Insects (Mar 6)
    ("Awakening of Insects", "sunny"):  "The System Restarts",
    ("Awakening of Insects", "cloudy"): "The Ground Turns",
    ("Awakening of Insects", "rainy"):  "Rain & Worms",
    ("Awakening of Insects", "snowy"):  "Late Cold",
    ("Awakening of Insects", "frost"):  "Frost Before Thaw",
    ("Awakening of Insects", "heat"):   "Early Awakening",

    # 4 · Spring Equinox (Mar 21)
    ("Spring Equinox", "sunny"):  "The Balance",
    ("Spring Equinox", "cloudy"): "Mid-Sentence",
    ("Spring Equinox", "rainy"):  "Becoming Everything",
    ("Spring Equinox", "snowy"):  "Late March Snow",
    ("Spring Equinox", "frost"):  "Equinox Frost",
    ("Spring Equinox", "heat"):   "The Early Turn",

    # 5 · Pure Brightness (Apr 5)
    ("Pure Brightness", "sunny"):  "The World Clarifies",
    ("Pure Brightness", "cloudy"): "Soft Light",
    ("Pure Brightness", "rainy"):  "Petal Rain",
    ("Pure Brightness", "snowy"):  "Late Blossom Snow",
    ("Pure Brightness", "frost"):  "Cold Clarity",
    ("Pure Brightness", "heat"):   "The Bright Heat",

    # 6 · Grain Rain (Apr 20)
    ("Grain Rain", "sunny"):  "Warm Rain Coming",
    ("Grain Rain", "cloudy"): "The Coaxing",
    ("Grain Rain", "rainy"):  "Grain Rain",
    ("Grain Rain", "snowy"):  "The Wet Surprise",
    ("Grain Rain", "frost"):  "Last Frost Watch",
    ("Grain Rain", "heat"):   "Dry Grain Rain",

    # 7 · Beginning of Summer (May 6)
    ("Beginning of Summer", "sunny"):  "The Long Days Open",
    ("Beginning of Summer", "cloudy"): "Summer's Eve",
    ("Beginning of Summer", "rainy"):  "May Rain",
    ("Beginning of Summer", "snowy"):  "Late Snow",
    ("Beginning of Summer", "frost"):  "One More Frost",
    ("Beginning of Summer", "heat"):   "The Heat Arrives",

    # 8 · Grain Buds (May 21)
    ("Grain Buds", "sunny"):  "Everything Swelling",
    ("Grain Buds", "cloudy"): "Green on Green",
    ("Grain Buds", "rainy"):  "The Swelling Rain",
    ("Grain Buds", "snowy"):  "Late May Snow",
    ("Grain Buds", "frost"):  "Grain Buds & Frost",
    ("Grain Buds", "heat"):   "The Hot Flush",

    # 9 · Grain in Ear (Jun 6)
    ("Grain in Ear", "sunny"):  "Peak Green",
    ("Grain in Ear", "cloudy"): "The Hum",
    ("Grain in Ear", "rainy"):  "June Rain",
    ("Grain in Ear", "snowy"):  "June Snow",
    ("Grain in Ear", "frost"):  "Late Frost",
    ("Grain in Ear", "heat"):   "The Climb Begins",

    # 10 · Summer Solstice (Jun 21)
    ("Summer Solstice", "sunny"):  "The Longest Day",
    ("Summer Solstice", "cloudy"): "Solstice Cloud",
    ("Summer Solstice", "rainy"):  "Solstice Rain",
    ("Summer Solstice", "snowy"):  "Solstice",
    ("Summer Solstice", "frost"):  "Solstice",
    ("Summer Solstice", "heat"):   "The Summit",

    # 11 · Minor Heat (Jul 7)
    ("Minor Heat", "sunny"):  "The Warmth Settles",
    ("Minor Heat", "cloudy"): "Heat & Cloud",
    ("Minor Heat", "rainy"):  "Monsoon Watch",
    ("Minor Heat", "snowy"):  "Minor Heat",
    ("Minor Heat", "frost"):  "Minor Heat",
    ("Minor Heat", "heat"):   "Minor Heat",

    # 12 · Major Heat (Jul 23)
    ("Major Heat", "sunny"):  "The Dry Spell Dispatch",
    ("Major Heat", "cloudy"): "Midseason",
    ("Major Heat", "rainy"):  "The Monsoon Letter",
    ("Major Heat", "snowy"):  "High Summer",
    ("Major Heat", "frost"):  "High Summer",
    ("Major Heat", "heat"):   "The Furnace",

    # 13 · Beginning of Autumn (Aug 7)
    ("Beginning of Autumn", "sunny"):  "The Shift",
    ("Beginning of Autumn", "cloudy"): "Autumn's Edge",
    ("Beginning of Autumn", "rainy"):  "Monsoon's Last",
    ("Beginning of Autumn", "snowy"):  "Early Autumn",
    ("Beginning of Autumn", "frost"):  "First Chill",
    ("Beginning of Autumn", "heat"):   "The Heat Holds",

    # 14 · End of Heat (Aug 23)
    ("End of Heat", "sunny"):  "The Turning",
    ("End of Heat", "cloudy"): "The Cool Returns",
    ("End of Heat", "rainy"):  "End of Monsoon",
    ("End of Heat", "snowy"):  "Early September",
    ("End of Heat", "frost"):  "First Frost Watch",
    ("End of Heat", "heat"):   "Heat Lingers",

    # 15 · White Dew (Sep 8)
    ("White Dew", "sunny"):  "Dew on Every Surface",
    ("White Dew", "cloudy"): "The Dew Line",
    ("White Dew", "rainy"):  "Wet September",
    ("White Dew", "snowy"):  "First Snow",
    ("White Dew", "frost"):  "White Dew & Frost",
    ("White Dew", "heat"):   "Dew & Heat",

    # 16 · Autumn Equinox (Sep 23)
    ("Autumn Equinox", "sunny"):  "Harvest Letter",
    ("Autumn Equinox", "cloudy"): "The Equinox",
    ("Autumn Equinox", "rainy"):  "Autumn Rain",
    ("Autumn Equinox", "snowy"):  "The Frost Line",
    ("Autumn Equinox", "frost"):  "Equinox Frost",
    ("Autumn Equinox", "heat"):   "Warm September",

    # 17 · Cold Dew (Oct 8)
    ("Cold Dew", "sunny"):  "The Last Gold",
    ("Cold Dew", "cloudy"): "October",
    ("Cold Dew", "rainy"):  "Cold Rain",
    ("Cold Dew", "snowy"):  "The Frost Line",
    ("Cold Dew", "frost"):  "Cold Dew & Frost",
    ("Cold Dew", "heat"):   "The Burn",

    # 18 · Frost's Descent (Oct 23)
    ("Frost's Descent", "sunny"):  "Frost Descends",
    ("Frost's Descent", "cloudy"): "The Last Bloom",
    ("Frost's Descent", "rainy"):  "Notes from the Mud",
    ("Frost's Descent", "snowy"):  "The First Snow",
    ("Frost's Descent", "frost"):  "Frost's Descent",
    ("Frost's Descent", "heat"):   "October Warmth",

    # 19 · Beginning of Winter (Nov 7)
    ("Beginning of Winter", "sunny"):  "The Garden Quiets",
    ("Beginning of Winter", "cloudy"): "Winter's Edge",
    ("Beginning of Winter", "rainy"):  "The Long Rain",
    ("Beginning of Winter", "snowy"):  "First Cover",
    ("Beginning of Winter", "frost"):  "Hard Frost",
    ("Beginning of Winter", "heat"):   "Indian Summer",

    # 20 · Minor Snow (Nov 22)
    ("Minor Snow", "sunny"):  "The Cold Frame",
    ("Minor Snow", "cloudy"): "The Dormant",
    ("Minor Snow", "rainy"):  "Sleet & Rain",
    ("Minor Snow", "snowy"):  "Minor Snow",
    ("Minor Snow", "frost"):  "Killing Frost",
    ("Minor Snow", "heat"):   "Mild November",

    # 21 · Major Snow (Dec 7)
    ("Major Snow", "sunny"):  "Snow Days",
    ("Major Snow", "cloudy"): "The Dormant",
    ("Major Snow", "rainy"):  "Frost & Folly",
    ("Major Snow", "snowy"):  "Major Snow",
    ("Major Snow", "frost"):  "Deep Freeze",
    ("Major Snow", "heat"):   "The Cold Frame",

    # 22 · Winter Solstice (Dec 22)
    ("Winter Solstice", "sunny"):  "The Shortest Day",
    ("Winter Solstice", "cloudy"): "Solstice Dark",
    ("Winter Solstice", "rainy"):  "Solstice Rain",
    ("Winter Solstice", "snowy"):  "Winter Solstice",
    ("Winter Solstice", "frost"):  "Deep Winter",
    ("Winter Solstice", "heat"):   "The Cold Frame",

    # 23 · Minor Cold (Jan 6)
    ("Minor Cold", "sunny"):  "Winter Plot",
    ("Minor Cold", "cloudy"): "The Dormant",
    ("Minor Cold", "rainy"):  "January Thaw",
    ("Minor Cold", "snowy"):  "Minor Cold",
    ("Minor Cold", "frost"):  "Hard Winter",
    ("Minor Cold", "heat"):   "The Cold Frame",

    # 24 · Major Cold (Jan 20)
    ("Major Cold", "sunny"):  "The Deep Still",
    ("Major Cold", "cloudy"): "The Dormant",
    ("Major Cold", "rainy"):  "Frost & Folly",
    ("Major Cold", "snowy"):  "Major Cold",
    ("Major Cold", "frost"):  "Deep Freeze",
    ("Major Cold", "heat"):   "Winter Plot",
}

# ── Coarse-season fallbacks (used when no solar term is provided) ─────────────
TITLES = {
    ("spring","sunny"):  "The First Bloom",
    ("spring","cloudy"): "Sprout Notes",
    ("spring","rainy"):  "Notes from the Mud",
    ("spring","snowy"):  "The Late Thaw",
    ("spring","frost"):  "The Late Thaw",
    ("spring","heat"):   "The Green Wave",
    ("summer","sunny"):  "High Summer",
    ("summer","cloudy"): "Midseason",
    ("summer","rainy"):  "The Long Day",
    ("summer","snowy"):  "High Summer",
    ("summer","frost"):  "High Summer",
    ("summer","heat"):   "The Dry Spell Dispatch",
    ("fall","sunny"):    "Harvest Letter",
    ("fall","cloudy"):   "The Last Bloom",
    ("fall","rainy"):    "Notes from the Mud",
    ("fall","snowy"):    "The Frost Line",
    ("fall","frost"):    "The Frost Line",
    ("fall","heat"):     "The Burn",
    ("winter","sunny"):  "The Cold Frame",
    ("winter","cloudy"): "The Dormant",
    ("winter","rainy"):  "Frost & Folly",
    ("winter","snowy"):  "Snow Days",
    ("winter","frost"):  "Winter Plot",
    ("winter","heat"):   "The Cold Frame",
}

PALETTES = {
    "spring": {
        "sunny":  {"bg":(240,245,220),"text":(50,80,40),  "accent":(120,160,80)},
        "cloudy": {"bg":(220,230,215),"text":(60,80,55),  "accent":(140,160,120)},
        "rainy":  {"bg":(200,215,210),"text":(50,75,70),  "accent":(100,140,130)},
        "snowy":  {"bg":(235,240,245),"text":(70,90,100), "accent":(140,170,180)},
        "frost":  {"bg":(230,238,245),"text":(60,85,100), "accent":(130,165,185)},
        "heat":   {"bg":(245,242,210),"text":(80,90,30),  "accent":(160,170,60)},
    },
    "summer": {
        "sunny":  {"bg":(245,240,200),"text":(80,60,20),  "accent":(180,140,40)},
        "cloudy": {"bg":(225,230,210),"text":(60,70,40),  "accent":(130,150,80)},
        "rainy":  {"bg":(210,225,215),"text":(40,70,60),  "accent":(90,140,110)},
        "snowy":  {"bg":(240,240,230),"text":(70,80,60),  "accent":(140,160,110)},
        "frost":  {"bg":(235,240,235),"text":(60,80,65),  "accent":(130,160,120)},
        "heat":   {"bg":(255,235,185),"text":(120,60,10), "accent":(200,120,30)},
    },
    "fall": {
        "sunny":  {"bg":(245,225,185),"text":(100,55,20), "accent":(190,110,30)},
        "cloudy": {"bg":(220,210,190),"text":(80,65,40),  "accent":(160,130,70)},
        "rainy":  {"bg":(200,200,185),"text":(70,70,55),  "accent":(130,120,80)},
        "snowy":  {"bg":(235,230,220),"text":(80,75,65),  "accent":(160,145,110)},
        "frost":  {"bg":(220,225,230),"text":(65,75,90),  "accent":(120,140,165)},
        "heat":   {"bg":(255,215,160),"text":(130,60,10), "accent":(210,100,20)},
    },
    "winter": {
        "sunny":  {"bg":(235,240,245),"text":(60,80,100), "accent":(120,155,185)},
        "cloudy": {"bg":(215,220,225),"text":(65,75,85),  "accent":(120,140,160)},
        "rainy":  {"bg":(205,215,220),"text":(55,70,80),  "accent":(100,130,150)},
        "snowy":  {"bg":(240,245,252),"text":(70,90,110), "accent":(150,175,200)},
        "frost":  {"bg":(228,235,245),"text":(55,75,100), "accent":(120,155,195)},
        "heat":   {"bg":(240,235,225),"text":(80,75,60),  "accent":(155,145,110)},
    },
}

# When garden fonts land in FONT_DIR, map author → preferred filename here
AUTHOR_FONTS = {
    "hemingway":  "Spectral-Bold.ttf",
    "carver":     "Lora-Regular.ttf",
    "munro":      "CormorantGaramond-Italic.ttf",
    "morrison":   "PlayfairDisplay-Bold.ttf",
    "oates":      "Lora-Bold.ttf",
    "lopez":      "IMFellEnglish-Regular.ttf",
    "strout":     "CormorantGaramond-Regular.ttf",
    "bass":       "IMFellEnglish-Italic.ttf",
    "mccarthy":   "Cinzel-Bold.ttf",
    "oconnor":    "Cinzel-Regular.ttf",
    "hurston":    "Caveat-Bold.ttf",
    "saunders":   "Caveat-Regular.ttf",
    "default":    "Lora-Regular.ttf",
}

def load_font(author, size):
    name = AUTHOR_FONTS.get(author, AUTHOR_FONTS["default"])
    for base in [FONT_DIR, FALLBACK_FONTS]:
        p = base / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

def cache_key(station, author, season, weather, solar_term=None, art_layer=None):
    # station intentionally excluded — masthead is author+season+weather+(solar_term)+(art_layer) only
    base = f"{author}:{season}:{weather}"
    if solar_term:
        base += f":{solar_term}"
    if art_layer:
        base += f":{art_layer}"
    return hashlib.md5(base.encode()).hexdigest()

def generate(station, author, season, weather, output_path=None, art_layer=None, solar_term=None, title_override=None):
    """
    Generate (or fetch from cache) a masthead PNG.

    solar_term:     optional str matching a key in SOLAR_TITLES, e.g. "Rain Water".
    title_override: if provided, skip all title lookup and use this string directly.
                    This is the primary path when generate_title.py drives titles.
    """
    MASTHEAD_DIR.mkdir(parents=True, exist_ok=True)
    season, weather, author = season.lower(), weather.lower(), author.lower()
    # Normalise solar_term capitalisation for lookup
    solar_term_norm = solar_term.strip() if solar_term else None

    key  = cache_key(station, author, season, weather, solar_term_norm, art_layer)
    out  = output_path or (MASTHEAD_DIR / f"{key}.png")
    if out.exists() and not output_path:
        return out  # cache hit

    pal = PALETTES.get(season, PALETTES["spring"]).get(
        weather, {"bg":(240,245,220),"text":(50,80,40),"accent":(120,160,80)}
    )

    # Title: explicit override → solar term lookup → coarse season fallback
    if title_override:
        title    = title_override.strip()
        subtitle = f"theplotline.net  ·  {solar_term_norm or season.capitalize()}"
    elif solar_term_norm:
        title = (
            SOLAR_TITLES.get((solar_term_norm, weather))
            or SOLAR_TITLES.get((solar_term_norm, "sunny"))
            or TITLES.get((season, weather), "Plot Lines")
        )
        subtitle = f"theplotline.net  ·  {solar_term_norm}"
    else:
        title    = TITLES.get((season, weather), "Plot Lines")
        subtitle = f"theplotline.net  ·  {season.capitalize()}"

    # If art layer provided and exists: full bleed background
    ART_SPLIT = 0
    if art_layer and Path(art_layer).exists():
        try:
            art = Image.open(art_layer).convert("RGB")
            if art.size != (WIDTH, HEIGHT):
                art = art.resize((WIDTH, HEIGHT), resample=Image.LANCZOS)
            img = art
        except Exception:
            img = Image.new("RGB", (WIDTH, HEIGHT), pal["bg"])
    else:
        img = Image.new("RGB", (WIDTH, HEIGHT), pal["bg"])
    
    draw = ImageDraw.Draw(img)

    # Borders (full image)
    draw.rectangle([0,0,WIDTH-1,HEIGHT-1], outline=pal["accent"], width=2)
    draw.rectangle([4,4,WIDTH-5,HEIGHT-5], outline=pal["accent"], width=1)

    # Corner marks
    for cx, cy in [(10,10),(WIDTH-10,10),(10,HEIGHT-10),(WIDTH-10,HEIGHT-10)]:
        draw.line([(cx-4,cy),(cx+4,cy)], fill=pal["accent"], width=1)
        draw.line([(cx,cy-4),(cx,cy+4)], fill=pal["accent"], width=1)

    # Rules
    draw.line([(14, 22),(WIDTH-14, 22)], fill=pal["accent"], width=1)
    draw.line([(14, HEIGHT-23),(WIDTH-14, HEIGHT-23)], fill=pal["accent"], width=1)

    tfont = load_font(author, 78)
    sfont = load_font(author, 13)

    bbox = draw.textbbox((0,0), title, font=tfont)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    tx = 24                                           # left-justified with padding
    ty = (HEIGHT - (bbox[3] + bbox[1])) // 2        # true vertical center

    # Title: dark stroke + white fill
    stroke_color = (40, 25, 10)
    for ox, oy in [(-2,-2),(0,-2),(2,-2),(-2,0),(2,0),(-2,2),(0,2),(2,2)]:
        draw.text((tx+ox, ty+oy), title, font=tfont, fill=stroke_color)
    draw.text((tx, ty), title, font=tfont, fill=(255, 255, 255))

    # Subtitle: bottom-right, stroke + white
    sbbox = draw.textbbox((0,0), subtitle, font=sfont)
    sw = sbbox[2] - sbbox[0]
    sx = WIDTH - sw - 18
    sy = HEIGHT - 20
    for ox, oy in [(-1,-1),(0,-1),(1,-1),(-1,0),(1,0),(-1,1),(0,1),(1,1)]:
        draw.text((sx+ox, sy+oy), subtitle, font=sfont, fill=stroke_color)
    draw.text((sx, sy), subtitle, font=sfont, fill=(255, 255, 255))

    img.save(str(out), "PNG", optimize=True)
    return out

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("station")
    p.add_argument("author")
    p.add_argument("season", choices=["spring","summer","fall","winter"])
    p.add_argument("weather", choices=["sunny","cloudy","rainy","snowy","frost","heat"])
    p.add_argument("--output")
    p.add_argument("--art-layer", help="Path to art layer PNG (700x200)")
    p.add_argument("--solar-term", help="Solar term name, e.g. 'Rain Water'. Overrides season-only title.")
    p.add_argument("--title",  help="Override the title text (bypasses SOLAR_TITLES/TITLES lookup)")
    p.add_argument("--batch", action="store_true", help="Generate all 24 combos for this station/author")
    args = p.parse_args()

    solar_term = args.solar_term or None

    title_override = args.title or None

    if args.batch:
        for s in ["spring","summer","fall","winter"]:
            for w in ["sunny","cloudy","rainy","snowy","frost","heat"]:
                path = generate(args.station, args.author, s, w, art_layer=args.art_layer,
                                solar_term=solar_term, title_override=title_override)
                print(f"{s:8} {w:8} → {path}")
    else:
        out = generate(args.station, args.author, args.season, args.weather,
                       Path(args.output) if args.output else None,
                       art_layer=args.art_layer, solar_term=solar_term,
                       title_override=title_override)
        print(out)
