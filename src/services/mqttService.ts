import { connect, type MqttClient } from 'mqtt';

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

class MqttService {
  private client: MqttClient | null = null;
  private state: MqttConnectionState = { status: 'desconectado' };
  private statusListeners = new Set<(state: MqttConnectionState) => void>();
  private messageListeners = new Set<(message: MqttMessage) => void>();

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

  connect(url = DEFAULT_BROKER_URL): void {
    this.disconnect();
    this.setStatus({ status: 'conectando' });

    try {
      const client = connect(url, {
        clientId: `iotcontrol-app-rm556013-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: 0,
        connectTimeout: 10000,
        queueQoSZero: false,
        clean: true,
        resubscribe: false,
        timerVariant: 'native',
      });
      this.client = client;

      client.on('connect', () => {
        if (this.client !== client) return;
        client.subscribe(subscriptionTopics, { qos: 1 }, (error, grants) => {
          if (this.client !== client) return;
          if (error || !grants || grants.some((grant) => grant.qos === 128)) {
            this.setStatus({ status: 'erro', error: error?.message ?? 'Assinatura dos tópicos recusada.' });
            client.end(true);
            return;
          }
          this.setStatus({ status: 'conectado' });
        });
      });

      client.on('message', (topic, payload) => {
        if (this.client !== client) return;
        const subscribedTopic = subscriptionTopics.find((entry) => entry === topic);
        if (!subscribedTopic) return;
        const message: MqttMessage = { topic: subscribedTopic, payload: payload.toString() };
        this.messageListeners.forEach((listener) => listener(message));
      });

      client.on('error', (error) => {
        if (this.client !== client) return;
        this.setStatus({ status: 'erro', error: error.message });
        client.end(true);
      });

      client.on('close', () => {
        if (this.client !== client || this.state.status === 'erro') return;
        this.setStatus({ status: 'desconectado' });
      });
    } catch (error) {
      this.setStatus({ status: 'erro', error: error instanceof Error ? error.message : 'Falha ao conectar.' });
    }
  }

  publish(action: LampState): Promise<void> {
    const client = this.client;
    if (!client?.connected || this.state.status !== 'conectado') {
      return Promise.reject(new Error('Conecte ao broker antes de enviar comandos.'));
    }

    return new Promise((resolve, reject) => {
      client.publish(MQTT_TOPICS.lampCommand, JSON.stringify({ action }), { qos: 1, retain: false }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  disconnect(): void {
    const client = this.client;
    this.client = null;
    client?.end(true);
    this.setStatus({ status: 'desconectado' });
  }
}

export const mqttService = new MqttService();
