import type { HistoryEntry, ParsedMessage, PendingCommand } from '../types/iot';
import { MQTT_TOPICS, type LampState, type MqttMessage } from '../types/mqtt';

export function observeCommandState(command: PendingCommand | null, state: LampState): boolean {
  if (!command || command.action !== state) return false;
  command.confirmed = true;
  return true;
}

export function parseMessage(message: MqttMessage): ParsedMessage | null {
  try {
    const data: unknown = JSON.parse(message.payload);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (message.topic === MQTT_TOPICS.lampState) {
      if ('state' in data && (data.state === 'ON' || data.state === 'OFF')) {
        return { kind: 'lamp', value: data.state };
      }
      return null;
    }
    if (!('value' in data) || typeof data.value !== 'number' || !Number.isFinite(data.value)) return null;
    if (message.topic === MQTT_TOPICS.temperature) return { kind: 'temperature', value: data.value };
    if (message.topic === MQTT_TOPICS.humidity) return { kind: 'humidity', value: data.value };
    return null;
  } catch {
    return null;
  }
}

export function appendHistory(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, 10);
}
