import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ScreenLayout } from '../components/ScreenLayout';
import { useIoT } from '../services/IoTContext';

export function SettingsScreen() {
  const { colors, preferences, connection, saving, publishing, saveBrokerUrl, saveTheme, connect, disconnect } = useIoT();
  const [url, setUrl] = useState(preferences?.brokerUrl ?? '');
  useEffect(() => { setUrl(preferences?.brokerUrl ?? ''); }, [preferences?.brokerUrl]);
  const active = connection.status === 'conectado' || connection.status === 'conectando';
  const busy = saving || publishing;
  return (
    <ScreenLayout>
      <ConnectionStatus connection={connection} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Broker MQTT</Text>
        <Text style={{ color: colors.muted }}>Use uma URL WebSocket com ws:// ou wss://, incluindo a porta e o caminho quando necessário.</Text>
        <Text style={[styles.label, { color: colors.text }]}>URL do broker</Text>
        <TextInput accessibilityLabel="URL do broker" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy}
          placeholder="wss://broker.exemplo:8084/mqtt" placeholderTextColor={colors.muted} selectionColor={colors.primary}
          style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]} />
        <AppButton title={saving ? 'Salvando…' : 'Salvar e aplicar'} onPress={() => { void saveBrokerUrl(url); }} disabled={busy} />
        <Text selectable style={{ color: colors.muted }}>URL em uso: {preferences?.brokerUrl}</Text>
        {active ? <AppButton title="Desconectar" variant="danger" onPress={disconnect} disabled={busy} /> : <>
          <AppButton title="Conectar" onPress={connect} disabled={busy} />
          <AppButton title="Reconectar" variant="secondary" onPress={connect} disabled={busy} />
        </>}
        <Text style={{ color: colors.muted }}>A reconexão é manual. Salvar uma URL reconecta se houver uma conexão ativa.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Aparência</Text>
        <View style={styles.themeRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.label, { color: colors.text }]}>Tema escuro</Text>
            <Text style={{ color: colors.muted }}>{preferences?.theme === 'dark' ? 'Escuro (Dark)' : 'Claro (Light)'}</Text>
          </View>
          <Switch accessibilityLabel="Tema escuro" value={preferences?.theme === 'dark'} disabled={busy}
            onValueChange={(value) => { void saveTheme(value ? 'dark' : 'light'); }}
            trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.surface} />
        </View>
        <Text style={{ color: colors.muted }}>O tema e a URL ficam salvos neste dispositivo. O histórico existe apenas durante esta sessão.</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 14, borderRadius: 16, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 16, fontWeight: '600' },
  input: { minHeight: 52, borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
