import { StyleSheet, Text, View } from 'react-native';

import { useIoT } from '../services/IoTContext';
import type { MqttConnectionState } from '../types/mqtt';
import { AppButton } from './AppButton';

export function ConnectionStatus({ connection, onReconnect, disabled = false }: { connection: MqttConnectionState; onReconnect?: () => void; disabled?: boolean }) {
  const { colors } = useIoT();
  const connected = connection.status === 'conectado';
  const failed = connection.status === 'erro';
  const connecting = connection.status === 'conectando';
  const color = connected ? colors.success : failed ? colors.error : connecting ? colors.warning : colors.muted;
  const background = connected ? colors.successSurface : failed ? colors.errorSurface : connecting ? colors.warningSurface : colors.surface;
  const label = { conectado: 'Conectado', conectando: 'Conectando…', desconectado: 'Desconectado', erro: 'Erro de conexão' }[connection.status];
  return (
    <View style={[styles.card, { backgroundColor: background, borderColor: colors.border }]}>
      <Text style={[styles.title, { color }]} accessibilityLiveRegion="polite">{label}</Text>
      {connection.error ? <Text style={{ color: colors.error }}>{connection.error}</Text> : null}
      {onReconnect && (failed || connection.status === 'desconectado') ? <AppButton title="Reconectar" onPress={onReconnect} disabled={disabled} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, borderRadius: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
});
