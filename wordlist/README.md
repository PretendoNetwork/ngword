# Wordlist

Builds a standardized word/pattern list from the NgWord lists on the Wii U/3DS to be consumed by the other libraries.

## Usage

Place the raw NgWord `.txt` files in `./3ds/` (`000400DB-00010302`) and `./wiiu/` (`0005001B-10053000`) directories, then run:

```sh
npx tsx build.ts
```

This produces `../patterns.json` in the root of the repository.

## Output

The builder writes `../patterns.json`, a JSON array of pattern objects:

```json
[
	{
		"pattern": ".*fuck.*",
		"regions":["us","common","cn","tw","eu","jp"],
		"languages":["en-US","zh-Hans","zh-CN","zh-Hant","zh-TW","en-TW","en-GB","ja-JP"]
	}
]
```

Each object corresponds to a unique regex pattern, with the union of all regions and languages from every source file that contained that pattern.

## Pattern Transformations

The following transformations are applied to each raw pattern before writing it to the output:

- Leading `^` becomes `(?:^|[ \u3000])`, as this token represents the start of a word not string in this context
- Trailing `$` becomes `(?:$|[ \u3000])`, as this token represents the end of a word not string in this context
- Any capturing groups `(...)` in the raw patterns are converted to non-capturing groups `(?:...)`

## Region and Language Codes

### Regions

| Name     | Code | Region   |
| -------- | ---- | -------- |
| Japan    | `j`  | `jp`     |
| Americas | `e`  | `us`     |
| Europe   | `p`  | `eu`     |
| Korea    | `k`  | `kr`     |
| China    | `c`  | `cn`     |
| Taiwan   | `t`  | `tw`     |
| All      | `a`  | `common` |

### Languages

| Name                   | Wii U code | 3DS code | Languages                           |
| ---------------------- | ---------- | -------- | ----------------------------------- |
| Japanese               | `jja`      | `jj`     | `ja-JP`                             |
| American English       | `een`      | `us`     | `en-US`                             |
| Canadian French        | `efr`      | `ef`     | `fr-CA`                             |
| Latin American Spanish | `ees`      | `es`     | `es-419`, `es-MX`, `es-AR`, `es-US` |
| British English        | `pen`      | `pe`     | `en-GB`                             |
| French                 | `pfr`      | `pf`     | `fr-FR`                             |
| German                 | `pde`      | `pd`     | `de-DE`                             |
| Italian                | `pit`      | `pi`     | `it-IT`                             |
| Spanish                | `pes`      | `ps`     | `es-ES`                             |
| Dutch                  | `pnl`      | `pn`     | `nl-NL`                             |
| Korean                 | `kko`      | `kk`     | `ko-KR`                             |
| Simplified Chinese     | `czh`      | `cz`     | `zh-Hans`, `zh-CN`                  |
| Portuguese             | `ppt`      | `pp`     | `pt-PT`                             |
| Russian                | `pru`      | `pr`     | `ru-RU`                             |
| Brazilian Portuguese   | `ept`      | `ep`     | `pt-BR`                             |
| Traditional Chinese    | `tzh`      | `tz`     | `zh-Hant`, `zh-TW`                  |
| Taiwanese English      | `ten`      | `te`     | `en-TW`                             |
