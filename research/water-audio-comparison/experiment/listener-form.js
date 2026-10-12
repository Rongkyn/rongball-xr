(function (root) {
  'use strict';
  function validate(rows) {
    for (const row of rows) {
      const fail = message => { throw new Error(`片段 ${row.clip}：${message}`); };
      if (!['', 'counted', 'unsure'].includes(row.count_status)) fail('计数状态无效');
      if (row.count_status === 'unsure' && row.count !== '') fail('无法判断时请将计数留空');
      if (row.count_status === 'counted' && row.count === '') fail('已计数时请填写数量，0 也是有效回答');
      if (row.count !== '' && (!/^\d+$/.test(row.count) || row.count_status !== 'counted')) fail('数量须为非负整数，并选择已计数');
      for (const field of ['water_feel_1_to_7', 'clarity_1_to_7', 'comfort_1_to_7', 'rain_realism_1_to_7']) {
        if (row[field] !== '' && !/^[1-7]$/.test(row[field])) fail('评分须为 1–7 或留空');
      }
      for (const field of ['play_count', 'rest_seconds']) {
        if (row[field] !== '' && !/^\d+$/.test(row[field])) fail('播放次数和休息秒数须为非负整数或留空');
      }
      if (!['', 'yes', 'no'].includes(row.played_completely)) fail('听完状态无效');
    }
    return rows;
  }
  if (typeof module !== 'undefined') module.exports = {validate};
  if (typeof document === 'undefined') return;
  const fields = [
    ['count_status', '计数状态', [['', '未回答'], ['counted', '已计数'], ['unsure', '无法判断']]],
    ['count', '数到的目标滴声数（可填 0）'],
    ...[['water_feel_1_to_7', '水的感觉'], ['clarity_1_to_7', '目标滴声清晰度'], ['comfort_1_to_7', '舒适度'], ['rain_realism_1_to_7', '雨的真实感']]
      .map(([name, label]) => [name, label, [['', '未回答'], ...[1,2,3,4,5,6,7].map(n => [String(n), String(n)])]]),
    ['play_count', '实际播放次数'],
    ['played_completely', '是否完整听完', [['', '未回答'], ['yes', '是'], ['no', '否']]],
    ['rest_seconds', '本段后休息秒数'], ['notes', '备注（中断、重播、调音量等）']
  ];
  const form = document.createElement('form');
  form.id = 'listener-form';
  const sections = [...document.querySelectorAll('section[data-clip]')];
  sections[0].before(form);
  const session = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = '本次试听'; session.append(legend);
  function addControl(parent, name, labelText, options) {
    const label = document.createElement('label'); label.textContent = labelText + ' ';
    const control = document.createElement(options ? 'select' : 'input'); control.name = name;
    if (options) for (const [value, text] of options) control.add(new Option(text, value));
    else {control.type = 'text'; control.maxLength = 1000;}
    label.append(control); parent.append(label); return control;
  }
  for (const [name, label] of [['anonymous_id','匿名编号（不填姓名）'], ['device','设备 / 耳机'], ['volume','固定音量设置'], ['session_notes','设备、音量变化或其他备注']]) addControl(session, name, label);
  form.append(session);
  for (const section of sections) {
    form.append(section);
    for (const [name, label, options] of fields) addControl(section, name, label, options);
  }
  const button = document.createElement('button'); button.type = 'submit'; button.textContent = '导出我的记录（JSON）';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  form.append(button, status);
  let dirty = false;
  form.addEventListener('input', () => { dirty = true; });
  addEventListener('beforeunload', event => { if (dirty) {event.preventDefault(); event.returnValue = '';}});
  for (const audio of document.querySelectorAll('audio')) audio.addEventListener('play', () => {
    for (const other of document.querySelectorAll('audio')) if (other !== audio) other.pause();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const rows = sections.map(section => ({clip:section.dataset.clip, target_material:section.dataset.material,
        ...Object.fromEntries([...section.querySelectorAll('input,select')].map(input => [input.name, input.value]))}));
      validate(rows);
      const record = {schema_version:1, package_id:document.body.dataset.package, audio_revision:document.body.dataset.audioRevision,
        exported_at:new Date().toISOString(), session:Object.fromEntries([...session.querySelectorAll('input')].map(input => [input.name,input.value])), responses:rows};
      const link = document.createElement('a');
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type:'application/json'}));
      link.href = url; link.download = 'water-listening-' + Date.now() + '.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      // Keep the unload reminder: a download request alone does not prove the file was saved.
      status.textContent = '已请求下载。请确认下载目录中保存了 JSON，再关闭页面。空白回答保持为空；记录未上传。';
    } catch (error) {status.textContent = error.message;}
  });
})(globalThis);
