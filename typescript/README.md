# @pretendonetwork/ngword

TypeScript library for checking user input against Nintendo's word filter patterns ("NgWord").

Implementation based off https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words.

> ***NOTE: NgWord uses a very overzealous set of regexes for input checking, meaning certain clean inputs like `of a giant` will be flagged here (as when stripped of spaces this contains the substring "fag"). This is not ideal for general word checking, and should only be used to mimic the client-side checks on the server. There are better systems for generic input checking.***

## Installation

```sh
npm install @pretendonetwork/ngword
```

## Example

```ts
import ngword from '@pretendonetwork/ngword';

const violations = ngword.check('some input');
```

## API

### `ngword.check(input, options?)`

Checks `input` against the word filter patterns and returns an array of `NGWordViolation` objects.

#### Parameters

**`input`** `string` - The user input to check.

**`options`** `NGWordOptions` *(optional)* - Filter and mode configuration.

| Option       | Type                     | Default   | Description                                                                            |
| ------------ | ------------------------ | --------- | -------------------------------------------------------------------------------------- |
| `regions?`   | `string[]`               | `[]`      | Regions to filter patterns by. An empty array matches all regions                      |
| `languages?` | `string[]`               | `[]`      | Languages to filter patterns by. An empty array matches all languages                  |
| `mode?`      | `'union' \| 'intersect'` | `'union'` | How `regions` and `languages` filters are combined (see [Filter Modes](#filter-modes)) |

#### Return value

An array of `NGWordViolation` objects:

| Field     | Type                  | Description                                                                                            |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `pattern` | `NGWordPattern`       | The pattern that produced this violation                                                               |
| `match`   | `string`              | The regex match                                                                                        |
| `index`   | `number`              | The index of the match in the normalized input string                                                  |
| `pass`    | `'raw' \| 'stripped'` | Whether the match was found in the normalized input (`raw`) or the space-stripped version (`stripped`) |

## Filter Modes

When `regions` and/or `languages` are provided, the `mode` option controls how they interact.

**`union`** - A pattern is included if it matches *any* of the provided regions *or* any of the provided languages.

```ts
// Includes all patterns in the 'jp' region (regardless of language), plus all patterns with language 'fr-FR' (regardless of region)
ngword.check('input', { mode: 'union', regions: ['jp'], languages: ['fr-FR'] });
```

**`intersect`** - A pattern is only included if it matches *both* a provided region *and* a provided language. Use this for precise locale-specific checking.

```ts
// Only includes patterns that are in the 'eu' region AND have language 'de-DE'
ngword.check('input', { mode: 'intersect', regions: ['eu'], languages: ['de-DE'] });
```

Patterns with the region `common` are always included regardless of mode or filters.

## Input Normalization

Before matching, input is normalized using the following steps:

- Uppercase letters are lowercased
- Full-width letters and digits are converted to half-width equivalents
- Hiragana, small kana, and half-width kana are converted to full-width katakana
- [Leet speak and similar character substitutions](https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms) are applied (e.g. `3` -> `e`, `$` -> `s`, `|-|` -> `h`)
- Patterns are checked against both the normalized input and a space-stripped version