import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { ScreenLayout } from '../components/ScreenLayout';
import { SensorCard } from '../components/SensorCard';
import { useIoT } from '../services/IoTContext';
import { formatTime } from '../themes/colors';

export function DashboardScreen() {
  const { colors, connection, temperature, humidity, lamp, connect, sendCommand, saving, publishing, awaitingConfirmation } = useIoT();
  const disabled = connection.status !== 'conectado' || saving || publishing;
  return (
    <ScreenLayout>
      <Text style={{ color: colors.muted }}>FIAP · RM 556013 · Monitoramento em tempo real</Text>
      <ConnectionStatus connection={connection} onReconnect={connect} disabled={saving} />
      <SensorCard title="Temperatura" unit="°C" reading={temperature} />
      <SensorCard title="Umidade" unit="%" reading={humidity} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Lâmpada</Text>
        <Text style={[styles.state, { color: lamp?.value === 'ON' ? colors.success : colors.text }]}>{lamp ? lamp.value === 'ON' ? 'Ligada' : 'Desligada' : 'Desconhecido'}</Text>
        <Text style={{ color: colors.muted }}>{lamp ? `Estado recebido às ${formatTime(lamp.timestamp)}` : 'Aguardando o primeiro estado do dispositivo'}</Text>
        <AppButton title={publishing ? 'Enviando…' : 'Ligar'} onPress={() => { void sendCommand('ON'); }} disabled={disabled} />
        <AppButton title="Desligar" variant="secondary" onPress={() => { void sendCommand('OFF'); }} disabled={disabled} />
        {connection.status !== 'conectado' ? <Text style={{ color: colors.muted }}>Conecte-se ao broker para enviar comandos.</Text> : null}
        {saving ? <Text style={{ color: colors.muted }}>Aguarde o salvamento das configurações.</Text> : null}
        {awaitingConfirmation ? <Text style={{ color: colors.warning }}>Comando enviado, aguardando confirmação do dispositivo</Text> : null}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 14 },
  heading: { fontSize: 18, fontWeight: '600' },
  state: { fontSize: 28, fontWeight: '700' },
});
