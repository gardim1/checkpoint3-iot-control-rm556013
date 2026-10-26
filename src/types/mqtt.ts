export const DEFAULT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export const MQTT_TOPICS = {
  temperature: 'fiap/3espx/rm556013/sensor/temperatura',
  humidity: 'fiap/3espx/rm556013/sensor/umidade',
  lampCommand: 'fiap/3espx/rm556013/lampada/comando',
  lampState: 'fiap/3espx/rm556013/lampada/estado',
} as const;

export type SubscriptionTopic =
  | typeof MQTT_TOPICS.temperature
  | typeof MQTT_TOPICS.humidity
  | typeof MQTT_TOPICS.lampState;

export type LampState = 'ON' | 'OFF';

export type ConnectionStatus =
  | 'desconectado'
  | 'conectando'
  | 'conectado'
  | 'erro';

export type MqttConnectionState = {
  status: ConnectionStatus;
  error?: string;
};

export type MqttMessage = {
  topic: SubscriptionTopic;
  payload: string;
};
