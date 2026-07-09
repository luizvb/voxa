package wav

import (
	"encoding/binary"
	"io"
	"os"
)

type Writer struct {
	file      *os.File
	dataBytes uint32
	closed    bool
}

func Create(path string, sampleRate int) (*Writer, error) {
	f, err := os.Create(path)
	if err != nil {
		return nil, err
	}

	w := &Writer{file: f}
	if err := w.writeHeader(sampleRate); err != nil {
		_ = f.Close()
		return nil, err
	}
	return w, nil
}

func (w *Writer) WriteSample(sample int16) error {
	if w.closed {
		return os.ErrClosed
	}
	if err := binary.Write(w.file, binary.LittleEndian, sample); err != nil {
		return err
	}
	w.dataBytes += 2
	return nil
}

func (w *Writer) Close() error {
	if w.closed {
		return nil
	}
	w.closed = true

	if _, err := w.file.Seek(4, io.SeekStart); err != nil {
		_ = w.file.Close()
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, uint32(36)+w.dataBytes); err != nil {
		_ = w.file.Close()
		return err
	}
	if _, err := w.file.Seek(40, io.SeekStart); err != nil {
		_ = w.file.Close()
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, w.dataBytes); err != nil {
		_ = w.file.Close()
		return err
	}

	return w.file.Close()
}

func (w *Writer) writeHeader(sampleRate int) error {
	const (
		audioFormat   uint16 = 1
		channels      uint16 = 1
		bitsPerSample uint16 = 16
		blockAlign    uint16 = channels * bitsPerSample / 8
	)

	byteRate := uint32(sampleRate) * uint32(blockAlign)

	if _, err := w.file.Write([]byte("RIFF")); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, uint32(36)); err != nil {
		return err
	}
	if _, err := w.file.Write([]byte("WAVEfmt ")); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, uint32(16)); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, audioFormat); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, channels); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, uint32(sampleRate)); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, byteRate); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, blockAlign); err != nil {
		return err
	}
	if err := binary.Write(w.file, binary.LittleEndian, bitsPerSample); err != nil {
		return err
	}
	if _, err := w.file.Write([]byte("data")); err != nil {
		return err
	}
	return binary.Write(w.file, binary.LittleEndian, uint32(0))
}
