import assert from 'node:assert/strict';
import test from 'node:test';

import { PreferencesStorage } from '../src/services/preferences';

test('carrega valores salvos sem gravar padrões durante a leitura', async () => {
  const writes: string[] = [];
  let finishBroker: (value: string | null) => void = () => {};
  const storage = new PreferencesStorage({
    getItem: (key) => key === 'brokerUrl'
      ? new Promise<string | null>((resolve) => { finishBroker = resolve; })
      : Promise.resolve('dark'),
    setItem: async (key) => { writes.push(key); },
  });
  const loading = storage.load();
  assert.deepEqual(writes, []);
  finishBroker('wss://saved.example/mqtt');
  assert.deepEqual(await loading, { brokerUrl: 'wss://saved.example/mqtt', theme: 'dark' });
  assert.deepEqual(writes, []);
});

test('padrão do broker só é usado se não existir valor salvo', async () => {
  for (const saved of ['', 'inválida', 'ws://example.test/mqtt', null]) {
    const storage = new PreferencesStorage({
      getItem: async (key) => key === 'brokerUrl' ? saved : null,
      setItem: async () => {},
    });
    assert.equal((await storage.load()).brokerUrl, saved ?? 'wss://broker.emqx.io:8084/mqtt');
  }
});

test('falha de leitura não vira preferência padrão nem grava em disco', async () => {
  const writes: string[] = [];
  const storage = new PreferencesStorage({
    getItem: async () => { throw new Error('disco indisponível'); },
    setItem: async (key) => { writes.push(key); },
  });
  await assert.rejects(storage.load(), /Não foi possível carregar as preferências/);
  assert.deepEqual(writes, []);
});

test('persiste somente a preferência explicitamente alterada', async () => {
  const writes: [string, string][] = [];
  const storage = new PreferencesStorage({
    getItem: async () => null,
    setItem: async (key, value) => { writes.push([key, value]); },
  });
  await storage.saveBrokerUrl('wss://other.example/mqtt');
  await storage.saveTheme('dark');
  assert.deepEqual(writes, [['brokerUrl', 'wss://other.example/mqtt'], ['theme', 'dark']]);
});
