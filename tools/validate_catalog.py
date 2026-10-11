#!/usr/bin/env python3
"""Offline catalog checks only. No artwork, network, shell, or browser execution."""
import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit


class CatalogError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise CatalogError(message)


def fields(value, names, label):
    require(isinstance(value, dict), f'{label}: expected object')
    require(set(value) == set(names.split()), f'{label}: expected fields {names}')


def string(value, label):
    require(isinstance(value, str) and bool(value.strip()), f'{label}: expected nonempty string')
    require(not any(ord(c) < 32 or ord(c) == 127 for c in value), f'{label}: control character')


def reference(value, root, label, local_only=False):
    string(value, label)
    require(value == value.strip() and '\\' not in value, f'{label}: noncanonical reference')
    try:
        parsed = urlsplit(value)
        host = parsed.hostname
        parsed.port  # Reject malformed ports too.
    except ValueError as exc:
        raise CatalogError(f'{label}: malformed URL') from exc
    if parsed.scheme or parsed.netloc:
        require(not local_only and parsed.scheme == 'https' and bool(host), f'{label}: only HTTPS URLs allowed')
        require(parsed.username is None and parsed.password is None, f'{label}: URL credentials forbidden')
        require(not any(c.isspace() for c in value), f'{label}: URL whitespace forbidden')
        return
    require(not parsed.query and bool(parsed.path), f'{label}: expected file reference')
    require('%' not in parsed.path, f'{label}: encoded local paths forbidden')
    parts = parsed.path.split('/')
    require(all(part not in ('', '.', '..') for part in parts), f'{label}: unsafe local path')
    target = (root / parsed.path).resolve()
    require(target.is_relative_to(root.resolve()), f'{label}: path escapes repository')
    require(target.is_file(), f'{label}: file missing: {parsed.path}')


def references(values, root, label):
    require(isinstance(values, list) and bool(values), f'{label}: evidence/references required')
    for i, value in enumerate(values):
        reference(value, root, f'{label}[{i}]')


def validate(data, root):
    root = Path(root).resolve()
    fields(data, 'schema_version scope entries', 'catalog')
    require(type(data['schema_version']) is int and data['schema_version'] == 1, 'unsupported schema_version')
    require(data['scope'] == 'initial_slice', 'scope must be initial_slice')
    require(isinstance(data['entries'], list) and bool(data['entries']), 'entries must be nonempty list')
    seen = set()
    for i, entry in enumerate(data['entries']):
        label = f'entries[{i}]'
        fields(entry, 'id type title path contributions validation sources', label)
        string(entry['id'], label + '.id')
        require(re.fullmatch(r'[a-z][a-z0-9-]*', entry['id']), label + ': invalid id')
        require(entry['id'] not in seen, label + ': duplicate id')
        seen.add(entry['id'])
        require(entry['type'] in ('work', 'research'), label + ': invalid type')
        string(entry['title'], label + '.title')
        reference(entry['path'], root, label + '.path', local_only=True)
        require(isinstance(entry['contributions'], list) and bool(entry['contributions']), label + ': contributions required')
        for j, contribution in enumerate(entry['contributions']):
            c = f'{label}.contributions[{j}]'
            fields(contribution, 'kind actor evidence', c)
            require(contribution['kind'] in ('credited_author', 'independent_research', 'implementation', 'review'), c + ': invalid contribution kind')
            string(contribution['actor'], c + '.actor')
            references(contribution['evidence'], root, c + '.evidence')
        v = entry['validation']
        fields(v, 'level limits evidence', label + '.validation')
        require(v['level'] in ('unverified', 'source_review', 'runtime_observation'), label + ': invalid validation level')
        require(isinstance(v['limits'], list) and bool(v['limits']), label + ': validation limits required')
        for limit in v['limits']:
            string(limit, label + '.limits')
        references(v['evidence'], root, label + '.validation.evidence')
        references(entry['sources'], root, label + '.sources')
    return len(seen)


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f'duplicate JSON key: {key}')
        result[key] = value
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--catalog', type=Path, help='Defaults to <root>/collaboration/catalog.json')
    args = parser.parse_args(argv)
    path = args.catalog or args.root / 'collaboration/catalog.json'
    try:
        data = json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_keys)
        count = validate(data, args.root)
    except (OSError, UnicodeError, ValueError, RecursionError) as exc:
        print(f'Catalog invalid: {exc}', file=sys.stderr)
        return 1
    print(f'Catalog valid: {count} entries (structure/local references only; no runtime or acceptance claim).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
