import csv
import hashlib
from pathlib import Path
import tempfile
import unittest
from prepare_listening import FIELDS, build, copy_checked, schedule, write_listener_group


class PackagingTests(unittest.TestCase):
    def test_balanced_schedule(self):
        first, second = schedule(1), schedule(2)
        self.assertEqual(len(first), 12)
        for material in ('bamboo', 'stone', 'water'):
            rows = [x for x in first if x['material'] == material]
            self.assertEqual([(x['table'], x['condition']) for x in rows], [('T1','A'),('T1','B'),('T2','B'),('T2','A')])
        for a, b in zip(first, second):
            self.assertEqual((a['table'], a['material']), (b['table'], b['material']))
            self.assertNotEqual(a['condition'], b['condition'])
        self.assertEqual({r['source'] for r in first}, {r['source'] for r in second})
        with self.assertRaises(ValueError):
            schedule(3)

    def test_package_keeps_answers_and_conditions_out(self):
        # Test the packaging boundary with byte fixtures; not an audio-validation claim.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source'
            source.mkdir()
            files = {}
            for row in schedule(1):
                data = row['source'].encode()
                (source / row['source']).write_bytes(data)
                files[row['source']] = {'sha256': hashlib.sha256(data).hexdigest()}
            target = root / 'listener'
            write_listener_group(target, source, schedule(1), files)
            self.assertEqual(len(list(target.glob('*.wav'))), 12)
            self.assertFalse((target / 'operator-key.json').exists())
            with (target / 'responses.csv').open(encoding='utf-8-sig', newline='') as stream:
                answers = list(csv.DictReader(stream))
            self.assertEqual(len(answers), 12)
            for row in answers:
                self.assertTrue(all(row[field] == '' for field in FIELDS[2:]))
            page = (target / 'index.html').read_text(encoding='utf-8')
            self.assertNotIn('-mix.wav', page)
            self.assertNotIn('T1', page)
            self.assertNotIn('condition', page)
            self.assertNotIn('<script', page)
            for row in schedule(1):
                self.assertEqual((target / (row['clip']+'.wav')).read_bytes(), (source / row['source']).read_bytes())

    def test_tamper_and_overwrite_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source'
            source.write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                copy_checked(source, root/'target', hashlib.sha256(b'expected').hexdigest())
            self.assertFalse((root/'target').exists())
            with self.assertRaises(FileExistsError):
                build(root/'missing', root)


if __name__ == '__main__':
    unittest.main()
