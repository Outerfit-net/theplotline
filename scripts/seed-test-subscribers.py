#!/usr/bin/env python3
"""Seed 11 test subscribers across diverse US zones with all novelists.

Each subscriber gets:
- outerfit.net+test5@gmail.com through outerfit.net+test15@gmail.com
- Distinct city/state/zip → distinct NWS station + climate zone
- Different author_key (covering all 12 novelists)
- is_test = true, active = 1, confirmed_at = NOW(), subscription_status = 'active'
- Matching combinations row

Run: python3 /opt/plotlines/scripts/seed-test-subscribers.py
"""

import os, sys, uuid, json
import psycopg2
import psycopg2.extras
import urllib.request

DB_URL = os.environ.get("DATABASE_URL", "postgresql://plotlines:plines2026@localhost:5432/plotlines")
ENC_KEY = os.environ.get("DB_ENCRYPTION_KEY", "tZF6qDVgW5JXCR2koeTy2SbepwAP+h8xKwnfRDYbNq8=")

# 11 subscribers — diverse geography, all different NWS stations
# Covering zones we DON'T already have (existing: high_plains, alaska_south_coastal, florida_keys_tropical)
TEST_SUBS = [
    # test5: Pacific Northwest — Portland, OR
    {
        "email": "outerfit.net+test5@gmail.com",
        "city": "Portland", "state": "OR", "zip": "97201",
        "lat": 45.5152, "lon": -122.6784,
        "author": "carver",  # Raymond Carver — PNW native, perfect fit
        "zone": "pacific_maritime",
    },
    # test6: Desert Southwest — Tucson, AZ
    {
        "email": "outerfit.net+test6@gmail.com",
        "city": "Tucson", "state": "AZ", "zip": "85701",
        "lat": 32.2226, "lon": -110.9747,
        "author": "mccarthy",  # Cormac McCarthy — Blood Meridian borderlands
        "zone": "desert_southwest",
    },
    # test7: Deep South — Savannah, GA
    {
        "email": "outerfit.net+test7@gmail.com",
        "city": "Savannah", "state": "GA", "zip": "31401",
        "lat": 32.0809, "lon": -81.0912,
        "author": "oconnor",  # Flannery O'Connor — Georgia gothic
        "zone": "humid_subtropical",
    },
    # test8: Great Lakes — Chicago, IL
    {
        "email": "outerfit.net+test8@gmail.com",
        "city": "Chicago", "state": "IL", "zip": "60601",
        "lat": 41.8781, "lon": -87.6298,
        "author": "saunders",  # George Saunders — Chicago area
        "zone": "great_lakes",
    },
    # test9: New England — Portland, ME
    {
        "email": "outerfit.net+test9@gmail.com",
        "city": "Portland", "state": "ME", "zip": "04101",
        "lat": 43.6591, "lon": -70.2568,
        "author": "strout",  # Elizabeth Strout — Maine is her territory
        "zone": "northeast",
    },
    # test10: California — San Francisco, CA
    {
        "email": "outerfit.net+test10@gmail.com",
        "city": "San Francisco", "state": "CA", "zip": "94102",
        "lat": 37.7749, "lon": -122.4194,
        "author": "lopez",  # Barry Lopez — West Coast naturalist
        "zone": "california_med",
    },
    # test11: Southern Plains — Austin, TX
    {
        "email": "outerfit.net+test11@gmail.com",
        "city": "Austin", "state": "TX", "zip": "78701",
        "lat": 30.2672, "lon": -97.7431,
        "author": "morrison",  # Toni Morrison — mythic voice
        "zone": "southern_plains",
    },
    # test12: Appalachian — Asheville, NC
    {
        "email": "outerfit.net+test12@gmail.com",
        "city": "Asheville", "state": "NC", "zip": "28801",
        "lat": 35.5951, "lon": -82.5515,
        "author": "hurston",  # Zora Neale Hurston — Southern roots
        "zone": "appalachian",
    },
    # test13: Upper Midwest — Minneapolis, MN
    {
        "email": "outerfit.net+test13@gmail.com",
        "city": "Minneapolis", "state": "MN", "zip": "55401",
        "lat": 44.9778, "lon": -93.2650,
        "author": "oates",  # Joyce Carol Oates — dark psychological
        "zone": "upper_midwest_continental",
    },
    # test14: Hawaii — Honolulu, HI
    {
        "email": "outerfit.net+test14@gmail.com",
        "city": "Honolulu", "state": "HI", "zip": "96813",
        "lat": 21.3069, "lon": -157.8583,
        "author": "bass",  # Rick Bass — wilderness everywhere
        "zone": "hawaii",
    },
    # test15: Great Plains — Omaha, NE
    {
        "email": "outerfit.net+test15@gmail.com",
        "city": "Omaha", "state": "NE", "zip": "68102",
        "lat": 41.2565, "lon": -95.9345,
        "author": "hemingway",  # Hemingway — spare plains voice
        "zone": "great_plains",
    },
]


def get_nws_station(lat, lon):
    """Fetch NWS grid ID (station code) from lat/lon."""
    url = f"https://api.weather.gov/points/{lat:.4f},{lon:.4f}"
    req = urllib.request.Request(url, headers={"User-Agent": "PlotLines/1.0 (plotlines@theplotline.net)"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            grid_id = data["properties"]["gridId"]
            tz = data["properties"]["timeZone"]
            return grid_id, tz
    except Exception as e:
        print(f"  ⚠️  NWS lookup failed for {lat},{lon}: {e}")
        return None, None


def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check existing test subscribers
            cur.execute("SELECT pgp_sym_decrypt(email, %s)::text AS email FROM subscribers WHERE is_test = true", (ENC_KEY,))
            existing = {r["email"] for r in cur.fetchall()}
            print(f"Existing test subscribers: {len(existing)}")

            created = 0
            skipped = 0

            for sub in TEST_SUBS:
                if sub["email"] in existing:
                    print(f"  ⏭️  {sub['email']} already exists — skipping")
                    skipped += 1
                    continue

                # Get NWS station
                print(f"  📍 {sub['email']} → {sub['city']}, {sub['state']} ({sub['zip']})...", end=" ", flush=True)
                station_code, tz = get_nws_station(sub["lat"], sub["lon"])
                if not station_code:
                    print("FAILED — no station, skipping")
                    continue
                print(f"station={station_code}, tz={tz}")

                sub_id = str(uuid.uuid4())
                confirm_token = str(uuid.uuid4())
                unsub_token = str(uuid.uuid4())
                location_key = station_code  # US subs use station as location key

                # Determine hemisphere
                hemisphere = "S" if sub["lat"] < 0 else "N"

                # ── Insert subscriber ──
                cur.execute("""
                    INSERT INTO subscribers (
                        id, email, email_enc, email_hash,
                        location_city, location_state, location_country,
                        zipcode,
                        lat, lon, lat_enc, lon_enc,
                        hemisphere, author_key, climate_zone_id, station_code,
                        confirm_token, unsubscribe_token,
                        active, confirmed_at, subscription_status, is_test, timezone
                    ) VALUES (
                        %s,
                        pgp_sym_encrypt(%s, %s),
                        pgp_sym_encrypt(%s, %s),
                        md5(%s),
                        pgp_sym_encrypt(%s, %s),
                        pgp_sym_encrypt(%s, %s),
                        %s,
                        pgp_sym_encrypt(%s, %s),
                        %s, %s,
                        pgp_sym_encrypt(%s, %s),
                        pgp_sym_encrypt(%s, %s),
                        %s, %s, %s, %s,
                        %s, %s,
                        1, NOW(), 'active', true, %s
                    )
                """, (
                    sub_id,
                    sub["email"], ENC_KEY,
                    sub["email"], ENC_KEY,
                    sub["email"],
                    sub["city"], ENC_KEY,
                    sub["state"], ENC_KEY,
                    "US",
                    sub["zip"], ENC_KEY,
                    sub["lat"], sub["lon"],
                    str(sub["lat"]), ENC_KEY,
                    str(sub["lon"]), ENC_KEY,
                    hemisphere, sub["author"], sub["zone"], station_code,
                    confirm_token, unsub_token,
                    tz or "America/Denver",
                ))

                # ── Insert combination (if not exists) ──
                combo_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO combinations (
                        id, location_key, author_key, climate_zone_id,
                        location_city, location_state, location_country,
                        lat, lon, hemisphere, station_code, timezone,
                        weather_source
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (location_key, author_key) DO NOTHING
                """, (
                    combo_id, location_key, sub["author"], sub["zone"],
                    sub["city"], sub["state"], "US",
                    sub["lat"], sub["lon"], hemisphere, station_code, tz or "America/Denver",
                    "nws",
                ))

                created += 1

            conn.commit()
            print(f"\n✅ Done — {created} created, {skipped} skipped")

            # Show final state
            cur.execute("""
                SELECT
                    pgp_sym_decrypt(s.email, %s)::text AS email,
                    s.station_code,
                    s.climate_zone_id,
                    s.author_key,
                    s.is_test
                FROM subscribers s
                WHERE s.active = 1 AND s.confirmed_at IS NOT NULL
                ORDER BY s.is_test, s.created_at
            """, (ENC_KEY,))
            rows = cur.fetchall()
            print(f"\n📊 All active subscribers ({len(rows)}):")
            print(f"{'Email':<40} {'Station':<8} {'Zone':<28} {'Author':<12} {'Test'}")
            print("-" * 100)
            for r in rows:
                print(f"{r['email']:<40} {r['station_code'] or '?':<8} {r['climate_zone_id'] or '?':<28} {r['author_key']:<12} {'✓' if r['is_test'] else ''}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
