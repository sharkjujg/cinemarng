// CinemaRNG fixtures for check.html: one row per case, [rule id, field overrides, expected match].
export const V = '2026-11-01';
export const base = { id: 'Q1', title: 'The Sample Film', originalTitle: 'The Sample Film', year: 1985, runtime: 100,
  genres: ['drama film'], countries: ['United States'], languages: ['English'], awards: [] };

export const cases = [
  ['early-cinema', { year: 1929 }, true], ['early-cinema', { year: 1930 }, false], ['early-cinema', { year: null }, false],
  ['early-cinema', { year: 0 }, false], ['early-cinema', { year: '1920' }, false],
  ['before-the-millennium', { year: 1999 }, true], ['before-the-millennium', { year: 2000 }, false],
  ['forty-to-sixty', { runtime: 40 }, true], ['forty-to-sixty', { runtime: 60 }, true], ['forty-to-sixty', { runtime: 61 }, false],
  ['forty-to-sixty', { runtime: 39 }, false], ['forty-to-sixty', { runtime: 0 }, false], ['forty-to-sixty', { runtime: null }, false],
  ['long-feature', { runtime: 150 }, true], ['long-feature', { runtime: 149 }, false],
  ['marathon', { runtime: 210 }, true], ['marathon', { runtime: 209 }, false],
  ['animation', { genres: ['animated film', 'comedy film'] }, true], ['animation', { genres: ['Animated Film'] }, true],
  ['animation', { genres: ['computer-animated film', 'comedy film'] }, true], ['animation', { genres: ['stop-motion animated film'] }, true],
  ['animation', { genres: ['anime film'] }, true], ['animation', { genres: ['animation'] }, true],
  ['animation', { genres: ['drama film'] }, false], ['animation', { genres: ['animal film'] }, false], ['animation', { genres: undefined }, false],
  ['genre-mix', { genres: ['a', 'b', 'c'] }, true], ['genre-mix', { genres: ['a', 'b'] }, false],
  ['genre-mix', { genres: ['a', 'b', 'c', 'd'] }, false], ['genre-mix', { genres: ['a', 'A', 'b'] }, false],
  ['many-genres', { genres: ['a', 'b', 'c', 'd'] }, true], ['many-genres', { genres: ['a', 'b', 'c'] }, false],
  ['one-word-title', { title: 'Alien' }, true], ['one-word-title', { title: 'WALL·E' }, true], ['one-word-title', { title: 'Blade Runner' }, false],
  ['one-word-title', { title: '  ' }, false], ['one-word-title', { title: '!!' }, false], ['one-word-title', { title: undefined }, false],
  ['long-title', { title: 'one two three four five six seven eight' }, true], ['long-title', { title: 'one two three four five six seven' }, false],
  ['numbered-title', { title: 'Se7en' }, true], ['numbered-title', { title: 'Seven' }, false], ['numbered-title', { title: 'فيلم ٣' }, false],
  ['different-original', { title: 'Amelie', originalTitle: 'Le Fabuleux Destin d\'Amélie Poulain' }, true],
  ['different-original', { originalTitle: 'THE SAMPLE FILM' }, false], ['different-original', { originalTitle: undefined }, false],
  ['different-original', { originalTitle: '' }, false],
  ['coproduction', { countries: ['France', 'Italy'] }, true], ['coproduction', { countries: ['France'] }, false], ['coproduction', { countries: undefined }, false],
  ['wide-collaboration', { countries: ['a', 'b', 'c', 'd'] }, true], ['wide-collaboration', { countries: ['a', 'b', 'c'] }, false],
  ['language-spotlight', { languages: ['Japanese'] }, true], ['language-spotlight', { languages: ['Mandarin Chinese'] }, true],
  ['language-spotlight', { languages: ['English', 'Hindi'] }, true], ['language-spotlight', { languages: ['English'] }, false],
  ['language-spotlight', { languages: [] }, false],
  ['silent-evidence', { genres: ['silent film'] }, true], ['silent-evidence', { genres: ['drama film'], year: 1925 }, false], // the year alone never earns it
  ['award-shelf', { awards: ['Academy Award for Best Picture'] }, true], ['award-shelf', { awards: [] }, false], ['award-shelf', { awards: undefined }, false],
  ['new-millennium', { year: 2000 }, true], ['new-millennium', { year: 1999 }, false], ['new-millennium', { year: null }, false], ['new-millennium', { year: 0 }, false],
  ['feature-length', { runtime: 61 }, true], ['feature-length', { runtime: 149 }, true], ['feature-length', { runtime: 60 }, false], ['feature-length', { runtime: 150 }, false], ['feature-length', { runtime: null }, false],
];

export function poolChecks(raw, pool, ok) {
  const ms = raw.members;
  ok('film ids look like Wikidata items and ascend', ms.every((m, i) => /^Q[1-9]\d*$/.test(m.id) && (i === 0 || +m.id.slice(1) > +ms[i - 1].id.slice(1))));
  ok('every film has complete basic facts', ms.every((m) => m.title && m.originalTitle && Number.isInteger(m.year) && m.year >= 1888 && m.runtime >= 40
    && m.genres.length && m.countries.length && m.languages.length));
  ok('no film is dated after the capture date', ms.every((m) => m.year <= +raw.meta.capturedAt.slice(0, 4)));
  ok('no adult titles slipped in', ms.every((m) => !m.genres.some((g) => /pornograph|erotic film/.test(g))));
  ok('the deferred badge stays inactive', pool.stats['first-feature'].k === 0);
  ok('the pool is large enough to be a game (>= 1000)', pool.n >= 1000);
}
