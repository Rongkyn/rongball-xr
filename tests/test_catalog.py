import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from validate_catalog import CatalogError, unique_keys, validate


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'work.html').write_text('fixture', encoding='utf-8')
        self.data = {'schema_version': 1, 'scope': 'initial_slice', 'entries': [{
            'id': 'sample', 'type': 'work', 'title': '样本', 'path': 'work.html',
            'contributions': [{'kind': 'credited_author', 'actor': 'unknown', 'evidence': ['work.html']}],
            'validation': {'level': 'unverified', 'limits': ['No runtime check'], 'evidence': ['work.html']},
            'sources': ['work.html', 'https://github.com/Rongkyn/rongball-xr/issues/1']}]}
        self.entry = self.data['entries'][0]

    def tearDown(self):
        self.tmp.cleanup()

    def reject(self):
        with self.assertRaises(CatalogError):
            validate(self.data, self.root)

    def test_real_catalog(self):
        data = json.loads((ROOT / 'collaboration/catalog.json').read_text())
        self.assertGreaterEqual(validate(data, ROOT), 3)

    def test_unknown_credit_and_independent_research_are_valid(self):
        self.assertEqual(validate(self.data, self.root), 1)
        self.entry['type'] = 'research'
        self.entry['contributions'][0]['kind'] = 'independent_research'
        self.assertEqual(validate(self.data, self.root), 1)

    def test_duplicate_id(self):
        self.data['entries'].append(copy.deepcopy(self.entry))
        self.reject()

    def test_missing_evidence(self):
        self.entry['contributions'][0]['evidence'] = []
        self.reject()

    def test_validation_requires_evidence_and_limits(self):
        for field in ('evidence', 'limits'):
            old = self.entry['validation'][field]
            self.entry['validation'][field] = []
            self.reject()
            self.entry['validation'][field] = old

    def test_invalid_enums(self):
        for field in ('type', 'id'):
            old = self.entry[field]
            self.entry[field] = 'INVALID!'
            self.reject()
            self.entry[field] = old
        self.entry['validation']['level'] = 'accepted'
        self.reject()

    def test_unverified_cooperation_cannot_claim_acceptance(self):
        for field in ('status', 'accepted', 'collaboration'):
            self.entry[field] = 'accepted'
            self.reject()
            del self.entry[field]
        self.entry['contributions'][0]['kind'] = 'accepted_collaboration'
        self.reject()

    def test_unsafe_and_missing_paths(self):
        for path in ('../work.html', '/etc/passwd', 'a/../work.html', './work.html',
                     'a//work.html', '%2e%2e/work.html', 'missing.html',
                     'work.html?token=x', 'C:\\work.html', 'https://example.com/work.html'):
            with self.subTest(path=path):
                self.entry['path'] = path
                self.reject()

    def test_symlink_escape(self):
        with tempfile.TemporaryDirectory() as outside:
            target = Path(outside) / 'outside.txt'
            target.write_text('fixture')
            (self.root / 'escape').symlink_to(target)
            self.entry['sources'] = ['escape']
            self.reject()

    def test_reference_validation(self):
        for ref in ('javascript:alert(1)', 'http://example.com', '//example.com',
                    'https://name:secret@example.com', 'https://', 'https://bad host/',
                    'https://example.com:bad/', 'work.html\n', 'missing.md#heading'):
            with self.subTest(ref=ref):
                self.entry['sources'] = [ref]
                self.reject()
        self.entry['sources'] = ['work.html#heading']
        self.assertEqual(validate(self.data, self.root), 1)

    def test_malformed_shape(self):
        for data in (None, [], {}, {'schema_version': True, 'scope': 'initial_slice', 'entries': []}):
            with self.assertRaises(CatalogError):
                validate(data, self.root)

    def test_duplicate_json_keys(self):
        with self.assertRaises(CatalogError):
            json.loads('{"id":"one","id":"two"}', object_pairs_hook=unique_keys)

    def test_cli_invalid_json_nonzero(self):
        path = self.root / 'bad.json'
        path.write_text('{')
        proc = subprocess.run([sys.executable, str(ROOT / 'tools/validate_catalog.py'),
                               '--catalog', str(path)], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 1)
        self.assertIn('Catalog invalid:', proc.stderr)


if __name__ == '__main__':
    unittest.main()
