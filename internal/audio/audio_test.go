package audio

import "testing"

func TestMixAveragesSamples(t *testing.T) {
	got := Mix(1000, 3000)
	if got != 2000 {
		t.Fatalf("expected 2000, got %d", got)
	}
}

func TestMixClipsOnlyAfterAverage(t *testing.T) {
	got := Mix(32767, 32767)
	if got != 32767 {
		t.Fatalf("expected max int16, got %d", got)
	}
}
