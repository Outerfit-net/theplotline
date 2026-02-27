#!/usr/bin/env python3
"""
Masthead Generator for Plot Lines
Generates PNG masthead images using garden fonts
"""

import os
import random
import hashlib
from PIL import Image, ImageDraw, ImageFont

# Paths
FONTS_DIR = os.path.expanduser("~/Documents/theplotline/fonts")
OUTPUT_DIR = os.path.expanduser("~/Documents/theplotline/mastheads")
MASTHEAD_NAMES = {
    "spring": ["The First Bloom", "Sprout Notes", "Emergence", "Budding", "The Green Wave"],
    "summer": ["High Summer", "The Heat Letter", "Midseason", "Sunlit Rows", "The Long Day"],
    "fall": ["The Frost Line", "Notes from the Mud", "Harvest Letter", "The Last Bloom", "Falling"],
    "winter": ["The Dormant", "Winter Plot", "Frost & Folly", "The Cold Frame", "Snow Days"],
    # Weather-based
    "sunny": ["Sun Days", "Bright Plot", "The Sunny Side"],
    "rainy": ["Rain Notes", "The Wet Garden", "Droplets"],
    "cloudy": ["Overcast", "The Grey Row", "Muted"],
    "snowy": ["Snow Plot", "The White Garden", "Frost Line"],
}

def get_random_font():
    """Pick a random garden font"""
    font_files = []
    for root, dirs, files in os.walk(FONTS_DIR):
        for f in files:
            if f.endswith(('.ttf', '.otf')):
                font_files.append(os.path.join(root, f))
    return random.choice(font_files) if font_files else None

def get_masthead_name(season="spring", weather="sunny"):
    """Generate a masthead name based on season/weather"""
    names = MASTHEAD_NAMES.get(season, MASTHEAD_NAMES["spring"])
    if weather in MASTHEAD_NAMES:
        names = names + MASTHEAD_NAMES[weather]
    return random.choice(names)

def generate_masthead(station_code, author_key, season="spring", weather="sunny", width=800, height=200):
    """Generate a masthead PNG"""
    
    # Get font and name
    font_path = get_random_font()
    masthead_name = get_masthead_name(season, weather)
    
    if not font_path:
        raise Exception("No fonts found")
    
    # Create image with gradient background (garden-y colors)
    img = Image.new('RGB', (width, height), color=(245, 250, 240))
    draw = ImageDraw.Draw(img)
    
    # Add subtle border
    draw.rectangle([0, 0, width-1, height-1], outline=(45, 90, 45), width=3)
    
    # Try to load the font (fallback to default if needed)
    try:
        font = ImageFont.truetype(font_path, 72)
        author_font = ImageFont.truetype(font_path, 36)
    except:
        font = ImageFont.load_default()
        author_font = ImageFont.load_default()
    
    # Draw masthead name
    bbox = draw.textbbox((0, 0), masthead_name, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2 - 20
    
    draw.text((x, y), masthead_name, fill=(45, 75, 45), font=font)
    
    # Draw station and author
    subtitle = f"{station_code.upper()} • {author_key}"
    bbox2 = draw.textbbox((0, 0), subtitle, font=author_font)
    sub_width = bbox2[2] - bbox2[0]
    sub_x = (width - sub_width) // 2
    draw.text((sub_x, y + text_height + 10), subtitle, fill=(90, 120, 90), font=author_font)
    
    # Generate unique filename
    key = f"{station_code}-{author_key}-{season}-{weather}"
    hash_key = hashlib.md5(key.encode()).hexdigest()[:8]
    filename = f"masthead_{hash_key}.png"
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    # Save
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    img.save(output_path, "PNG")
    
    return {
        "filename": filename,
        "masthead_name": masthead_name,
        "font_used": os.path.basename(font_path),
        "path": output_path,
        "url": f"https://glyphmatic.us/mastheads/{filename}"
    }

if __name__ == "__main__":
    import sys
    station = sys.argv[1] if len(sys.argv) > 1 else "80303"
    author = sys.argv[2] if len(sys.argv) > 2 else "hemingway"
    season = sys.argv[3] if len(sys.argv) > 3 else "spring"
    weather = sys.argv[4] if len(sys.argv) > 4 else "sunny"
    
    result = generate_masthead(station, author, season, weather)
    print(f"Generated: {result['url']}")
    print(f"Masthead name: {result['masthead_name']}")
    print(f"Font: {result['font_used']}")
