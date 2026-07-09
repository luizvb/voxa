package audio

import "io"

const (
	DefaultSampleRate = 16000
	DefaultChannels   = 1
)

type MonoSample int16

type Frame struct {
	Mic    MonoSample
	System MonoSample
}

type FrameSource interface {
	ReadFrame() (Frame, error)
	Close() error
}

type CapturePair interface {
	Open(sampleRate int) (FrameSource, error)
}

func Mix(a, b MonoSample) MonoSample {
	sum := int(a) + int(b)
	sum /= 2
	if sum > 32767 {
		return 32767
	}
	if sum < -32768 {
		return -32768
	}
	return MonoSample(sum)
}

func IsEOF(err error) bool {
	return err == io.EOF
}
