# Plot Lines Masthead Design

## Overview

Each Plot Lines newsletter needs a unique "masthead" — a branded header image that changes based on:
- Weather station (e.g., 80303 for Boulder)
- Author style (e.g., Hemingway, Carver, Morrison)
- Season (spring, summer, fall, winter)
- Weather (sunny, cloudy, rainy, snowy)

## Font Strategy

### Web Version
- Load fonts directly from `~/Documents/theplotline/fonts/`
- Use CSS `@font-face` to apply garden fonts
- Works in browsers that support web fonts (Chrome, Safari, Firefox)

### Email Version
- **Generate PNG images** with fonts baked in
- Fonts don't work in most email clients
- PNG renders consistently everywhere

## Hosting

### Option 1: Linked Image (Current)
```html
<img src="https://glyphmatic.us/mastheads/{hash}.png">
```
- Pros: Simple, standard
- Cons: Doesn't render if "show images" is blocked

### Option 2: Base64 Embedded
```html
<img src="data:image/png;base64,{base64data}">
```
- Pros: Renders even if images are blocked
- Cons: Larger email size, some clients block base64

**Decision:** Use linked images for now. Most email clients show them.

## Generator

Script: `server/services/generate_masthead.py`

```bash
python3 generate_masthead.py <station> <author> <season> <weather>
```

Example:
```bash
python3 generate_masthead.py 80303 hemingway spring sunny
```

Output:
- PNG file in `mastheads/`
- Unique hash based on station+author+season+weather
- Reuses same combo = same cached image (lazy generation)

## Masthead Names

Names change with seasons/weather:

**Spring:** The First Bloom, Sprout Notes, Emergence, Budding, The Green Wave

**Summer:** High Summer, The Heat Letter, Midseason, Sunlit Rows, The Long Day

**Fall:** The Frost Line, Notes from the Mud, Harvest Letter, The Last Bloom, Falling

**Winter:** The Dormant, Winter Plot, Frost & Folly, The Cold Frame, Snow Days

## Lazy Generation

1. User signs up with station + author
2. First request generates masthead PNG
3. Stores in DB with lookup key
4. Future requests serve cached PNG
5. Host on glyphmatic.us CDN

## Fonts

159 garden fonts downloaded from FontSpace:
- Location: `~/Documents/theplotline/fonts/`
- Mix of .ttf and .otf files
- Various styles: floral, leafy, botanical, handwritten

## TODO

- [ ] Wire into signup flow
- [ ] Store masthead URLs in DB
- [ ] Set up CDN hosting (glyphmatic.us/mastheads/)
- [ ] Test in real email clients
