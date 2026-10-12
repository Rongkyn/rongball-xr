"""Read exported WAV bytes independently of the browser renderer; standard library only."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_wav(path):
    data = path.read_bytes()
    require(data[:4] == b'RIFF' and data[8:12] == b'WAVE', f'Invalid WAV: {path.name}')
    require(struct.unpack_from('<I', data, 4)[0] + 8 == len(data), 'RIFF size mismatch')
    require(data[12:16] == b'fmt ' and data[36:40] == b'data', 'Unexpected chunk layout')
    fmt, channels, rate, byte_rate, align, bits = struct.unpack_from('<HHIIHH', data, 20)
    require((fmt, bits) in ((1, 16), (3, 32)) and channels == 2 and rate == 48000, 'Format mismatch')
    require(align == channels * bits // 8 and byte_rate == rate * align, 'Invalid block alignment')
    require(len(data) - 44 == struct.unpack_from('<I', data, 40)[0] == rate * 10 * align, 'Length mismatch')
    divisor = 32768 if fmt == 1 else 1
    samples = [pair[0] / divisor for pair in struct.iter_unpack('<h' if fmt == 1 else '<f', data[44:])]
    require(all(math.isfinite(v) and abs(v) < 1 for v in samples), f'Nonfinite/clipped: {path.name}')
    metrics = [{'samplePeak': max(abs(v) for v in samples[ch::2]),
                'rms': math.sqrt(sum(v*v for v in samples[ch::2]) / (len(samples)//2))} for ch in range(2)]
    return samples, metrics, hashlib.sha256(data).hexdigest(), len(data)


def verify(root):
    report = json.loads((root / 'measurement.json').read_text(encoding='utf-8'))
    materials = ('bamboo', 'stone', 'water')
    expected = {f'bed-{m}-{c}.wav' for m in (*materials, 'distant') for c in 'AB'}
    expected |= {f'{m}-{t}-{c}-{stem}.wav' for m in materials for t in ('T1', 'T2') for c in 'AB' for stem in ('drops', 'bed', 'mix')}
    require(set(report['files']) == expected, 'Missing/extra manifest files')
    require(set(p.name for p in root.glob('*.wav')) == expected, 'Missing/extra exported WAVs')
    cfg = report['config']
    require(cfg['sampleRate'] == 48000 and cfg['seconds'] == 10, 'Configuration mismatch')
    factor = 10 ** (-6 / 20)
    require(abs(cfg['bedB'] - factor) < 1e-15 and cfg['master'] == cfg['safetyGain'] == 0.5, 'Gain mismatch')
    # Hold only the current pair in memory; do not trust the browser pass flag.
    metrics_checked = 0
    for name in sorted(expected):
        _, measured, digest, size = read_wav(root / name)
        claimed = report['files'][name]
        require(digest == claimed['sha256'] and size == claimed['bytes'], f'Byte hash/size mismatch: {name}')
        require(len(claimed['channels']) == 2, f'Two channel metrics required: {name}')
        for actual, declared in zip(measured, claimed['channels']):
            require(actual['rms'] > 1e-9, f'Unexpected silent channel: {name}')
            # Independently recompute metrics from the exported sample bytes.
            require(abs(actual['samplePeak'] - declared['samplePeak']) < 1e-7, f'Peak mismatch: {name}')
            require(abs(actual['rms'] - declared['rms']) < 1e-7, f'RMS mismatch: {name}')
            require(declared['nonfinite'] == declared['samplesAtOrBeyondFullScale'] == 0, 'Claimed invalid samples')
        metrics_checked += 1
    worst_ratio = worst_mix = 0.0
    all_beds = [0.0] * (48000 * 10 * 2)
    for material in (*materials, 'distant'):
        bed_a = read_wav(root / f'bed-{material}-A.wav')[0]
        bed_b = read_wav(root / f'bed-{material}-B.wav')[0]
        error = max(abs(b - a * factor) for a, b in zip(bed_a, bed_b))
        require(error <= 1e-7, f'Individual bed ratio failed: {material}')
        worst_ratio = max(worst_ratio, error)
        all_beds = [total + sample for total, sample in zip(all_beds, bed_a)]
    for m in materials:
        a_events = report['events'][f'{m}-T1']
        b_events = report['events'][f'{m}-T2']
        require(len(a_events) == len(b_events) == 8, 'Event count mismatch')
        require([{k: v for k, v in e.items() if k != 'time'} for e in a_events] ==
                [{k: v for k, v in e.items() if k != 'time'} for e in b_events], 'Unequal schedule structure')
        require([e['time'] for e in a_events] != [e['time'] for e in b_events], 'Schedules must differ')
        for table in ('T1', 'T2'):
            prefix = f'{m}-{table}'
            da = read_wav(root / f'{prefix}-A-drops.wav')[0]
            db = read_wav(root / f'{prefix}-B-drops.wav')[0]
            require(da == db, f'Drops changed: {prefix}')
            ba = read_wav(root / f'{prefix}-A-bed.wav')[0]
            bb = read_wav(root / f'{prefix}-B-bed.wav')[0]
            require(max(abs(a - total) for a, total in zip(ba, all_beds)) <= 1e-7, f'Bed sum failed: {prefix}')
            ratio_error = max(abs(b - a * factor) for a, b in zip(ba, bb))
            require(ratio_error <= 1e-7, f'Bed ratio failed: {prefix}')
            worst_ratio = max(worst_ratio, ratio_error)
            for condition, bed in (('A', ba), ('B', bb)):
                mixed = read_wav(root / f'{prefix}-{condition}-mix.wav')[0]
                error = max(abs(v - (d + b) * 0.25) for v, d, b in zip(mixed, da, bed))
                require(error <= 1/32768, f'Mix relation failed: {prefix}-{condition}')
                worst_mix = max(worst_mix, error)
    return {'pass': True, 'wav_files_checked': metrics_checked, 'max_bed_ratio_error': worst_ratio,
            'max_mix_error': worst_mix, 'limits': 'Byte/PCM checks only; no listening, true peak, identity or perceptual acceptance.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('export_directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.export_directory), ensure_ascii=False, indent=2))
