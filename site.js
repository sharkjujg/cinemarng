// Everything specific to CinemaRNG: names, copy, card art, and which facts the result card shows. app.js is generic.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => n.toLocaleString('en');
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export default {
  key: 'cinemarng',
  name: 'CinemaRNG',
  pageTitle: 'CinemaRNG: a daily film discovery game',
  noun: 'film', nouns: 'films', thing: 'Film',
  worldNote: 'all of world cinema',
  repo: 'https://github.com/sharkjujg/cinemarng',
  headline: 'Discover a film. Once a day.',
  intro: (n) => `Roll once to draw one film from a pool of <b>${fmt(n)}</b>. Every film has the same 1-in-${fmt(n)} chance, famous or obscure. Badges explain what is unusual about it, and rarer badges earn more rarity points (RP). The daily limit resets at 00:00 UTC.`,
  notice: 'Prototype: the film facts are real (from Wikidata), but there are no posters or accounts yet, and your results are saved only in this browser. <a href="#/about">What that means</a>',
  header: (m) => ({ title: m.title, sub: m.originalTitle !== m.title ? `${m.originalTitle} · ${m.year}` : String(m.year) }),
  label: (m) => `${m.title} (${m.year})`,
  // shelves drive the shelf achievements: every [group, label] a film belongs to
  shelves: (m) => [
    ['Decade', `${Math.floor(m.year / 10) * 10}s`], ['Release year', String(m.year)],
    ...m.countries.map((c) => ['Country', c]), ...m.languages.map((l) => ['Language', l]), ...m.genres.map((g) => ['Genre', g]),
    ['Runtime', m.runtime < 90 ? 'Under 90 minutes' : m.runtime < 120 ? '90 to 119 minutes' : m.runtime < 150 ? '120 to 149 minutes' : '150 minutes or more'],
    ...(m.awards.length ? [['Awards', 'Academy Award winner']] : []),
  ],
  facts: (m) => [
    ['First released', String(m.year)], ['Runtime', `${m.runtime} minutes`], ['Genres', m.genres.join(', ')],
    ['Production countries', m.countries.join(', ')], ['Original language', m.languages.join(', ')],
    ['Source', `Wikidata ${m.id}`, `https://www.wikidata.org/wiki/${m.id}`],
  ],
  art(m) { // original placeholder card: no poster is shown, and it never affects scoring
    const hue = hash(m.id) % 360;
    const holes = Array.from({ length: 7 }, (_, i) => `<rect x="2.5" y="${14 + i * 18}" width="3.5" height="7" rx="1"/><rect x="94" y="${14 + i * 18}" width="3.5" height="7" rx="1"/>`).join('');
    return `<svg class="avatar" viewBox="0 0 100 150" role="img" aria-label="Placeholder card for the film. No poster is shown.">
      <rect width="100" height="150" rx="6" fill="hsl(${hue} 40% 20%)"/><g fill="hsl(${hue} 30% 8%)">${holes}</g>
      <rect x="12" y="12" width="76" height="126" fill="none" stroke="hsl(${hue} 55% 70%)" stroke-width="1.5"/>
      <text x="50" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="24" fill="hsl(${hue} 70% 82%)">${m.year}</text>
      <text x="50" y="102" text-anchor="middle" font-family="system-ui,sans-serif" font-size="7" letter-spacing="1" fill="hsl(${hue} 40% 70%)">NO POSTER</text></svg>`;
  },
  poolNotice: 'Film facts are a snapshot of <a href="https://www.wikidata.org">Wikidata</a>, whose data is released under CC0. No posters or images are shown: image rights are a separate approval in the plan. The pool is heavily English-language and favors films that many Wikipedia editions cover (see the tables below), so its odds describe this pool, not all of world cinema.',
  poolExtra(pool) {
    const tally = (get) => { const c = new Map(); for (const m of pool.members) for (const v of get(m)) c.set(v, (c.get(v) || 0) + 1); return [...c]; };
    const table = (title, rows) => `<table><thead><tr><th>${title}</th><th class="n">Films</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('')}</tbody></table>`;
    const top = (rows, k) => rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k);
    const decades = tally((m) => [`${Math.floor(m.year / 10) * 10}s`]).sort((a, b) => a[0].localeCompare(b[0]));
    return `<h2>What is in the pool</h2><p class="small muted">Disclosed because a badge is only rare relative to this mix.</p>
      ${table('Decade', decades)}${table('Top original languages', top(tally((m) => m.languages), 8))}${table('Top production countries', top(tally((m) => m.countries), 8))}`;
  },
  aboutData: `<h2>Where the facts come from</h2>
    <p>Title, original title, first release year, runtime, genres, production countries, original language and Academy Award wins come from <a href="https://www.wikidata.org">Wikidata</a>, whose data is released under CC0. The pool is every feature film with complete facts that is linked from at least a set number of Wikimedia pages (shown on the Pool page); television films, shorts, documentaries and adult titles are left out. These facts are community-maintained, so a badge is only as accurate as its record. Films that Wikidata documents fully skew English-language and recent, so a "rare" badge here is rare in this pool, not in world cinema. There are no posters, trailers, ratings or streaming links: the plan treats images, ratings and availability as separate approvals. "First Feature" is listed but inactive until reviewed filmography evidence exists.</p>`,
  terms: 'It is not affiliated with Wikimedia, TMDB, IMDb or any studio, and film titles belong to their owners. Badges describe catalog facts, not quality: a high score never means a film is better.',
};
