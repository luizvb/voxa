//go:build darwin

package capture

import (
	"errors"

	"voxa/internal/audio"
)

var ErrNativeCaptureNotImplemented = errors.New("native macOS capture is not implemented yet; use Core Audio Tap or Electron desktopCapturer behind this interface")

type NativePair struct{}

func (NativePair) Open(sampleRate int) (audio.FrameSource, error) {
	return nil, ErrNativeCaptureNotImplemented
}
