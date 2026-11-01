// CinemaRNG badge rules. Each rule is a deterministic predicate over known fields: missing data never matches.
// test(m, poolDate) and evidence(m, poolDate) read the prepared member from prep(); `deferred` rules stay inactive.

// Raw and normalized values are kept apart: m.title is raw, m.t is normalized.
export const RULESET = '2'; // 2: common band badges added so no record earns nothing

export const norm = (s) => s.normalize('NFKC').toLowerCase();
const tokens = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)); // whitespace-separated words; bare punctuation is not a word
const list = (a) => (Array.isArray(a) ? a : []);

// Original-language spotlight set, version 1: languages that are uncommon in an English-heavy catalog.
export const SPOTLIGHT = ['japanese', 'korean', 'hindi', 'persian', 'arabic', 'portuguese', 'turkish', 'mandarin chinese'];

const has = (m, g) => m.g.includes(g);
const animated = (g) => g === 'animation' || g.includes('animated film') || g.includes('anime');
const mins = (m) => `${m.title} (${m.year}) runs ${m.runtime} minutes`;
const where = (m) => `${m.title} lists ${m.countries.length} production countr${m.countries.length === 1 ? 'y' : 'ies'}: ${m.countries.join(', ')}`;
const words = (m) => `"${m.title}" has ${tokens(m.title).length} word${tokens(m.title).length === 1 ? '' : 's'}`;

export function prep(raw) {
  const num = (x) => (Number.isFinite(x) && x > 0 ? x : null); // zero or absent is unknown, never a real value
  return {
    ...raw,
    t: typeof raw.title === 'string' && raw.title.trim() ? norm(raw.title.trim()) : null,
    o: typeof raw.originalTitle === 'string' && raw.originalTitle.trim() ? norm(raw.originalTitle.trim()) : null,
    year: num(raw.year), runtime: num(raw.runtime),
    // raw lists stay as published for display; g and l are the normalized copies the rules compare
    genres: list(raw.genres), countries: list(raw.countries), languages: list(raw.languages), awards: list(raw.awards),
    g: list(raw.genres).map(norm), l: list(raw.languages).map(norm),
  };
}

export const RULES = [
  { id: 'early-cinema', name: 'Early Cinema', family: 'Release era', rule: 'First released before 1930',
    test: (m) => m.year !== null && m.year < 1930, evidence: (m) => `${m.title} was first released in ${m.year}` },
  { id: 'before-the-millennium', name: 'Before the Millennium', family: 'Release era', rule: 'First released before 2000',
    test: (m) => m.year !== null && m.year < 2000, evidence: (m) => `${m.title} was first released in ${m.year}` },
  { id: 'forty-to-sixty', name: 'Forty to Sixty', family: 'Runtime', rule: 'Runtime from 40 through 60 minutes',
    test: (m) => m.runtime !== null && m.runtime >= 40 && m.runtime <= 60, evidence: mins },
  { id: 'long-feature', name: 'Long Feature', family: 'Runtime', rule: 'Runtime of 150 minutes or more',
    test: (m) => m.runtime !== null && m.runtime >= 150, evidence: mins },
  { id: 'marathon', name: 'Marathon', family: 'Runtime', rule: 'Runtime of 210 minutes or more',
    test: (m) => m.runtime !== null && m.runtime >= 210, evidence: mins },
  { id: 'animation', name: 'Animation', family: 'Genre', rule: 'Wikidata lists an animated-film genre or type (including computer-animated, stop-motion and anime)',
    test: (m) => m.g.some(animated), evidence: (m) => `${m.title} is listed as: ${m.genres.filter((g) => animated(norm(g))).join(', ')}` },
  { id: 'genre-mix', name: 'Genre Mix', family: 'Genre count', rule: 'Exactly three listed genres',
    test: (m) => new Set(m.g).size === 3, evidence: (m) => `${m.title} lists three genres: ${m.genres.join(', ')}` },
  { id: 'many-genres', name: 'Many Genres', family: 'Genre count', rule: 'Four or more listed genres',
    test: (m) => new Set(m.g).size >= 4, evidence: (m) => `${m.title} lists ${new Set(m.g).size} genres: ${m.genres.join(', ')}` },
  { id: 'one-word-title', name: 'One Word Title', family: 'Title shape', rule: 'Title is a single word',
    test: (m) => m.t !== null && tokens(m.t).length === 1, evidence: words },
  { id: 'long-title', name: 'Long Title', family: 'Title shape', rule: 'Title has eight or more words',
    test: (m) => m.t !== null && tokens(m.t).length >= 8, evidence: words },
  { id: 'numbered-title', name: 'Numbered Title', family: 'Title numerals', rule: 'Title contains a digit 0-9',
    test: (m) => m.t !== null && /[0-9]/.test(m.t), evidence: (m) => `"${m.title}" contains a digit` },
  { id: 'different-original', name: 'Different Original', family: 'Title localization', rule: 'Original title differs from the English title',
    test: (m) => m.t !== null && m.o !== null && m.t !== m.o, evidence: (m) => `Original title "${m.originalTitle}" differs from "${m.title}"` },
  { id: 'coproduction', name: 'Coproduction', family: 'Production countries', rule: 'Two or more production countries',
    test: (m) => m.countries.length >= 2, evidence: where },
  { id: 'wide-collaboration', name: 'Wide Collaboration', family: 'Production countries', rule: 'Four or more production countries',
    test: (m) => m.countries.length >= 4, evidence: where },
  { id: 'language-spotlight', name: 'Language Spotlight', family: 'Language', rule: `Original language is in the spotlight set: ${SPOTLIGHT.join(', ')}`,
    test: (m) => m.l.some((l) => SPOTLIGHT.includes(l)), evidence: (m) => `${m.title} lists original language ${m.languages.join(', ')}` },
  { id: 'silent-evidence', name: 'Silent Evidence', family: 'Editorial', rule: 'Wikidata lists the genre "silent film" (a database classification, not a guess from the year)',
    test: (m) => has(m, 'silent film'), evidence: (m) => `Wikidata lists ${m.title} as a silent film` },
  { id: 'award-shelf', name: 'Award Shelf', family: 'Awards', rule: 'Wikidata records an Academy Award win for the film',
    test: (m) => m.awards.length > 0, evidence: (m) => `Wikidata records: ${m.awards.join('; ')}` },
  { id: 'first-feature', name: 'First Feature', family: 'Editorial', rule: 'A reviewed filmography proves it is the director\'s first feature',
    deferred: 'No reviewed filmography evidence exists yet, and a pool this size cannot prove a debut by itself. The plan says to keep it inactive.' },
  { id: 'new-millennium', name: 'New Millennium', family: 'Release era', rule: 'First released in 2000 or later',
    test: (m) => m.year !== null && m.year >= 2000, evidence: (m) => `${m.title} was first released in ${m.year}` },
  { id: 'feature-length', name: 'Feature Length', family: 'Runtime', rule: 'Runtime from 61 through 149 minutes',
    test: (m) => m.runtime !== null && m.runtime >= 61 && m.runtime <= 149, evidence: mins },
];
