package capture

import (
	"io"
	"math"

	"bidirectional-voice-recorder/internal/audio"
)

type SimulatedPair struct {
	Frames int
}

func (p SimulatedPair) Open(sampleRate int) (audio.FrameSource, error) {
	return &simulatedSource{
		remaining:  p.Frames,
		sampleRate: sampleRate,
	}, nil
}

type simulatedSource struct {
	index      int
	remaining  int
	sampleRate int
}

func (s *simulatedSource) ReadFrame() (audio.Frame, error) {
	if s.remaining <= 0 {
		return audio.Frame{}, io.EOF
	}

	t := float64(s.index) / float64(s.sampleRate)
	mic := math.Sin(2 * math.Pi * 220 * t)
	system := math.Sin(2 * math.Pi * 440 * t)

	s.index++
	s.remaining--

	return audio.Frame{
		Mic:    audio.MonoSample(mic * 12000),
		System: audio.MonoSample(system * 9000),
	}, nil
}

func (s *simulatedSource) Close() error {
	return nil
}
