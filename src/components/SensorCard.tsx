import { StyleSheet, Text, View } from 'react-native';

import { useIoT } from '../services/IoTContext';
import { formatTime } from '../themes/colors';
import type { SensorReading } from '../types/iot';

export function SensorCard({ title, unit, reading }: { title: string; unit: string; reading: SensorReading | null }) {
  const { colors } = useIoT();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{reading ? `${reading.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}` : '—'}</Text>
      <Text style={{ color: colors.muted }}>{reading ? `Última leitura válida às ${formatTime(reading.timestamp)}` : 'Aguardando a primeira leitura válida'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderWidth: 1, borderRadius: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: '600' },
  value: { fontSize: 34, fontWeight: '700' },
});
