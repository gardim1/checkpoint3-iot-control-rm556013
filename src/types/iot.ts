import type { LampState } from './mqtt';

export type ThemeName = 'light' | 'dark';

export type Preferences = { brokerUrl: string; theme: ThemeName };

export type SensorReading = { value: number; timestamp: number };

export type LampReading = { value: LampState; timestamp: number };

export type PendingCommand = { action: LampState; confirmed: boolean; acknowledged: boolean };

export type HistoryEntry = {
  id: string;
  topic: string;
  payload: string;
  timestamp: number;
  direction: 'recebida' | 'enviada';
  invalid?: boolean;
};

export type ParsedMessage =
  | { kind: 'temperature'; value: number }
  | { kind: 'humidity'; value: number }
  | { kind: 'lamp'; value: LampState };
