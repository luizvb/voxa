package recorder

import (
	"os"
	"path/filepath"
	"testing"

	"voxa/internal/capture"
)

func TestRecordCreatesVoxaWavArtifacts(t *testing.T) {
	dir := t.TempDir()

	result, err := Record(capture.SimulatedPair{Frames: 160}, Config{
		OutputDir:  dir,
		SampleRate: 16000,
		MaxFrames:  160,
	})
	if err != nil {
		t.Fatalf("record failed: %v", err)
	}

	if result.Frames != 160 {
		t.Fatalf("expected 160 frames, got %d", result.Frames)
	}

	for _, name := range []string{"mic.wav", "system.wav", "mix.wav"} {
		path := filepath.Join(dir, name)
		info, err := os.Stat(path)
		if err != nil {
			t.Fatalf("expected artifact %s: %v", name, err)
		}
		if info.Size() != 44+160*2 {
			t.Fatalf("unexpected %s size: got %d", name, info.Size())
		}

		header, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", name, err)
		}
		if string(header[0:4]) != "RIFF" || string(header[8:12]) != "WAVE" {
			t.Fatalf("%s is not a WAV file", name)
		}
	}
}

func TestRecordRequiresPositiveFrames(t *testing.T) {
	_, err := Record(capture.SimulatedPair{Frames: 0}, Config{
		OutputDir: t.TempDir(),
		MaxFrames: 0,
	})
	if err == nil {
		t.Fatal("expected validation error")
	}
}
