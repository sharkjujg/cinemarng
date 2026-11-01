#!/usr/bin/env python3
"""Build data/pool-v1.json from Wikidata (CC0): a snapshot of well-documented feature films.

Eligible: instance of film, not a TV film, short or documentary, runtime >= 40 minutes, one documented runtime,
one documented original title, and release date, country, language and genre all present. The pool is every such
film linked from at least T Wikimedia pages, with T the largest threshold that still leaves >= TARGET films.
Wikidata keeps changing, so a rerun gives a newer snapshot, not the same bytes.

Usage: python tools/build_pool.py   (network; a few minutes; waits between requests)
"""
import collections
import datetime as dt
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

UA = "CinemaRNG-fan-prototype/0.1 (https://github.com/sharkjujg/cinemarng)"
ENDPOINT = "https://query.wikidata.org/sparql"
FLOOR, TARGET, MIN_SECONDS = 30, 3000, 2400
ADULT = {"pornographic film", "erotic film", "softcore pornography", "hardcore pornography"}

# Wikidata types many films only by a specific kind (Toy Story is just "animated film"), so a bare "instance of film"
# query would silently drop whole categories. These are film, feature film and the kinds that are always films.
FILM_TYPES = " ".join("wd:" + q for q in (
    "Q11424 Q24869 Q202866 Q20650540 Q226730 Q336144 Q430525 Q455315 Q17123180 Q33111614 Q111241092 Q104840802 Q1257444").split())

CORE = f"""
  VALUES ?type {{ {FILM_TYPES} }}
  ?f wdt:P31 ?type ; wikibase:sitelinks ?sl . FILTER(?sl >= {FLOOR})
  FILTER EXISTS {{ ?f wdt:P577 ?_a . ?f wdt:P1476 ?_b . ?f wdt:P495 ?_c . ?f wdt:P364 ?_d . ?f wdt:P136 ?_e }}
  FILTER EXISTS {{ ?f p:P2047/psn:P2047/wikibase:quantityAmount ?_s . FILTER(?_s >= {MIN_SECONDS}) }}
  FILTER NOT EXISTS {{ ?f wdt:P31 wd:Q506240 }}   # television film
  FILTER NOT EXISTS {{ ?f wdt:P31 wd:Q24862 }}    # short film
  FILTER NOT EXISTS {{ ?f wdt:P31 wd:Q93204 }}    # documentary film
"""


def sparql(q, tries=4):
    url = ENDPOINT + "?" + urllib.parse.urlencode({"query": q, "format": "json"})
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=170) as r:
                rows = json.load(r)["results"]["bindings"]
            time.sleep(1.5)
            return rows
        except Exception as e:  # network hiccup or Wikidata timeout: back off and retry
            print("  retry", i, e, file=sys.stderr)
            time.sleep(15 * (i + 1))
    raise SystemExit("Wikidata query failed")


def values(uris, body, size=400):
    """Collect {film URI: set of ?v values} for a graph pattern, asking about a few hundred films per request."""
    out = collections.defaultdict(set)
    for i in range(0, len(uris), size):
        vals = " ".join("wd:" + u.rsplit("/", 1)[1] for u in uris[i:i + size])
        for r in sparql(f"SELECT DISTINCT ?f ?v WHERE {{ VALUES ?f {{ {vals} }} {body} }}"):
            out[r["f"]["value"]].add(r["v"]["value"])
    return out


def label_of(prop, extra=""):
    return f'?f wdt:{prop} ?x . ?x rdfs:label ?v . FILTER(LANG(?v) = "en") {extra}'


print("film list…", flush=True)
sitelinks = {r["f"]["value"]: int(r["sl"]["value"]) for r in sparql(f"SELECT DISTINCT ?f ?sl WHERE {{ {CORE} }}")}
uris = list(sitelinks)
print(len(uris), "candidates; fetching facts in chunks…", flush=True)
titles = values(uris, '?f rdfs:label ?v . FILTER(LANG(?v) = "en")')
otitles = values(uris, "?f wdt:P1476 ?v")
dates = values(uris, "?f wdt:P577 ?v")
mins = {u: {round(float(s) / 60) for s in v} for u, v in values(uris, "?f p:P2047/psn:P2047/wikibase:quantityAmount ?v").items()}
genres, countries, langs = values(uris, label_of("P136")), values(uris, label_of("P495")), values(uris, label_of("P364"))
awards = values(uris, label_of("P166", 'FILTER(STRSTARTS(?v, "Academy Award for"))'))
for qid, name in (("Q202866", "animated film"), ("Q20650540", "anime film"), ("Q226730", "silent film")):  # often stored as the film's type rather than its genre
    for u in values(uris, f'?f wdt:P31 wd:{qid} . BIND("{name}" AS ?v)'):
        genres[u].add(name)
base = {u: {"titles": titles.get(u, set()), "otitles": otitles.get(u, set()), "mins": mins.get(u, set()), "dates": dates.get(u, set()), "sl": sitelinks[u]} for u in uris}

today = dt.datetime.now(dt.timezone.utc).date().isoformat()
films, dropped = [], collections.Counter()
for uri, b in base.items():
    qid = uri.rsplit("/", 1)[1]
    g = {x.lower() for x in genres.get(uri, ())}
    first = min(b["dates"], default="")
    year = int(first[:4]) if first[:1].isdigit() else None
    if len(b["titles"]) != 1 or len(b["otitles"]) != 1:
        dropped["ambiguous title"] += 1
    elif len(b["mins"]) != 1 or min(b["mins"]) < 40:
        dropped["missing, conflicting or short runtime"] += 1
    elif not g:
        dropped["no labelled genre"] += 1
    elif g & ADULT:
        dropped["adult"] += 1
    elif "documentary film" in g:
        dropped["documentary"] += 1
    elif year is None or first > today:
        dropped["unreleased or undated"] += 1
    elif not (countries.get(uri) and langs.get(uri)):
        dropped["missing country or language"] += 1
    else:
        films.append({"id": qid, "title": next(iter(b["titles"])), "originalTitle": next(iter(b["otitles"])), "year": year,
                      "runtime": next(iter(b["mins"])), "genres": sorted(g), "countries": sorted(countries[uri]),
                      "languages": sorted(langs[uri]), "awards": sorted(awards.get(uri, ())), "_sl": b["sl"]})
print("dropped:", dict(dropped), "kept:", len(films))

threshold = FLOOR
for t in range(FLOOR, 400):
    if sum(f["_sl"] >= t for f in films) >= TARGET:
        threshold = t
    else:
        break
films = sorted((f for f in films if f["_sl"] >= threshold), key=lambda f: int(f["id"][1:]))
for f in films:
    del f["_sl"]

meta = {"version": "v1", "publishedAt": today, "capturedAt": today,
        "source": "Wikidata, CC0 (https://www.wikidata.org)",
        "provenance": f"Snapshot of Wikidata taken {today} by tools/build_pool.py. Film facts only; no posters or images.",
        "selection": f"Feature films with complete facts that are linked from at least {threshold} Wikimedia pages (Wikipedia language editions and sister projects).",
        "sitelinkThreshold": threshold,
        "fieldStatus": {k: "known" for k in ("id", "title", "originalTitle", "year", "runtime", "genres", "countries", "languages")}
                       | {"awards": "known where Wikidata records an Academy Award win"}}
lines = ",\n".join("  " + json.dumps(f, ensure_ascii=False, separators=(",", ":")) for f in films)
out = '{"meta":' + json.dumps(meta, ensure_ascii=False) + ',\n"members":[\n' + lines + "\n]}\n"
path = pathlib.Path(__file__).resolve().parent.parent / "data" / "pool-v1.json"
path.parent.mkdir(exist_ok=True)
path.write_bytes(out.encode("utf-8"))
print(f"wrote {path}: {len(films)} films, sitelink threshold {threshold}")
