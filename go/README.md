# ngword

Go library for checking user input against Nintendo's word filter patterns ("NgWord").

Implementation based off https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words.

> ***NOTE: NgWord uses a very overzealous set of regexes for input checking, meaning certain clean inputs like `of a giant` will be flagged here (as when stripped of spaces this contains the substring "fag"). This is not ideal for general word checking, and should only be used to mimic the client-side checks on the server. There are better systems for generic input checking.***

## Installation

```sh
go get github.com/PretendoNetwork/ngword/go
```

## Example

```go
package main

import (
	"fmt"
	"github.com/PretendoNetwork/ngword/go"
)

func main() {
	violations := ngword.Check("some input", nil)
	fmt.Println(violations)
}
```

## API

https://pkg.go.dev/github.com/PretendoNetwork/ngword/go

## Filter Modes

When `Regions` and/or `Languages` are provided, the `Mode` field controls how they interact.

**`"union"`** - A pattern is included if it matches *any* of the provided regions *or* any of the provided languages.

```go
// Includes all patterns in the 'jp' region (regardless of language), plus all patterns with language 'fr-FR' (regardless of region)
ngword.Check("input", &ngword.Options{
	Mode:      "union",
	Regions:   []string{"jp"},
	Languages: []string{"fr-FR"},
})
```

**`"intersect"`** - A pattern is only included if it matches *both* a provided region *and* a provided language.

```go
// Only includes patterns that are in the 'eu' region AND have language 'de-DE'
ngword.Check("input", &ngword.Options{
	Mode:      "intersect",
	Regions:   []string{"eu"},
	Languages: []string{"de-DE"},
})
```

Patterns with the region `common` are always included regardless of mode or filters.

## Input Normalization

Before matching, input is normalized using the following steps:

- Uppercase letters are lowercased
- Full-width letters and digits are converted to half-width equivalents
- Hiragana, small kana, and half-width kana are converted to full-width katakana
- [Leet speak and similar character substitutions](https://bulbapedia.bulbagarden.net/wiki/List_of_censored_words#List_of_similar_forms) are applied (e.g. `3` -> `e`, `$` -> `s`, `|-|` -> `h`)
- Patterns are checked against both the normalized input and a space-stripped version
