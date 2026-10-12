const test = require('node:test');
const assert = require('node:assert/strict');
const {validate} = require('./listener-form.js');
const blank = () => ({clip:'01',count:'',count_status:'',water_feel_1_to_7:'',clarity_1_to_7:'',comfort_1_to_7:'',rain_realism_1_to_7:'',play_count:'',played_completely:'',rest_seconds:'',notes:''});
test('partial records remain blank and zero is preserved', () => {
  const row = blank(); assert.equal(validate([row])[0].count, '');
  row.count='0'; row.count_status='counted'; assert.equal(validate([row])[0].count,'0');
});
test('uncertain and missing counts are not converted to zero', () => {
  assert.doesNotThrow(() => validate([{...blank(),count_status:'unsure'}]));
  assert.throws(() => validate([{...blank(),count_status:'counted'}]));
  assert.throws(() => validate([{...blank(),count_status:'unsure',count:'0'}]));
});
test('invalid counts, ratings and playback reports are rejected', () => {
  for (const count of ['-1','1.5','NaN','1e2']) assert.throws(() => validate([{...blank(),count_status:'counted',count}]));
  for (const bad of [{clarity_1_to_7:'8'},{play_count:'-1'},{rest_seconds:'-4'},{played_completely:'maybe'}]) assert.throws(() => validate([{...blank(),...bad}]));
});
