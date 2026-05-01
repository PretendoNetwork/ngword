// Package ngword is a library for checking user input against Nintendo's word filter patterns ("NgWord").
//
// Implementation is based on https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words.
//
// Note: NgWord uses a very overzealous set of regexes for input checking,
// meaning certain clean inputs like "of a giant" will be flagged (as when
// stripped of spaces this contains the substring "fag"). This is not ideal
// for general word checking, and should only be used to mimic Nintendo's
// client-side checks on the server.
package ngword

import (
	"encoding/json"
	"os"
	"regexp"
	"slices"
	"strings"
)

// Pattern represents a single NgWord filter pattern with its associated
// region and language scope.
type Pattern struct {
	// Pattern is the regular expression string used to match against the input.
	Pattern string `json:"pattern"`

	// Regions is the list of regions this pattern applies to.
	// The value "common" indicates the pattern applies to all regions regardless
	// of filter options.
	Regions []string `json:"regions"`

	// Languages is the list of languages this pattern applies to.
	Languages []string `json:"languages"`
}

// Options controls which patterns are checked and how region/language
// filters are combined.
//
// If Regions is nil or empty, patterns from all regions are included.
// If Languages is nil or empty, patterns from all languages are included.
// If Mode is empty, it defaults to "union".
type Options struct {
	// Regions is the list of regions to filter patterns by.
	// Valid values are "jp", "us", "eu", "kr", "cn", "tw", and "common".
	// A nil or empty slice matches all regions.
	Regions []string

	// Languages is the list of languages to filter patterns by.
	// Valid values include "ja-JP", "en-US", "fr-FR", "de-DE", "ko-KR", and others.
	// A nil or empty slice matches all languages.
	Languages []string

	// Mode controls how Regions and Languages filters are combined.
	// "union" includes a pattern if it matches any provided region or any provided language.
	// "intersect" includes a pattern only if it matches both a provided region and a provided language.
	// Defaults to "union".
	Mode string
}

// Violation describes a single match of a filter pattern against the input.
type Violation struct {
	// Pattern is the filter pattern that produced this violation.
	Pattern Pattern

	// Match is the substring of the normalized input that was matched.
	Match string

	// Index is the byte offset of the match within the normalized input string.
	Index int

	// Pass indicates whether the match was found in the normalized input ("raw")
	// or in the space-stripped version of the normalized input ("stripped").
	Pass string
}

// * https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms
// * but with the order moved such that multi-character forms are checked first. Otherwise
// * forms like "|-|" would become "i-i" and not "h"
var similarForms = []struct{ form, replacement string }{
	{"vv", "w"},
	{"|-|", "h"},
	{"◎◎", "oo"},
	{"タヒ", "死"},
	{"!", "i"},
	{"$", "s"},
	{"+", "t"},
	{"0", "o"},
	{"1", "i"},
	{"3", "e"},
	{"4", "a"},
	{"5", "s"},
	{"|", "i"},
	{"¡", "i"},
	{"£", "l"},
	{"¥", "y"},
	{"§", "s"},
	{"¶", "p"},
	{"ø", "o"},
	{"ƒ", "f"},
	{"α", "a"},
	{"β", "b"},
	{"γ", "r"},
	{"ε", "e"},
	{"ζ", "z"},
	{"η", "h"},
	{"ι", "i"},
	{"κ", "k"},
	{"μ", "m"},
	// * {"v", "n"}, // * Changed to "v" in a later version
	{"ο", "o"},
	{"ρ", "p"},
	{"τ", "t"},
	{"υ", "u"},
	{"χ", "x"},
	{"ω", "w"},
	{"а", "a"},
	{"б", "b"},
	{"в", "b"},
	{"г", "r"},
	{"д", "a"},
	{"е", "e"},
	{"ж", "x"},
	{"з", "e"},
	{"и", "n"},
	{"й", "n"},
	{"к", "k"},
	{"м", "m"},
	{"н", "h"},
	{"о", "o"},
	{"п", "n"},
	{"р", "p"},
	{"с", "c"},
	{"т", "t"},
	{"у", "y"},
	{"х", "x"},
	{"ц", "u"},
	{"ч", "y"},
	{"ш", "w"},
	{"щ", "w"},
	{"ъ", "b"},
	{"ь", "b"},
	{"э", "e"},
	{"я", "r"},
	{"†", "t"},
	{"‡", "t"},
	{"₩", "w"},
	{"€", "e"},
	{"₽", "p"},
	{"∀", "a"},
	{"⊂", "c"},
	{"□", "ロ"},
	{"○", "o"},
	{"◎", "o"},
	{"●", "o"},
	{"♭", "b"},
	{"〇", "o"},
	{"ソ", "ン"},
	{"ゾ", "ン"},
	{"リ", "ij"},
	{"＋", "t"},
	{"µ", "u"},
	{"ν", "v"},
	{"л", "n"},
	{"ф", "o"},
	{"ю", "o"},
}

const (
	dakuten       = "ｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾊﾋﾌﾍﾎ"
	handakuten    = "ﾊﾋﾌﾍﾎ"
	fullwidthKana = "ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン"
	smallKana     = "ァィゥェォッャュョヮ"
)

var patterns []Pattern

func init() {
	data, err := os.ReadFile("../patterns.json")
	if err != nil {
		panic(err)
	}
	if err := json.Unmarshal(data, &patterns); err != nil {
		panic(err)
	}
}

func normalize(input string) string {
	// * According to https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words:
	// *
	// * "Before being checked against the patterns, the text is normalized:
	// * Japanese hiragana, small kana, and half-width kana are converted to
	// * their regular-size, full-width katakana equivalent; full-width letters
	// * and digits are converted to their half-width equivalent; and uppercase
	// * letters are converted to lowercase letters"

	input = strings.ToLower(input)

	// * https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms
	for _, sf := range similarForms {
		input = strings.ReplaceAll(input, sf.form, sf.replacement)
	}

	// * https://github.com/kwsch/PKHeX/blob/cc7708e9d4b11d36c1cb43f14564f20015023dbd/PKHeX.Core/Legality/Restrictions/WordFilter/TextNormalizer.cs
	runes := []rune(input)
	fullwidthKanaRunes := []rune(fullwidthKana)
	var normalized []rune

	for i := 0; i < len(runes); i++ {
		char := runes[i]

		if char == ' ' || char == '\u3000' || char == 'ﾞ' || char == 'ﾟ' {
			normalized = append(normalized, char) // * Removing spaces happens elsewhere
			continue
		}

		dakutenOffset := rune(0)
		if char >= 'ｦ' && char <= 'ﾝ' && i+1 < len(runes) {
			next := runes[i+1]
			if next == 'ﾞ' && strings.ContainsRune(dakuten, char) {
				dakutenOffset = 1
			} else if next == 'ﾟ' && strings.ContainsRune(handakuten, char) {
				dakutenOffset = 2
			} else if next == 'ﾞ' && char == 'ｳ' {
				dakutenOffset = 'ヴ' - 'ウ'
			}
		}

		if char >= 'ぁ' && char <= 'ゖ' {
			char = char + 0x60
		} else if (char >= '０' && char <= '９') || (char >= 'ａ' && char <= 'ｚ') {
			char = char - 0xFEE0
		} else if char >= 'ｦ' && char <= 'ﾝ' {
			char = fullwidthKanaRunes[char-'ｦ'] + dakutenOffset
		}

		if char >= 'ァ' && char <= 'ヶ' {
			if strings.ContainsRune(smallKana, char) {
				char = char + 1
			} else if char == 'ヵ' {
				char = 'カ'
			} else if char == 'ヶ' {
				char = 'ケ'
			}
		}

		normalized = append(normalized, char)
	}

	return string(normalized)
}

// Check checks input against the NgWord filter patterns and returns a slice
// of Violation values describing each match.
//
// Before matching, input is normalized: uppercase letters are lowercased,
// full-width characters are converted to half-width, hiragana and half-width
// kana are converted to full-width katakana, and leet speak substitutions are
// applied (e.g. "3" -> "e", "$" -> "s", "|-|" -> "h"). Patterns are then
// checked against both the normalized input and a space-stripped version of it.
//
// If opts is nil, all patterns are checked with no region or language filtering.
//
// Filter modes:
//   - "union": a pattern is included if it matches any of the provided regions
//     or any of the provided languages.
//   - "intersect": a pattern is only included if it matches both a provided
//     region and a provided language.
//
// Patterns with the region "common" are always included regardless of opts.
func Check(input string, opts *Options) []Violation {
	if opts == nil {
		opts = &Options{}
	}
	if opts.Mode == "" {
		opts.Mode = "union"
	}

	anyRegion := len(opts.Regions) == 0
	anyLanguage := len(opts.Languages) == 0

	var patternsToCheck []Pattern

	for _, p := range patterns {
		alwaysInclude := slices.Contains(p.Regions, "common")
		regionMatch := anyRegion || slices.ContainsFunc(p.Regions, func(r string) bool {
			return slices.Contains(opts.Regions, r)
		})
		languageMatch := anyLanguage || slices.ContainsFunc(p.Languages, func(l string) bool {
			return slices.Contains(opts.Languages, l)
		})

		include := false
		if opts.Mode == "union" {
			include = alwaysInclude || regionMatch || languageMatch
		} else if opts.Mode == "intersect" {
			include = alwaysInclude || (regionMatch && languageMatch)
		}

		if include {
			patternsToCheck = append(patternsToCheck, p)
		}
	}

	normalized := normalize(input)
	stripped := regexp.MustCompile(`[ \x{3000}]`).ReplaceAllString(normalized, "")

	var violations []Violation
	for _, p := range patternsToCheck {
		re, err := regexp.Compile("(?i)" + p.Pattern)
		if err != nil {
			continue
		}

		for _, match := range re.FindAllStringIndex(normalized, -1) {
			violations = append(violations, Violation{
				Pattern: p,
				Match:   normalized[match[0]:match[1]],
				Index:   match[0],
				Pass:    "raw",
			})
		}

		for _, match := range re.FindAllStringIndex(stripped, -1) {
			violations = append(violations, Violation{
				Pattern: p,
				Match:   stripped[match[0]:match[1]],
				Index:   match[0],
				Pass:    "stripped",
			})
		}
	}

	return violations
}
