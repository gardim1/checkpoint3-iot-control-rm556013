import assert from 'node:assert/strict';
import test from 'node:test';

import { appendHistory, parseMessage } from '../src/services/iotState';
import { MQTT_TOPICS } from '../src/types/mqtt';

test('sensores exigem value numérico e finito', () => {
  assert.deepEqual(parseMessage({ topic: MQTT_TOPICS.temperature, payload: '{"value":24.5}' }), { kind: 'temperature', value: 24.5 });
  assert.deepEqual(parseMessage({ topic: MQTT_TOPICS.humidity, payload: '{"value":58}' }), { kind: 'humidity', value: 58 });
  for (const payload of ['{"value":"24"}', '{"value":null}', '{"value":1e999}', 'null', '[]', '{', '{"other":12}']) {
    assert.equal(parseMessage({ topic: MQTT_TOPICS.temperature, payload }), null);
  }
});

test('lâmpada aceita exclusivamente ON ou OFF em state', () => {
  assert.deepEqual(parseMessage({ topic: MQTT_TOPICS.lampState, payload: '{"state":"ON"}' }), { kind: 'lamp', value: 'ON' });
  assert.deepEqual(parseMessage({ topic: MQTT_TOPICS.lampState, payload: '{"state":"OFF"}' }), { kind: 'lamp', value: 'OFF' });
  for (const payload of ['{"state":"on"}', '{"state":false}', '{"action":"ON"}', '{}']) {
    assert.equal(parseMessage({ topic: MQTT_TOPICS.lampState, payload }), null);
  }
});

test('histórico mantém dez mensagens totais em ordem mais recente primeiro', () => {
  let history: Parameters<typeof appendHistory>[0] = [];
  for (let index = 0; index < 12; index++) {
    history = appendHistory(history, { id: String(index), topic: MQTT_TOPICS.temperature, payload: String(index), timestamp: index, direction: index % 2 === 0 ? 'recebida' : 'enviada' });
  }
  assert.deepEqual(history.map((entry) => entry.id), ['11', '10', '9', '8', '7', '6', '5', '4', '3', '2']);
  assert.equal(history[0].direction, 'enviada');
  assert.equal(history[1].direction, 'recebida');
});
