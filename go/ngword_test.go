package ngword_test

import (
	"testing"

	ngword "github.com/PretendoNetwork/ngword/go"
)

func TestCheck(t *testing.T) {
	t.Run("returns empty for a clean word", func(t *testing.T) {
		result := ngword.Check("fudge", nil)
		if len(result) != 0 {
			t.Errorf("expected no violations, got %d", len(result))
		}
	})

	t.Run("matches substrings", func(t *testing.T) {
		result := ngword.Check("you fucked up", nil)
		if len(result) == 0 {
			t.Error("expected violations, got none")
		}
	})

	t.Run("matches word-boundary patterns when standalone", func(t *testing.T) {
		result := ngword.Check("anus", nil)
		if len(result) == 0 {
			t.Error("expected violations, got none")
		}
	})

	t.Run("matches word-boundary pattern with surrounding spaces", func(t *testing.T) {
		result := ngword.Check("some anus here", nil)
		if len(result) == 0 {
			t.Error("expected violations, got none")
		}
	})

	t.Run("is case-insensitive", func(t *testing.T) {
		upper := ngword.Check("FUCK", nil)
		lower := ngword.Check("fuck", nil)
		if len(upper) != len(lower) {
			t.Errorf("expected same number of violations, got %d vs %d", len(upper), len(lower))
		}
		for i := range upper {
			if upper[i].Match != lower[i].Match || upper[i].Pattern.Pattern != lower[i].Pattern.Pattern {
				t.Errorf("violation mismatch at index %d", i)
			}
		}
	})

	t.Run("substitutes l33t speak", func(t *testing.T) {
		result := ngword.Check("s3x", nil)
		if len(result) == 0 {
			t.Error("expected violations, got none")
		}
	})

	t.Run("substitutes $ for s", func(t *testing.T) {
		result := ngword.Check("$ex", nil)
		if len(result) == 0 {
			t.Error("expected violations, got none")
		}
	})

	t.Run("strips spaces", func(t *testing.T) {
		result := ngword.Check("f u c k", nil)
		if len(result) == 0 {
			t.Error("expected violations for ASCII spaced input, got none")
		}
		result = ngword.Check("f\u3000u\u3000c\u3000k", nil)
		if len(result) == 0 {
			t.Error("expected violations for fullwidth spaced input, got none")
		}
	})

	t.Run("no-filter union and intersect produce identical results", func(t *testing.T) {
		union := ngword.Check("fuck", &ngword.Options{Mode: "union"})
		intersect := ngword.Check("fuck", &ngword.Options{Mode: "intersect"})
		if len(union) != len(intersect) {
			t.Errorf("expected identical results, got %d vs %d", len(union), len(intersect))
		}
		for i := range union {
			if union[i].Match != intersect[i].Match || union[i].Pattern.Pattern != intersect[i].Pattern.Pattern {
				t.Errorf("violation mismatch at index %d", i)
			}
		}
	})

	t.Run("filters by union mode", func(t *testing.T) {
		result := ngword.Check("éjaculé", &ngword.Options{
			Mode:      "union",
			Regions:   []string{"jp"},
			Languages: []string{"fr-FR"},
		})
		if len(result) == 0 {
			t.Error("expected violations in union mode, got none")
		}
	})

	t.Run("filters by intersect mode - no match across disjoint region/language", func(t *testing.T) {
		result := ngword.Check("éjaculé", &ngword.Options{
			Mode:      "intersect",
			Regions:   []string{"jp"},
			Languages: []string{"fr-FR"},
		})
		if len(result) != 0 {
			t.Errorf("expected no violations, got %d", len(result))
		}
	})

	t.Run("filters by intersect mode - matches when region and language align", func(t *testing.T) {
		result := ngword.Check("warmerbruder", &ngword.Options{
			Mode:      "intersect",
			Regions:   []string{"eu"},
			Languages: []string{"de-DE"},
		})
		if len(result) != 2 {
			t.Errorf("expected 2 violations, got %d", len(result))
		}
	})

	t.Run("catches clean input that when space-stripped has bad words", func(t *testing.T) {
		result := ngword.Check("of a giant", nil)
		if len(result) == 0 {
			t.Error("expected violations for clean input with accidental bad words, got none")
		}
	})
}
