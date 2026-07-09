//go:build !darwin

package capture

import (
	"errors"

	"voxa/internal/audio"
)

var ErrNativeCaptureNotImplemented = errors.New("native capture is only planned for macOS in this scaffold")

type NativePair struct{}

func (NativePair) Open(sampleRate int) (audio.FrameSource, error) {
	return nil, ErrNativeCaptureNotImplemented
}
