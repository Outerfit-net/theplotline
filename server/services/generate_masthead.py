#!/usr/bin/env python3
"""
Plot Lines Masthead Generator
Generates a 600x100px PNG masthead for a given (station, author, season, weather) combo.
Lazy: checks cache first, generates only if missing.

Usage:
    python3 generate_masthead.py <station> <author> <season> <weather> [--output /path/out.png]
    python3 generate_masthead.py BOU hemingway fall frost
    python3 generate_masthead.py BOU hemingway fall frost --batch
"""

import sys, os, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DATA_DIR      = Path(os.environ.get("DATA_DIR", "/opt/plotlines/data"))
MASTHEAD_DIR  = DATA_DIR / "mastheads"
FONT_DIR = Path(os.environ.get("FONT_DIR", "/opt/plotlines/fonts/commercial"))
FALLBACK_FONTS = Path("/usr/share/fonts/truetype/dejavu")

WIDTH, HEIGHT = 600, 100

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

def cache_key(station, author, season, weather):
    # station intentionally excluded — masthead is author+season+weather only
    return hashlib.md5(f"{author}:{season}:{weather}".encode()).hexdigest()

def generate(station, author, season, weather, output_path=None):
    MASTHEAD_DIR.mkdir(parents=True, exist_ok=True)
    season, weather, author = season.lower(), weather.lower(), author.lower()

    key  = cache_key(station, author, season, weather)
    out  = output_path or (MASTHEAD_DIR / f"{key}.png")
    if out.exists() and not output_path:
        return out  # cache hit

    pal      = PALETTES.get(season, PALETTES["spring"]).get(weather, {"bg":(240,245,220),"text":(50,80,40),"accent":(120,160,80)})
    title    = TITLES.get((season, weather), "Plot Lines")
    subtitle = f"theplotline.net  ·  {season.capitalize()}"

    img  = Image.new("RGB", (WIDTH, HEIGHT), pal["bg"])
    draw = ImageDraw.Draw(img)

    # Borders
    draw.rectangle([0,0,WIDTH-1,HEIGHT-1], outline=pal["accent"], width=2)
    draw.rectangle([4,4,WIDTH-5,HEIGHT-5], outline=pal["accent"], width=1)

    # Corner marks
    for cx, cy in [(10,10),(WIDTH-10,10),(10,HEIGHT-10),(WIDTH-10,HEIGHT-10)]:
        draw.line([(cx-4,cy),(cx+4,cy)], fill=pal["accent"], width=1)
        draw.line([(cx,cy-4),(cx,cy+4)], fill=pal["accent"], width=1)

    # Rules
    draw.line([(14,22),(WIDTH-14,22)], fill=pal["accent"], width=1)
    draw.line([(14,HEIGHT-23),(WIDTH-14,HEIGHT-23)], fill=pal["accent"], width=1)

    # Title
    tfont = load_font(author, 36)
    sfont = load_font(author, 11)

    bbox = draw.textbbox((0,0), title, font=tfont)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    tx = (WIDTH - tw) // 2
    ty = (HEIGHT - th) // 2 - 8
    draw.text((tx, ty), title, font=tfont, fill=pal["text"])

    # Subtitle
    sbbox = draw.textbbox((0,0), subtitle, font=sfont)
    sx = (WIDTH - (sbbox[2]-sbbox[0])) // 2
    draw.text((sx, ty+th+5), subtitle, font=sfont, fill=pal["accent"])

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
    p.add_argument("--batch", action="store_true", help="Generate all 24 combos for this station/author")
    args = p.parse_args()

    if args.batch:
        for s in ["spring","summer","fall","winter"]:
            for w in ["sunny","cloudy","rainy","snowy","frost","heat"]:
                path = generate(args.station, args.author, s, w)
                print(f"{s:8} {w:8} → {path}")
    else:
        out = generate(args.station, args.author, args.season, args.weather,
                       Path(args.output) if args.output else None)
        print(out)
