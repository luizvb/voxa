package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"bidirectional-voice-recorder/internal/audio"
	"bidirectional-voice-recorder/internal/capture"
	"bidirectional-voice-recorder/internal/recorder"
)

type probeResponse struct {
	Name       string   `json:"name"`
	Version    string   `json:"version"`
	Protocol   string   `json:"protocol"`
	Drivers    []string `json:"drivers"`
	SampleRate int      `json:"sampleRate"`
}

func main() {
	if len(os.Args) < 2 {
		fail("missing command: probe | record-simulated")
	}

	switch os.Args[1] {
	case "probe":
		writeJSON(probeResponse{
			Name:       "recorderd",
			Version:    "0.1.0",
			Protocol:   "cli-json-v1",
			Drivers:    []string{"simulated", "native-macos-planned"},
			SampleRate: audio.DefaultSampleRate,
		})
	case "record-simulated":
		recordSimulated(os.Args[2:])
	default:
		fail(fmt.Sprintf("unknown command: %s", os.Args[1]))
	}
}

func recordSimulated(args []string) {
	fs := flag.NewFlagSet("record-simulated", flag.ExitOnError)
	out := fs.String("out", "", "output session directory")
	seconds := fs.Int("seconds", 1, "recording duration in seconds")
	sampleRate := fs.Int("sample-rate", audio.DefaultSampleRate, "sample rate")
	if err := fs.Parse(args); err != nil {
		fail(err.Error())
	}

	result, err := recorder.Record(capture.SimulatedPair{Frames: *seconds * *sampleRate}, recorder.Config{
		OutputDir:  *out,
		SampleRate: *sampleRate,
		MaxFrames:  *seconds * *sampleRate,
	})
	if err != nil {
		fail(err.Error())
	}
	writeJSON(result)
}

func writeJSON(value any) {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(value); err != nil {
		fail(err.Error())
	}
}

func fail(message string) {
	_ = json.NewEncoder(os.Stderr).Encode(map[string]string{
		"error": message,
	})
	os.Exit(1)
}
