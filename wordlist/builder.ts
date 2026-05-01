import fs from 'node:fs';

const lists = [
	...fs.readdirSync('./3ds').filter((file: string) => file.endsWith('.txt')).map((file: string) => `./3ds/${file}`),
	...fs.readdirSync('./wiiu').filter((file: string) => file.endsWith('.txt')).map((file: string) => `./wiiu/${file}`)
];

// * Wii U and 3DS files use different byte orders
function readUTF16FileContents(path: string): string {
	const buffer = fs.readFileSync(path);

	if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
		return buffer.toString('utf16le');
	}

	return buffer.swap16().toString('utf16le');
}

const REGION_ID_REGEX = /\^badword(\w)\$/g;
const LANGUAGE_ID_WIIU_REGEX = /\^bbw(\w{3})\$/g;
const LANGUAGE_ID_3DS_REGEX = /\^bw(\w{2})\$/g;

const REGIONS: Record<string, string> = {
	j: 'jp',
	e: 'us',
	p: 'eu',
	k: 'kr',
	c: 'cn',
	t: 'tw',
	a: 'common'
};

const LANGUAGES: Record<string, string[]> = {
	jja: ['ja-JP'], // * Wii U ID
	een: ['en-US'], // * Wii U ID
	efr: ['fr-CA'], // * Wii U ID
	ees: ['es-419', 'es-MX', 'es-AR', 'es-US'], // * Wii U ID
	pen: ['en-GB'], // * Wii U ID
	pfr: ['fr-FR'], // * Wii U ID
	pde: ['de-DE'], // * Wii U ID
	pit: ['it-IT'], // * Wii U ID
	pes: ['es-ES'], // * Wii U ID
	pnl: ['nl-NL'], // * Wii U ID
	kko: ['ko-KR'], // * Wii U ID
	czh: ['zh-Hans', 'zh-CN'], // * Wii U ID
	ppt: ['pt-PT'], // * Wii U ID
	pru: ['ru-RU'], // * Wii U ID
	ept: ['pt-BR'], // * Wii U ID
	tzh: ['zh-Hant', 'zh-TW'], // * Wii U ID
	ten: ['en-TW'], // * Wii U ID
	jj: ['ja-JP'], // * 3DS ID
	us: ['en-US'], // * 3DS ID
	ef: ['fr-CA'], // * 3DS ID
	es: ['es-419', 'es-MX', 'es-AR', 'es-US'], // * 3DS ID
	pe: ['en-GB'], // * 3DS ID
	pf: ['fr-FR'], // * 3DS ID
	pd: ['de-DE'], // * 3DS ID
	pi: ['it-IT'], // * 3DS ID
	ps: ['es-ES'], // * 3DS ID
	pn: ['nl-NL'], // * 3DS ID
	kk: ['ko-KR'], // * 3DS ID
	cz: ['zh-Hans', 'zh-CN'], // * 3DS ID
	pp: ['pt-PT'], // * 3DS ID
	pr: ['ru-RU'], // * 3DS ID
	ep: ['pt-BR'], // * 3DS ID
	tz: ['zh-Hant', 'zh-TW'], // * 3DS ID
	te: ['en-TW'] // * 3DS ID
};

const patternsMap: Record<string, {
	regions: string[];
	languages: string[];
}> = {};

for (const list of lists) {
	const fileContents = readUTF16FileContents(list);
	const expressions = fileContents.split('\n');
	const regions = [...new Set([...fileContents.matchAll(REGION_ID_REGEX)].map(match => match[1]).map(regionID => REGIONS[regionID]))];
	const languages = [...new Set([...fileContents.matchAll(LANGUAGE_ID_WIIU_REGEX), ...fileContents.matchAll(LANGUAGE_ID_3DS_REGEX)].map(match => match[1]).flatMap(languageID => LANGUAGES[languageID]))];

	for (const expression of expressions) {
		if (expression.trim().length === 0) {
			continue;
		}

		let pattern = expression;
		const anchorStart = pattern.startsWith('^');
		const anchorEnd = pattern.endsWith('$');

		// * Strip anchor tokens and replace them with boundaries. According to https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words
		// * these tokens define word boundaries, not the start/stop of strings, and on the 3DS (and presumably Wii U) the only word boundaries
		// * are full/half-width spaces. So just bake these in at build time
		if (anchorStart) {
			pattern = pattern.slice(1);
			pattern = '(?:^|[ \u3000])' + pattern;
		}

		if (anchorEnd) {
			pattern = pattern.slice(0, -1);
			pattern = pattern + '(?:$|[ \u3000])';
		}

		// * Make capture grounds non-capturing, to not interfere with the libraries capturing
		pattern = pattern.replace(/\((?!\?)/g, '(?:');

		if (!patternsMap[pattern]) {
			patternsMap[pattern] = {
				regions: [],
				languages: []
			};
		}

		for (const region of regions) {
			if (!patternsMap[pattern].regions.includes(region)) {
				patternsMap[pattern].regions.push(region)
			}
		}

		for (const language of languages) {
			if (!patternsMap[pattern].languages.includes(language)) {
				patternsMap[pattern].languages.push(language)
			}
		}
	}
}

const patterns = Object.entries(patternsMap).map(([key, metadata]) => ({
	pattern: key,
	...metadata
}));

fs.writeFileSync('../patterns.json', JSON.stringify(patterns));
