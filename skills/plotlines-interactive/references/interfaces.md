# Module Interface Contracts

Each module has a defined input/output contract. If a module cannot be called with these inputs and return these outputs, the pipeline is broken. Use these contracts to verify each stage during interactive testing.

## resolve_email
```
IN:  email (str), date (YYYY-MM-DD)
OUT: {
  email, date,
  station_code, author_key,
  climate_zone_id, hemisphere,
  lat, lon, zipcode,
  season_bucket,             # offset-adjusted sekki name e.g. "Awakening of Insects"
  season_bucket_description, # full sekki description text
  weather_condition          # from cache if available, else null
}
```
Script: `resolve_email.py`
✅ Implemented

---

## weather
```
IN:  station_code, lat, lon, zipcode, date
OUT: {
  condition,      # sunny|cloudy|rainy|snowy|frost|heat|windy
  temp_f,         # current temperature (not null)
  wind_mph,       # current wind speed (not null)
  description,    # current conditions text (not null)
  forecast[10],   # 10-period NWS forecast
  afd_summary,    # Area Forecast Discussion summarized for gardeners (not null)
  weather_report  # human-readable string
}
```
Script: `garden-weather.py`
⚠️ W2 — temp_f/wind_mph/description null, afd_summary null, only 7 forecast periods

---

## solar_term
```
IN:  climate_zone_id, hemisphere, date
OUT: {
  name,            # sekki name e.g. "Awakening of Insects"
  description,     # full garden-focused description
  season_bucket,   # coarse bucket: spring|summer|fall|winter|wet_season|dry_season
  zone_offset      # days offset applied for this zone
}
```
Script: `garden_seasons.py` → `get_current_solar_term()`
✅ Implemented

---

## dialogue
```
IN:  station_code, author_key, weather{condition, forecast, afd_summary},
     solar_term{name, description}, date
OUT: {
  prose,      # refined multi-paragraph prose in author voice
  topic,      # garden conversation topic
  quote,      # attribution quote
  characters, # list of character names used
  turns       # number of dialogue turns (must be > 1)
}
```
Script: `garden-dialogue.py`
✅ Implemented — verify turns > 1 and prose is not placeholder

---

## art
```
IN:  climate_zone_id, condition, solar_term{name, description}, topic, date
OUT: {
  image_path  # local path to generated PNG
}
```
Script: `generate_art.py`
⚠️ A1 — prompt uses coarse season bucket not sekki; term_cue = first sentence only (causes literal imagery)

---

## title_dict
```
IN:  season_bucket (sekki name), climate_zone_id, condition
OUT: {
  title,   # publication-style title e.g. "The Waiting Ground Sentinel"
  source   # "title_dict" (cache hit) or "generated" (new)
}
```
Script: `title_dict.py`
✅ Implemented — verify source and grain (sekki × zone × condition)

---

## masthead
```
IN:  art_path, title, season_bucket, climate_zone_id, condition, author_key
OUT: {
  url,        # https://theplotline.net/mastheads/HASH.png
  local_path  # /opt/plotlines/data/mastheads/HASH.png
}
```
Script: `generate_masthead.py`
⚠️ Masthead hash must include title — stale mastheads with wrong titles must not be reused

---

## assemble
```
IN:  station_code, author_key, run_date, dialogue{prose, topic, quote},
     masthead_url, title
OUT: {
  template_id,  # "YYYY-MM-DD:STATION:AUTHOR"
  html          # rendered email HTML
}
```
Script: `garden-assembler.py`
✅ Implemented

---

## send
```
IN:  station_code, author_key, run_date, subscribers[{email, unsubscribe_token}],
     no_send (bool)
OUT: {
  sent,   # count of emails delivered (0 if no_send=True)
  failed  # count of delivery failures
}
```
Script: `garden-mailer.py`
⚠️ D1 — reports sent=N even in dry run / no_send mode (misleading)
