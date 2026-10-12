"""Prepare two listener-only folders and ZIPs; keep condition keys outside both."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import shutil
import zipfile
from verify_export import verify

AUDIO_REVISION = 'a81294ba710614dbf354b01196f127b0f7dfaadf'
MATERIALS = ('bamboo', 'stone', 'water')
LABELS = {'bamboo': '竹叶上的短促滴声', 'stone': '石面上的清脆滴声', 'water': '水面上的低频滴声'}
FIELDS = ['clip', 'target_material', 'count', 'count_status', 'water_feel_1_to_7',
          'clarity_1_to_7', 'comfort_1_to_7', 'rain_realism_1_to_7',
          'play_count', 'played_completely', 'rest_seconds', 'notes']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def schedule(group):
    if group not in (1, 2):
        raise ValueError('Group must be 1 or 2')
    sequence = [('T1', 'A'), ('T1', 'B'), ('T2', 'B'), ('T2', 'A')]
    if group == 2:
        sequence = [(table, 'B' if condition == 'A' else 'A') for table, condition in sequence]
    return [{'clip': f'{i * 4 + j + 1:02d}', 'material': material, 'table': table,
             'condition': condition, 'source': f'{material}-{table}-{condition}-mix.wav'}
            for i, material in enumerate(MATERIALS) for j, (table, condition) in enumerate(sequence)]


def copy_checked(source, destination, expected_hash):
    if destination.exists():
        raise FileExistsError(destination)
    if digest(source) != expected_hash:
        raise ValueError(f'Source hash mismatch: {source.name}')
    shutil.copyfile(source, destination)
    if digest(destination) != expected_hash:
        raise ValueError(f'Copy hash mismatch: {destination.name}')


def write_listener_group(root, source, records, files):
    """Packaging only; public build() runs audio verification before calling this."""
    root.mkdir()
    rows = []
    for record in records:
        name = record['clip'] + '.wav'
        copy_checked(source / record['source'], root / name, files[record['source']]['sha256'])
        rows.append(f'<section data-clip="{record["clip"]}" data-material="{LABELS[record["material"]]}"><h2>片段 {record["clip"]}</h2><p>只数：{LABELS[record["material"]]}</p>'
                    f'<audio controls preload="metadata" src="{name}"></audio></section>')
    page = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>水声试听</title>
<link rel="icon" href="data:,"><style>body{max-width:720px;margin:40px auto;padding:0 20px;font:18px/1.7 system-ui;background:#f7f4ed;color:#203439}section{border-top:1px solid #bbb;padding:14px 0}audio{width:100%}label{display:block;margin:10px 0}input,select,button{font:inherit;max-width:100%;padding:5px}button{margin:20px 0}</style>
''' + f'<body data-package="{root.name}" data-audio-revision="{AUDIO_REVISION}">' + '''
<h1>水声试听</h1><p>请按编号顺序，每次只播放一段。每段 10 秒。完成一段后在空白记录表填写你实际数到的目标滴声数及四项评分，休息至少 15 秒再播放下一段。</p>
<p>只使用分配给你的这一份试听包。保持同一设备与舒适音量；不要按不同片段重新调音量。可随时停止；没有听完、重播或调整音量，请在表中如实注明。</p>
<p>计数可以填 0；无法判断时将计数留空并把 count_status 写成 unsure。评分各为 1–7，1 表示很低，7 表示很高；不能判断则留空。相同评分可表示没有察觉差别。</p>
<p>记录表四项评分依次是：water_feel（水的感觉）、clarity（目标滴声清晰度）、comfort（舒适度）、rain_realism（雨的真实感）。评分没有标准答案。</p>
<p>可直接在页面填写，最后点“导出我的记录”。只保存在你下载的 JSON 中，不会上传或自动保存；刷新或关闭前务必导出。允许部分完成与空白回答，不要填写姓名、邮箱或其他身份信息。</p>
<p>不使用页面填写时，可用表格软件编辑备用 <a href="responses.csv">responses.csv</a> 和 <a href="session.txt">session.txt</a>。两种方式选一种即可。页面不会替你计数或评分。</p>
<noscript>浏览器禁用了脚本，请使用上面的 CSV 与 TXT 记录。</noscript>
''' + '\n'.join(rows) + '<script src="listener-form.js"></script></body></html>\n'
    (root / 'index.html').write_text(page, encoding='utf-8')
    shutil.copyfile(Path(__file__).parent / 'listener-form.js', root / 'listener-form.js')
    with (root / 'responses.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow({'clip': record['clip'], 'target_material': LABELS[record['material']]})
    (root / 'session.txt').write_text(
        '匿名编号：\n设备/耳机：\n音量设置：\n日期：\n是否中途换设备/音量：\n'
        '备注：\n\ncount_status: counted 或 unsure。played_completely: yes 或 no。\n'
        '每段填写实际播放次数与休息秒数；空白不是0，不确定不强猜。\n'
        '关闭页面会保留已另存的CSV/TXT文件；请确认表格编辑器已保存。\n', encoding='utf-8')


def build(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.exists():
        raise FileExistsError('Output must be a new directory; existing answers are never overwritten')
    expected = json.loads((Path(__file__).parent / 'validation.json').read_text(encoding='utf-8'))
    if digest(source / 'measurement.json') != expected['source_sha256']['measurement.json']:
        raise ValueError('Measurement report differs from the pinned audio evidence; review before packaging')
    verification = verify(source)
    report = json.loads((source / 'measurement.json').read_text(encoding='utf-8'))
    destination.mkdir(parents=True)
    operator = {'audio_revision': AUDIO_REVISION, 'verification': verification, 'groups': {}, 'zips': {},
                'instructions': 'Give each listener only ONE listener folder/ZIP; alternate groups. Do not distribute this key or source report before responses are saved. Responses are human data, not agent-generated.'}
    for group in (1, 2):
        name = f'listen-{group:02d}'
        records = schedule(group)
        write_listener_group(destination / name, source, records, report['files'])
        operator['groups'][name] = [{**row, 'sha256': report['files'][row['source']]['sha256']} for row in records]
        zip_path = destination / (name + '.zip')
        with zipfile.ZipFile(zip_path, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
            for file in sorted((destination / name).iterdir()):
                archive.write(file, arcname=f'{name}/{file.name}')
        operator['zips'][zip_path.name] = digest(zip_path)
    (destination / 'operator-key.json').write_text(json.dumps(operator, ensure_ascii=False, indent=2), encoding='utf-8')
    (destination / 'OPERATOR.txt').write_text(
        '不要把整个输出目录给听者。每人只分配 listen-01.zip 或 listen-02.zip 之一。\n'
        '两组交替分配，记录实际分配；组1/组2只平衡顺序，不证明消除学习效应。\n'
        '听者解压后打开index.html，页内填写并导出JSON，或用备用CSV/TXT。完成回答后才揭示条件。\n'
        'operator-key.json和本文件由安排者保管。包内无条件/事件真值，但这不是身份验证或防恶意推断机制。\n'
        '任一缺失/中断/重播记录按实际保留，不把空白补成0。单人结果只能作探索。\n'
        '本目录不自动发送给任何人、不上传回答、不作试听验收结论。\n', encoding='utf-8')
    return {'pass': True, 'groups': 2, 'clips_per_group': 12, 'blank_responses': True, 'audio_revision': AUDIO_REVISION,
            'zips_sha256': operator['zips'], 'limits': 'Anonymous filenames only; actual listener assignment, playback, responses and independent acceptance remain pending.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('export_directory', type=Path)
    parser.add_argument('new_output_directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.export_directory, args.new_output_directory), ensure_ascii=False, indent=2))
