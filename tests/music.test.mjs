import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../public/music-worklet.js', import.meta.url), 'utf8');
function makeProcessor() {
  let Processor;
  const messages = [];
  vm.runInNewContext(source, {
    sampleRate: 8000, Math, Float32Array,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage: message => messages.push(message) }; } },
    registerProcessor: (_name, constructor) => { Processor = constructor; },
  });
  return { processor: new Processor(), messages };
}
test('all moods produce bounded, non-silent stereo audio and keep a bounded voice pool', () => {
  const { processor, messages } = makeProcessor();
  const output = [[new Float32Array(128), new Float32Array(128)]];
  for (const mood of ['cozy', 'merry', 'wistful', 'mystic']) {
    processor.port.onmessage({ data: { mood } });
    let energy = 0;
    for (let block = 0; block < 625; block++) { // Ten seconds per mood at 8 kHz.
      assert.equal(processor.process([], output), true);
      assert.ok(processor.voices.length <= 40);
      for (const channel of output[0]) for (const sample of channel) {
        assert.ok(Number.isFinite(sample)); assert.ok(Math.abs(sample) <= 1); energy += sample * sample;
      }
    }
    assert.ok(energy > 1); assert.equal(processor.mood, mood);
  }
  assert.deepEqual(messages.map(message => message.mood), ['merry', 'wistful', 'mystic']);
});
test('invalid moods are ignored and requested moods wait for the bar boundary', () => {
  const { processor } = makeProcessor();
  processor.step();
  processor.port.onmessage({ data: { mood: 'invalid' } });
  assert.equal(processor.pending, 'cozy');
  processor.port.onmessage({ data: { mood: 'merry' } });
  for (let i = 0; i < 7; i++) processor.step();
  assert.equal(processor.mood, 'cozy');
  processor.step(); assert.equal(processor.mood, 'merry');
});
