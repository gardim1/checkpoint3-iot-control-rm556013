import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { colors, type AppColors } from '../themes/colors';
import type { HistoryEntry, LampReading, Preferences, SensorReading, ThemeName } from '../types/iot';
import { MQTT_TOPICS, type LampState, type MqttConnectionState } from '../types/mqtt';
import { validateBrokerUrl } from './brokerUrl';
import { appendHistory, parseMessage } from './iotState';
import { mqttService } from './mqttService';
import { storageService } from './storageService';

type IoTContextValue = {
  preferences: Preferences | null;
  preferenceError: string | null;
  colors: AppColors;
  connection: MqttConnectionState;
  temperature: SensorReading | null;
  humidity: SensorReading | null;
  lamp: LampReading | null;
  history: HistoryEntry[];
  feedback: string | null;
  saving: boolean;
  publishing: boolean;
  awaitingConfirmation: boolean;
  retryPreferences: () => void;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (action: LampState) => Promise<void>;
  saveBrokerUrl: (url: string) => Promise<void>;
  saveTheme: (theme: ThemeName) => Promise<void>;
  clearFeedback: () => void;
};

const IoTContext = createContext<IoTContextValue | null>(null);

export function IoTProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [connection, setConnection] = useState<MqttConnectionState>({ status: 'desconectado' });
  const [temperature, setTemperature] = useState<SensorReading | null>(null);
  const [humidity, setHumidity] = useState<SensorReading | null>(null);
  const [lamp, setLamp] = useState<LampReading | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const mounted = useRef(false);
  const loadingGeneration = useRef(0);
  const preferencesRef = useRef<Preferences | null>(null);
  const connectionRef = useRef(connection);
  const savingRef = useRef(false);
  const publishingRef = useRef(false);
  const historyId = useRef(0);
  const lampRef = useRef<LampReading | null>(null);
  const lampRevision = useRef(0);
  const pendingAction = useRef<LampState | null>(null);

  const addHistory = useCallback((entry: Omit<HistoryEntry, 'id'>) => {
    const item = { ...entry, id: String(++historyId.current) };
    setHistory((current) => appendHistory(current, item));
  }, []);

  const loadPreferences = useCallback(async () => {
    const generation = ++loadingGeneration.current;
    setPreferenceError(null);
    try {
      const saved = await storageService.load();
      if (!mounted.current || generation !== loadingGeneration.current) return;
      preferencesRef.current = saved;
      setPreferences(saved);
      mqttService.connect(saved.brokerUrl);
    } catch (error) {
      if (mounted.current && generation === loadingGeneration.current) {
        setPreferenceError(error instanceof Error ? error.message : 'Não foi possível carregar as preferências.');
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const removeStatus = mqttService.onStatus((state) => {
      connectionRef.current = state;
      setConnection(state);
      if (state.status !== 'conectado') {
        pendingAction.current = null;
        setAwaitingConfirmation(false);
      }
    });
    const removeMessage = mqttService.onMessage((message) => {
      const timestamp = Date.now();
      const parsed = parseMessage(message);
      addHistory({ ...message, timestamp, direction: 'recebida', invalid: !parsed });
      if (!parsed) {
        setFeedback(`Mensagem inválida em ${message.topic}`);
        return;
      }
      if (parsed.kind === 'temperature') setTemperature({ value: parsed.value, timestamp });
      else if (parsed.kind === 'humidity') setHumidity({ value: parsed.value, timestamp });
      else {
        const reading = { value: parsed.value, timestamp };
        lampRef.current = reading;
        lampRevision.current++;
        setLamp(reading);
        if (pendingAction.current === parsed.value) {
          pendingAction.current = null;
          setAwaitingConfirmation(false);
          setFeedback(`Estado confirmado pelo dispositivo: lâmpada ${parsed.value === 'ON' ? 'ligada' : 'desligada'}.`);
        }
      }
    });
    void loadPreferences();
    return () => {
      mounted.current = false;
      loadingGeneration.current++;
      removeStatus();
      removeMessage();
      mqttService.disconnect();
    };
  }, [addHistory, loadPreferences]);

  const connect = () => {
    if (!preferencesRef.current || savingRef.current) return;
    setFeedback(null);
    mqttService.connect(preferencesRef.current.brokerUrl);
  };

  const disconnect = () => {
    if (savingRef.current) return;
    setFeedback(null);
    mqttService.disconnect();
  };

  const sendCommand = async (action: LampState) => {
    if (publishingRef.current || savingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setFeedback(null);
    const revision = lampRevision.current;
    pendingAction.current = action;
    try {
      await mqttService.publish(action);
      if (!mounted.current) return;
      addHistory({ topic: MQTT_TOPICS.lampCommand, payload: JSON.stringify({ action }), timestamp: Date.now(), direction: 'enviada' });
      const confirmed = lampRevision.current > revision && lampRef.current?.value === action;
      setAwaitingConfirmation(!confirmed);
      if (confirmed) {
        pendingAction.current = null;
        setFeedback(`Estado confirmado pelo dispositivo: lâmpada ${action === 'ON' ? 'ligada' : 'desligada'}.`);
      } else {
        setFeedback('Comando enviado, aguardando confirmação do dispositivo');
      }
    } catch (error) {
      pendingAction.current = null;
      if (mounted.current) {
        setAwaitingConfirmation(false);
        setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar o comando.');
      }
    } finally {
      publishingRef.current = false;
      if (mounted.current) setPublishing(false);
    }
  };

  const saveBrokerUrl = async (url: string) => {
    if (!preferencesRef.current || savingRef.current || publishingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const validUrl = validateBrokerUrl(url);
      const reconnect = connectionRef.current.status === 'conectado' || connectionRef.current.status === 'conectando';
      await storageService.saveBrokerUrl(validUrl);
      if (!mounted.current || !preferencesRef.current) return;
      const next = { ...preferencesRef.current, brokerUrl: validUrl };
      preferencesRef.current = next;
      setPreferences(next);
      mqttService.disconnect();
      if (reconnect) mqttService.connect(validUrl);
      setFeedback(reconnect ? 'URL salva. Conectando ao broker…' : 'URL salva. Toque em Conectar para iniciar.');
    } catch (error) {
      if (mounted.current) setFeedback(error instanceof Error && error.message.startsWith('URL inválida') ? error.message : 'Não foi possível salvar a URL. Tente novamente.');
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const saveTheme = async (theme: ThemeName) => {
    if (!preferencesRef.current || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await storageService.saveTheme(theme);
      if (!mounted.current || !preferencesRef.current) return;
      const next = { ...preferencesRef.current, theme };
      preferencesRef.current = next;
      setPreferences(next);
    } catch {
      if (mounted.current) setFeedback('Não foi possível salvar o tema. Tente novamente.');
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return (
    <IoTContext.Provider value={{
      preferences, preferenceError, colors: colors[preferences?.theme ?? 'light'], connection,
      temperature, humidity, lamp, history, feedback, saving, publishing, awaitingConfirmation,
      retryPreferences: () => { void loadPreferences(); }, connect, disconnect, sendCommand,
      saveBrokerUrl, saveTheme, clearFeedback: () => setFeedback(null),
    }}>
      {children}
    </IoTContext.Provider>
  );
}

export function useIoT(): IoTContextValue {
  const value = useContext(IoTContext);
  if (!value) throw new Error('useIoT precisa estar dentro de IoTProvider.');
  return value;
}
