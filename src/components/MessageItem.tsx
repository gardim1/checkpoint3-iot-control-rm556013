import { StyleSheet, Text, View } from 'react-native';

import { useIoT } from '../services/IoTContext';
import { formatTime } from '../themes/colors';
import type { HistoryEntry } from '../types/iot';

export function MessageItem({ entry }: { entry: HistoryEntry }) {
  const { colors } = useIoT();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <Text style={{ color: entry.direction === 'enviada' ? colors.primary : colors.success, fontWeight: '700' }}>{entry.direction === 'enviada' ? 'Enviada' : 'Recebida'}</Text>
        <Text style={{ color: colors.muted }}>{formatTime(entry.timestamp)}</Text>
      </View>
      <Text selectable style={{ color: colors.text, fontWeight: '600' }}>{entry.topic}</Text>
      <Text selectable style={{ color: colors.text }}>{entry.payload}</Text>
      {entry.invalid ? <Text style={{ color: colors.error }}>Mensagem inválida</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 14, gap: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
