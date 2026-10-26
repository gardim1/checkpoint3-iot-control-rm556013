import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';

import { validateBrokerUrl } from './brokerUrl';

import {
  DEFAULT_BROKER_URL,
  MQTT_TOPICS,
  type LampState,
  type MqttConnectionState,
  type MqttMessage,
  type SubscriptionTopic,
} from '../types/mqtt';

const subscriptionTopics: SubscriptionTopic[] = [
  MQTT_TOPICS.temperature,
  MQTT_TOPICS.humidity,
  MQTT_TOPICS.lampState,
];

export class MqttService {
  private client: MqttClient | null = null;
  private state: MqttConnectionState = { status: 'desconectado' };
  private statusListeners = new Set<(state: MqttConnectionState) => void>();
  private messageListeners = new Set<(message: MqttMessage) => void>();
  private generation = 0;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingPublications = new Set<() => void>();

  constructor(private readonly createClient: (url: string, options: IClientOptions) => MqttClient = mqtt.connect) {}

  onStatus(listener: (state: MqttConnectionState) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.state);
    return () => { this.statusListeners.delete(listener); };
  }

  onMessage(listener: (message: MqttMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => { this.messageListeners.delete(listener); };
  }

  private setStatus(state: MqttConnectionState): void {
    this.state = state;
    this.statusListeners.forEach((listener) => listener(state));
  }

  private releaseClient(): void {
    const client = this.client;
    this.client = null;
    this.generation++;
    if (this.connectionTimer) clearTimeout(this.connectionTimer);
    this.connectionTimer = null;
    this.pendingPublications.forEach((cancel) => cancel());
    this.pendingPublications.clear();
    if (!client) return;
    try {
      if (client.connected) client.unsubscribe(subscriptionTopics);
    } catch {}
    try {
      client.end(true, () => { client.removeAllListeners(); });
    } catch {
      client.removeAllListeners();
    }
  }

  private fail(message: string): void {
    this.releaseClient();
    this.setStatus({ status: 'erro', error: message });
  }

  connect(url = DEFAULT_BROKER_URL): void {
    this.releaseClient();
    let brokerUrl: string;
    try {
      brokerUrl = validateBrokerUrl(url);
    } catch (error) {
      this.setStatus({ status: 'erro', error: error instanceof Error ? error.message : 'URL inválida.' });
      return;
    }
    this.setStatus({ status: 'conectando' });
    const generation = this.generation;
    try {
      const client = this.createClient(brokerUrl, {
        clientId: `iotcontrol-app-rm556013-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: 0,
        connectTimeout: 10000,
        queueQoSZero: false,
        clean: true,
        resubscribe: false,
        timerVariant: 'native',
      });
      this.client = client;
      let wasConnected = false;
      const active = () => this.client === client && this.generation === generation;
      const connectionError = () => {
        if (active()) this.fail(wasConnected ? 'Conexão perdida' : 'Não foi possível conectar ao broker. Verifique a URL e a rede.');
      };
      this.connectionTimer = setTimeout(() => {
        if (active()) this.fail('Tempo limite de conexão. Verifique o broker e a rede e tente novamente.');
      }, 10000);

      client.on('connect', () => {
        if (!active()) return;
        try {
          client.subscribe(subscriptionTopics, { qos: 1 }, (error, grants) => {
            if (!active()) return;
            if (error || !grants || !subscriptionTopics.every((topic) => grants.some((grant) => grant.topic === topic && grant.qos !== 128))) {
              this.fail('Não foi possível assinar os tópicos do dispositivo.');
              return;
            }
            if (this.connectionTimer) clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
            wasConnected = true;
            this.setStatus({ status: 'conectado' });
          });
        } catch {
          this.fail('Não foi possível assinar os tópicos do dispositivo.');
        }
      });

      client.on('message', (topic, payload) => {
        if (!active()) return;
        const subscribedTopic = subscriptionTopics.find((entry) => entry === topic);
        if (!subscribedTopic) return;
        const message: MqttMessage = { topic: subscribedTopic, payload: payload.toString() };
        this.messageListeners.forEach((listener) => listener(message));
      });

      client.on('error', connectionError);
      client.on('close', connectionError);
      client.on('offline', connectionError);
      client.on('disconnect', connectionError);
    } catch {
      this.fail('Não foi possível conectar ao broker. Verifique a URL e a rede.');
    }
  }

  publish(action: LampState): Promise<void> {
    const client = this.client;
    if (!client?.connected || this.state.status !== 'conectado') {
      return Promise.reject(new Error('Conecte ao broker antes de enviar comandos.'));
    }

    const generation = this.generation;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pendingPublications.delete(cancel);
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => finish(new Error('Conexão encerrada antes de confirmar o comando.'));
      const timer = setTimeout(() => finish(new Error('Tempo limite ao enviar o comando. Tente novamente.')), 10000);
      this.pendingPublications.add(cancel);
      try {
        client.publish(MQTT_TOPICS.lampCommand, JSON.stringify({ action }), { qos: 1, retain: false }, (error) => {
          if (this.client !== client || this.generation !== generation) { cancel(); return; }
          finish(error ? new Error(`Falha ao publicar o comando: ${error.message}`) : undefined);
        });
      } catch {
        finish(new Error('Não foi possível enviar o comando. Tente novamente.'));
      }
    });
  }

  disconnect(): void {
    this.releaseClient();
    this.setStatus({ status: 'desconectado' });
  }
}

export const mqttService = new MqttService();
