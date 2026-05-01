import fs from 'node:fs';
import url from 'node:url';
import path from 'node:path';

export type NGWordPattern = {
	pattern: string;
	regions: ('jp' | 'us' | 'eu' | 'kr' | 'cn' | 'tw' | 'common')[];
	languages: ('ja-JP' | 'en-US' | 'fr-CA' | 'es-419' | 'es-MX' | 'es-AR' | 'es-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT' | 'es-ES' | 'nl-NL' | 'ko-KR' | 'zh-Hans' | 'zh-CN' | 'pt-PT' | 'ru-RU' | 'pt-BR' | 'zh-Hant' | 'zh-TW' | 'en-TW' | 'ja-JP' | 'en-US' | 'fr-CA' | 'es-419' | 'es-MX' | 'es-AR' | 'es-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT' | 'es-ES' | 'nl-NL' | 'ko-KR' | 'zh-Hans' | 'zh-CN' | 'pt-PT' | 'ru-RU' | 'pt-BR' | 'zh-Hant' | 'zh-TW' | 'en-TW')[];
};

export type NGWordOptions = {
	regions?: string[];
	languages?: string[];
	mode?: 'union' | 'intersect';
};

export type NGWordViolation = {
	pattern: NGWordPattern;
	match: string;
	index: number;
	pass: 'raw' | 'stripped';
};

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// * https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms
// * but with the order moved such that multi-character forms are checked first. Otherwise
// * forms like "|-|" would become "i-i" and not "h"
const SIMILAR_FORMS = {
	'vv': 'w',
	'|-|': 'h',
	'◎◎': 'oo',
	'タヒ': '死',
	'!': 'i',
	'$': 's',
	'+': 't',
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'|': 'i',
	'¡': 'i',
	'£': 'l',
	'¥': 'y',
	'§': 's',
	'¶': 'p',
	'ø': 'o',
	'ƒ': 'f',
	'α': 'a',
	'β': 'b',
	'γ': 'r',
	'ε': 'e',
	'ζ': 'z',
	'η': 'h',
	'ι': 'i',
	'κ': 'k',
	'μ': 'm',
	// * 'ν': 'n', // * Changed to "v" in a later version
	'ο': 'o',
	'ρ': 'p',
	'τ': 't',
	'υ': 'u',
	'χ': 'x',
	'ω': 'w',
	'а': 'a',
	'б': 'b',
	'в': 'b',
	'г': 'r',
	'д': 'a',
	'е': 'e',
	'ж': 'x',
	'з': 'e',
	'и': 'n',
	'й': 'n',
	'к': 'k',
	'м': 'm',
	'н': 'h',
	'о': 'o',
	'п': 'n',
	'р': 'p',
	'с': 'c',
	'т': 't',
	'у': 'y',
	'х': 'x',
	'ц': 'u',
	'ч': 'y',
	'ш': 'w',
	'щ': 'w',
	'ъ': 'b',
	'ь': 'b',
	'э': 'e',
	'я': 'r',
	'†': 't',
	'‡': 't',
	'₩': 'w',
	'€': 'e',
	'₽': 'p',
	'∀': 'a',
	'⊂': 'c',
	'□': 'ロ',
	'○': 'o',
	'◎': 'o',
	'●': 'o',
	'♭': 'b',
	'〇': 'o',
	'ソ': 'ン',
	'ゾ': 'ン',
	'リ': 'ij',
	'＋': 't',
	'µ': 'u',
	'ν': 'v',
	'л': 'n',
	'ф': 'o',
	'ю': 'o'
};

const DAKUTEN = 'ｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾊﾋﾌﾍﾎ';
const HANDAKUTEN = 'ﾊﾋﾌﾍﾎ';
const FULLWIDTH_KANA = 'ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
const SMALL_KANA = 'ァィゥェォッャュョヮ';
const PATTERNS = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../patterns.json'), {
	encoding: 'utf8'
})) as NGWordPattern[];

function normalize(input: string): string {
	// * According to https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words:
	// *
	// * "Before being checked against the patterns, the text is normalized:
	// * Japanese hiragana, small kana, and half-width kana are converted to
	// * their regular-size, full-width katakana equivalent; full-width letters
	// * and digits are converted to their half-width equivalent; and uppercase
	// * letters are converted to lowercase letters"

	input = input.toLowerCase();

	// * https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms
	for (const [form, replacement] of Object.entries(SIMILAR_FORMS)) {
		input = input.replaceAll(form, replacement);
	}

	// * https://github.com/kwsch/PKHeX/blob/cc7708e9d4b11d36c1cb43f14564f20015023dbd/PKHeX.Core/Legality/Restrictions/WordFilter/TextNormalizer.cs
	const normalized: string[] = [];

	for (let i = 0; i < input.length; i++) {
		let char = input[i];
		let code = char.charCodeAt(0);
		let dakutenOffset = 0;

		if (char === ' ' || char === '\u3000' || char === 'ﾞ' || char === 'ﾟ') {
			normalized.push(char); // * Removing spaces happens elsewhere
			continue;
		}

		if (code >= 'ｦ'.charCodeAt(0) && code <= 'ﾝ'.charCodeAt(0) && i + 1 < input.length) {
			const next = input[i + 1];
			if (next === 'ﾞ' && DAKUTEN.includes(char)) {
				dakutenOffset = 1;
			} else if (next === 'ﾟ' && HANDAKUTEN.includes(char)) {
				dakutenOffset = 2;
			} else if (next === 'ﾞ' && char === 'ｳ') {
				dakutenOffset = 'ヴ'.charCodeAt(0) - 'ウ'.charCodeAt(0);
			}
		}

		if (code >= 'ぁ'.charCodeAt(0) && code <= 'ゖ'.charCodeAt(0)) {
			code = code + 0x60;
		} else if ((code >= '０'.charCodeAt(0) && code <= '９'.charCodeAt(0)) || (code >= 'ａ'.charCodeAt(0) && code <= 'ｚ'.charCodeAt(0))) {
			code = code - 0xFEE0;
		} else if (code >= 'ｦ'.charCodeAt(0) && code <= 'ﾝ'.charCodeAt(0)) {
			code = FULLWIDTH_KANA[code - 'ｦ'.charCodeAt(0)].charCodeAt(0) + dakutenOffset;
		}

		char = String.fromCharCode(code);

		if (code >= 'ァ'.charCodeAt(0) && code <= 'ヶ'.charCodeAt(0)) {
			if (SMALL_KANA.includes(char)) {
				char = String.fromCharCode(code + 1);
			} else if (char === 'ヵ') {
				char = 'カ';
			} else if (char === 'ヶ') {
				char = 'ケ';
			}
		}

		normalized.push(char);
	}

	return normalized.join('');
}

export function check(input: string, options?: NGWordOptions): NGWordViolation[] {
	if (!options) {
		options = {
			regions: [],
			languages: [],
			mode: 'union'
		};
	}

	if (!options.regions) {
		options.regions = [];
	}

	if (!options.languages) {
		options.languages = [];
	}

	if (!options.mode) {
		options.mode = 'union';
	}

	const anyRegion = options.regions.length === 0;
	const anyLanguage = options.languages.length === 0;
	const patternsToCheck: NGWordPattern[] = [];

	for (const pattern of PATTERNS) {
		const alwaysInclude = pattern.regions.includes('common');
		const regionMatch = anyRegion || pattern.regions.some(region => options.regions!.includes(region));
		const languageMatch = anyLanguage || pattern.languages.some(language => options.languages!.includes(language));
		let include = false;

		if (options.mode === 'union') {
			include = alwaysInclude || regionMatch || languageMatch;
		} else {
			include = alwaysInclude || (regionMatch && languageMatch);
		}

		if (include) {
			patternsToCheck.push(pattern);
		}
	}

	const violations: NGWordViolation[] = [];
	const normalized = normalize(input);
	const stripped = normalized.replace(/[ \u3000]/g, '');

	for (const pattern of patternsToCheck) {
		for (const match of normalized.matchAll(new RegExp(pattern.pattern, 'ug'))) {
			violations.push({
				pattern: pattern,
				match: match[0],
				index: match.index!,
				pass: 'raw'
			});
		}

		for (const match of stripped.matchAll(new RegExp(pattern.pattern, 'ug'))) {
			violations.push({
				pattern: pattern,
				match: match[0],
				index: match.index!,
				pass: 'stripped'
			});
		}
	}

	return violations;
}

export default {
	check
};
