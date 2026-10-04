// Exports buildings, facilities and places as places.json for other apps.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

// Pulls one top-level `const NAME = [...]` or `{...}` literal out of a script.
function literal(src, name) {
    const start = src.indexOf(`const ${name} = `);
    if (start < 0) throw new Error(`${name} not found`);
    const open = src.indexOf('=', start) + 2;
    let depth = 0, quote = null;
    for (let i = open; i < src.length; i++) {
        const c = src[i];
        if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = null;
        } else if (c === "'" || c === '"' || c === '`') quote = c;
        else if (c === '[' || c === '{') depth++;
        else if (c === ']' || c === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    throw new Error(`${name} not closed`);
}

function evalLiteral(src, context = {}) {
    return vm.runInNewContext(`(${src.replace(/;\s*$/, '')})`, context);
}

const config = read('js/config_v2.js');
const legend = read('js/legend.js');
const english = read('js/content_en.js');

const buildings = evalLiteral(literal(config, 'campusBuildings'));
const legendBuildings = evalLiteral(literal(legend, 'LEGEND_BUILDINGS'));
const facilities = evalLiteral(literal(legend, 'LEGEND_FACILITIES'));
const BIKE_TERMS = evalLiteral(literal(legend, 'BIKE_TERMS'));
const searchTerms = evalLiteral(literal(legend, 'LEGEND_SEARCH_TERMS'), { BIKE_TERMS });
const en = evalLiteral(literal(english, 'CONTENT_EN_BUILDINGS'));

const plain = (html) => (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

const hours = (oh) => !oh ? null : {
    label: oh.label,
    slots: (oh.slots || []).map((s) => ({ label: s.label, time: s.time }))
};

const byId = Object.fromEntries(legendBuildings.map((b) => [b.id, b]));

const places = buildings.map((b) => {
    const meta = byId[b.id] || {};
    const e = en[b.id] || {};
    const facs = facilities.filter((f) => meta.code && f.in.includes(meta.code));
    const terms = searchTerms[b.id] || {};
    return {
        id: b.id,
        code: meta.code || null,
        old_code: meta.old || null,
        kind: b.id.startsWith('Kaffee_') ? 'food'
            : b.id.startsWith('Bus_') ? 'bus'
            : b.id.startsWith('Fahrradstation_') ? 'bike'
            : 'building',
        title: { de: b.title, en: e.title || b.title },
        name: meta.name || null,
        description: { de: plain(b.description), en: plain(e.description || b.description) },
        opening_hours: { de: hours(b.openingHours), en: hours(e.openingHours || b.openingHours) },
        facilities: facs.map((f) => ({ de: f.de, en: f.en })),
        terms: { de: terms.de || [], en: terms.en || [] },
        link: b.link ? { url: b.link.url, text: b.link.text } : null
    };
});

const out = {
    generated_at: new Date().toISOString(),
    show_param: 'show',
    places
};
writeFileSync(join(root, 'places.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`places.json: ${places.length} places`);
