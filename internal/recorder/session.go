package recorder

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"voxa/internal/audio"
	"voxa/internal/wav"
)

type Config struct {
	OutputDir  string `json:"outputDir"`
	SampleRate int    `json:"sampleRate"`
	MaxFrames  int    `json:"maxFrames"`
}

type Result struct {
	OutputDir string   `json:"outputDir"`
	Files     []string `json:"files"`
	Frames    int      `json:"frames"`
}

func Record(pair audio.CapturePair, cfg Config) (Result, error) {
	if cfg.OutputDir == "" {
		return Result{}, errors.New("output directory is required")
	}
	if cfg.SampleRate <= 0 {
		cfg.SampleRate = audio.DefaultSampleRate
	}
	if cfg.MaxFrames <= 0 {
		return Result{}, errors.New("max frames must be positive")
	}
	if err := os.MkdirAll(cfg.OutputDir, 0o755); err != nil {
		return Result{}, err
	}

	source, err := pair.Open(cfg.SampleRate)
	if err != nil {
		return Result{}, err
	}
	defer source.Close()

	micPath := filepath.Join(cfg.OutputDir, "mic.wav")
	systemPath := filepath.Join(cfg.OutputDir, "system.wav")
	mixPath := filepath.Join(cfg.OutputDir, "mix.wav")

	mic, err := wav.Create(micPath, cfg.SampleRate)
	if err != nil {
		return Result{}, err
	}
	defer mic.Close()

	system, err := wav.Create(systemPath, cfg.SampleRate)
	if err != nil {
		return Result{}, err
	}
	defer system.Close()

	mix, err := wav.Create(mixPath, cfg.SampleRate)
	if err != nil {
		return Result{}, err
	}
	defer mix.Close()

	frames := 0
	for frames < cfg.MaxFrames {
		frame, err := source.ReadFrame()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return Result{}, fmt.Errorf("read frame: %w", err)
		}

		if err := mic.WriteSample(int16(frame.Mic)); err != nil {
			return Result{}, err
		}
		if err := system.WriteSample(int16(frame.System)); err != nil {
			return Result{}, err
		}
		if err := mix.WriteSample(int16(audio.Mix(frame.Mic, frame.System))); err != nil {
			return Result{}, err
		}

		frames++
	}

	return Result{
		OutputDir: cfg.OutputDir,
		Files:     []string{micPath, systemPath, mixPath},
		Frames:    frames,
	}, nil
}
