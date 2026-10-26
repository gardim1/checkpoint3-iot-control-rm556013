import { StyleSheet, Text, View } from 'react-native';

import { MessageItem } from '../components/MessageItem';
import { ScreenLayout } from '../components/ScreenLayout';
import { useIoT } from '../services/IoTContext';

export function HistoryScreen() {
  const { colors, history } = useIoT();
  return (
    <ScreenLayout>
      <Text style={{ color: colors.muted }}>Até 10 mensagens enviadas e recebidas. As mais recentes aparecem primeiro.</Text>
      {history.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Nenhuma mensagem ainda</Text>
          <Text style={{ color: colors.muted }}>Conecte-se ao broker para receber dados. Os comandos aparecerão aqui depois de confirmados pelo broker.</Text>
        </View>
      ) : history.map((entry) => <MessageItem key={entry.id} entry={entry} />)}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 24, borderWidth: 1, borderRadius: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
});
