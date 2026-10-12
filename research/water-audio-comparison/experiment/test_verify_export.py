import struct
import tempfile
from pathlib import Path
import unittest
from verify_export import read_wav


class WavBytesTest(unittest.TestCase):
    def fixture(self):
        # Independent PCM16 header/sample fixture, not the JS encoder.
        size = 48000 * 10 * 2 * 2
        header = b'RIFF' + struct.pack('<I', size + 36) + b'WAVEfmt '
        header += struct.pack('<IHHIIHH', 16, 1, 2, 48000, 192000, 4, 16)
        data = bytearray(header + b'data' + struct.pack('<I', size) + bytes(size))
        struct.pack_into('<hh', data, 44, 16384, -8192)
        return data

    def test_known_pcm_values(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'known.wav'
            path.write_bytes(self.fixture())
            samples, measured, _, _ = read_wav(path)
            self.assertEqual(samples[:2], [0.5, -0.25])
            self.assertEqual([x['samplePeak'] for x in measured], [0.5, 0.25])

    def test_truncation_and_full_scale_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.wav'
            data = self.fixture()
            path.write_bytes(data[:-2])
            with self.assertRaisesRegex(ValueError, 'size mismatch'):
                read_wav(path)
            struct.pack_into('<h', data, 44, -32768)
            path.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'clipped'):
                read_wav(path)


if __name__ == '__main__':
    unittest.main()
