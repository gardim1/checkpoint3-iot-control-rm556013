import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Duplex } from 'node:stream';
import test from 'node:test';
import mqtt, { type IClientOptions, type ISubscriptionGrant, type MqttClient } from 'mqtt';

import { MqttService } from '../src/services/mqttService';
import type { MqttConnectionState } from '../src/types/mqtt';

const topics = ['fiap/3espx/rm556013/sensor/temperatura', 'fiap/3espx/rm556013/sensor/umidade', 'fiap/3espx/rm556013/lampada/estado'];

class Transport extends EventEmitter {
  connected = false;
  ended = 0;
  unsubscribed: string[] = [];
  subscriptions: string[] = [];
  acknowledgeSubscriptions = true;
  subscribeCallback?: (error: Error | null, grants: ISubscriptionGrant[]) => void;
  publishCallback?: (error?: Error) => void;
  publication?: { topic: string; payload: string; options: { qos: number; retain: boolean } };

  subscribe(values: string[], _options: unknown, callback: (error: Error | null, grants: ISubscriptionGrant[]) => void) {
    this.subscriptions = [...values];
    this.subscribeCallback = callback;
    if (this.acknowledgeSubscriptions) callback(null, values.map((topic) => ({ topic, qos: 1 })));
  }

  unsubscribe(values: string[]) { this.unsubscribed = [...values]; }

  publish(topic: string, payload: string, options: { qos: number; retain: boolean }, callback: (error?: Error) => void) {
    this.publication = { topic, payload, options };
    this.publishCallback = callback;
  }

  end(_force?: boolean, callback?: () => void) { this.ended++; this.connected = false; callback?.(); }

  open() { this.connected = true; this.emit('connect'); }
}

function setup() {
  const clients: Transport[] = [];
  const options: IClientOptions[] = [];
  const service = new MqttService((_url, config) => {
    const client = new Transport();
    clients.push(client);
    options.push(config);
    return client as unknown as MqttClient;
  });
  const states: MqttConnectionState[] = [];
  service.onStatus((state) => states.push(state));
  return { service, clients, states, options };
}

test('URLs inválidas falham sem criar transporte', () => {
  const { service, clients, states } = setup();
  for (const url of ['https://example.com', 'mqtt://example.com', 'wss://', 'texto', '']) {
    service.connect(url);
    assert.equal(states.at(-1)?.status, 'erro');
    assert.match(states.at(-1)?.error ?? '', /URL inválida/);
  }
  assert.equal(clients.length, 0);
  service.disconnect();
});

test('assina três tópicos em toda conexão e publica com QoS1 sem retain', async () => {
  const { service, clients, states, options } = setup();
  service.connect('wss://broker.example/mqtt');
  clients[0].open();
  assert.deepEqual(clients[0].subscriptions, topics);
  assert.equal(states.at(-1)?.status, 'conectado');
  assert.equal(options[0].reconnectPeriod, 0);
  assert.equal(options[0].connectTimeout, 10000);
  assert.equal(options[0].queueQoSZero, false);
  let acknowledged = false;
  const publication = service.publish('ON').then(() => { acknowledged = true; });
  assert.equal(acknowledged, false);
  assert.deepEqual(clients[0].publication, { topic: 'fiap/3espx/rm556013/lampada/comando', payload: '{"action":"ON"}', options: { qos: 1, retain: false } });
  clients[0].publishCallback?.();
  await publication;
  assert.equal(acknowledged, true);
  service.connect('wss://other.example/mqtt');
  clients[1].open();
  assert.deepEqual(clients[1].subscriptions, topics);
  service.disconnect();
});

test('fechamento não intencional vira erro Conexão perdida', () => {
  const { service, clients, states } = setup();
  service.connect();
  clients[0].open();
  clients[0].connected = false;
  clients[0].emit('close');
  assert.deepEqual(states.at(-1), { status: 'erro', error: 'Conexão perdida' });
  service.disconnect();
});

test('encerramento intencional limpa transporte e callbacks de geração antiga', () => {
  const { service, clients, states } = setup();
  service.connect();
  const oldClient = clients[0];
  oldClient.acknowledgeSubscriptions = false;
  oldClient.open();
  service.connect();
  assert.deepEqual(oldClient.unsubscribed, topics);
  assert.equal(oldClient.eventNames().length, 0);
  assert.equal(oldClient.ended, 1);
  oldClient.subscribeCallback?.(null, topics.map((topic) => ({ topic, qos: 1 })));
  assert.equal(states.at(-1)?.status, 'conectando');
  service.disconnect();
  assert.equal(states.at(-1)?.status, 'desconectado');
  assert.equal(clients[1].eventNames().length, 0);
});

test('watchdog impede ficar preso em conectando e é cancelado ao desconectar', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { service, states, clients } = setup();
  service.connect();
  context.mock.timers.tick(10001);
  assert.equal(states.at(-1)?.status, 'erro');
  assert.match(states.at(-1)?.error ?? '', /Tempo limite/);
  assert.equal(clients[0].ended, 1);
  service.connect();
  service.disconnect();
  context.mock.timers.tick(20000);
  assert.equal(states.at(-1)?.status, 'desconectado');
  assert.equal(clients.length, 2);
});

test('SUBACK recusado não marca conectado', () => {
  const { service, clients, states } = setup();
  service.connect();
  clients[0].acknowledgeSubscriptions = false;
  clients[0].open();
  clients[0].subscribeCallback?.(null, [{ topic: topics[0], qos: 128 }]);
  assert.equal(states.at(-1)?.status, 'erro');
  service.disconnect();
});

test('publicação offline é recusada e erro de PUBACK não é sucesso', async () => {
  const { service, clients } = setup();
  await assert.rejects(service.publish('ON'), /Conecte ao broker/);
  service.connect();
  clients[0].open();
  const publication = service.publish('ON');
  clients[0].publishCallback?.(new Error('publicação negada'));
  await assert.rejects(publication, /publicação negada/);
  service.disconnect();
});

test('substituir conexão rejeita publicação pendente e ignora PUBACK antigo', async () => {
  const { service, clients } = setup();
  service.connect();
  clients[0].open();
  let result = 'pendente';
  const publication = service.publish('ON').then(() => { result = 'sucesso'; }, () => { result = 'erro'; });
  service.connect();
  await Promise.resolve();
  assert.equal(result, 'erro');
  clients[0].publishCallback?.();
  await publication;
  assert.equal(result, 'erro');
  service.disconnect();
});

test('desconectar antes do CONNACK preserva limpeza interna do MQTT.js real', async () => {
  let client: MqttClient | null = null;
  const service = new MqttService((_url, options) => {
    client = new mqtt.MqttClient(() => new Duplex({ read() {}, write(_chunk, _encoding, callback) { callback(); } }), { ...options, connectTimeout: 20 });
    return client;
  });
  const states: MqttConnectionState[] = [];
  service.onStatus((state) => states.push(state));
  service.connect();
  service.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(states.at(-1)?.status, 'desconectado');
  assert.equal((client as MqttClient | null)?.eventNames().length, 0);
});
