const mqtt = require('mqtt');
const { randomBytes } = require('node:crypto');

const url = process.env.MQTT_URL || 'wss://broker.emqx.io:8084/mqtt';
const prefix = 'fiap/3espx/rm556013';
const topics = {
  temperature: `${prefix}/sensor/temperatura`,
  humidity: `${prefix}/sensor/umidade`,
  command: `${prefix}/lampada/comando`,
  state: `${prefix}/lampada/estado`,
};
const clientId = `iotcontrol-sim-rm556013-${randomBytes(6).toString('hex')}`;
let state = 'OFF';
let temperature = 24.5;
let humidity = 58;
let stopping = false;

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
const client = mqtt.connect(url, {
  clientId,
  reconnectPeriod: 2000,
  connectTimeout: 10000,
  clean: true,
  queueQoSZero: false,
});

function publishState() {
  if (!client.connected || stopping) return;
  const payload = JSON.stringify({ state });
  client.publish(topics.state, payload, { qos: 1, retain: true }, (error) => {
    if (error) log(`Erro ao publicar estado: ${error.message}`);
    else log(`Estado publicado em ${topics.state}: ${payload} (retido)`);
  });
}

function publishReadings() {
  if (!client.connected || stopping) return;
  temperature = Math.round(Math.max(18, Math.min(32, temperature + (Math.random() - 0.5) * 0.8)) * 10) / 10;
  humidity = Math.round(Math.max(35, Math.min(80, humidity + (Math.random() - 0.5) * 3)) * 10) / 10;
  for (const [topic, value] of [[topics.temperature, temperature], [topics.humidity, humidity]]) {
    const payload = JSON.stringify({ value });
    client.publish(topic, payload, { qos: 0, retain: false }, (error) => {
      if (error) log(`Erro ao publicar leitura: ${error.message}`);
      else log(`Leitura publicada em ${topic}: ${payload}`);
    });
  }
}

client.on('connect', () => {
  if (stopping) return;
  log(`Conectado a ${url} como ${clientId}`);
  publishState();
  client.subscribe(topics.command, { qos: 1 }, (error, granted) => {
    if (error) log(`Erro ao assinar comandos: ${error.message}`);
    else if (!granted || granted.some(({ qos }) => qos === 128)) log('Assinatura de comandos recusada pelo broker');
    else log(`Assinatura ativa em ${topics.command}`);
  });
});

client.on('message', (topic, message) => {
  if (topic !== topics.command || stopping) return;
  const payload = message.toString();
  log(`Comando recebido em ${topic}: ${payload}`);
  let command;
  try {
    command = JSON.parse(payload);
  } catch {
    log('Comando inválido ignorado: JSON malformado');
    return;
  }
  if (!command || typeof command !== 'object' || Array.isArray(command) || !['ON', 'OFF'].includes(command.action)) {
    log('Comando inválido ignorado: action deve ser ON ou OFF');
    return;
  }
  state = command.action;
  publishState();
});

client.on('reconnect', () => log('Tentando reconectar ao broker'));
client.on('offline', () => log('Sem conexão com o broker'));
client.on('close', () => log('Conexão encerrada'));
client.on('error', (error) => log(`Erro MQTT: ${error.message}`));

const interval = setInterval(publishReadings, 5000);

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  clearInterval(interval);
  log(`Encerrando simulador (${signal})`);
  const timeout = setTimeout(() => client.end(true), 3000);
  client.end(false, () => {
    clearTimeout(timeout);
    log('Cliente MQTT encerrado');
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
