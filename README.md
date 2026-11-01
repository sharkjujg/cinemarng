# CinemaRNG

A daily film discovery game: roll once per UTC day, draw one film from a pool, and see which badges make it unusual. Built from `CinemaRNG_Building_Plan` (chapters 3-7, 10, 12).

**This is a prototype.** Film facts are a snapshot of [Wikidata](https://www.wikidata.org) (CC0). There is no backend, so results live in the player's browser. Posters, ratings and streaming links are not used: the plan makes image rights and commercial data terms separate approvals, and TMDB (the plan's source candidate) needs an API key and has poster and commercial conditions. Unofficial fan project, not affiliated with any studio, Wikimedia, TMDB or IMDb.

## What is built

| Plan area | Status |
| --- | --- |
| Daily roll, unbiased secure draw, one per UTC day, retry-safe | Done, browser-local (the day comes from the host's `Date` header, not the device clock) |
| 18 badge rules, families, RP = 100 / p, overall rarity tiers, tie rules | 17 active and tested in `rules.js`; **First Feature** is listed but inactive (needs reviewed filmography evidence) |
| Animated reveal (name reel, count-up, rarity pulse and burst), skippable, reduced-motion aware; facts panel, share text, permanent result page | Done (placeholder card, no poster) |
| Hundreds of achievements derived from your rolls, with goals scaled to the pool size (shelves by decade, year, country, language, genre, runtime) | Done (`achievements.js`) |
| Badge catalog, badge pages, levels, history, export, delete | Done |
| Pool page (size, selection rule, composition, checksum, possible rarity bands) | Done |
| Sign-in, ranked limit, leaderboards, friends, hearts, poems, shelves, Discord, moderation | Needs a server (plan phases 2 and 3) |

## Run it

No build step.

```
python -m http.server 8765
```

Open <http://localhost:8765>. Open `/check.html` for the self-check; its title becomes `PASS` or `FAIL n`.

## Layout

- `engine.js` and `achievements.js` generic scoring, tiers, sampling, day helpers and achievements (shared with sibling RNG games)
- `rules.js` this game's badge rules; `site.js` its names, copy, card art and shelves; `fixtures.js` rule fixtures for `check.html`
- `app.js`, `index.html`, `style.css` the site (hash routes, so it works on any static host)
- `data/pool-v1.json` the published pool; `tools/build_pool.py` rebuilds it from Wikidata (a rerun gives a newer snapshot). Wikidata types many films only by a subtype (Toy Story is just "animated film"), so the build lists those subtypes explicitly; a plain "instance of film" query silently drops them

## Publishing

GitHub Pages serves the repository root from `main`. Push to `main` to update the site.
