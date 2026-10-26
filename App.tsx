import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { mqttService } from './src/services/mqttService';
import { DEFAULT_BROKER_URL, type LampState, type MqttConnectionState, type MqttMessage } from './src/types/mqtt';

export default function App() {
  const [connection, setConnection] = useState<MqttConnectionState>({ status: 'desconectado' });
  const [message, setMessage] = useState<MqttMessage | null>(null);
  const [publication, setPublication] = useState('');

  useEffect(() => {
    const removeStatusListener = mqttService.onStatus(setConnection);
    const removeMessageListener = mqttService.onMessage(setMessage);
    mqttService.connect();
    return () => {
      removeStatusListener();
      removeMessageListener();
      mqttService.disconnect();
    };
  }, []);

  const sendCommand = (action: LampState) => {
    setPublication('Enviando comando…');
    mqttService.publish(action)
      .then(() => setPublication('Comando confirmado pelo broker.'))
      .catch((error: unknown) => setPublication(error instanceof Error ? error.message : 'Falha ao publicar.'));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>IoT Control</Text>
      <Text>Teste de conexão MQTT</Text>
      <Text selectable>{DEFAULT_BROKER_URL}</Text>
      <Text style={styles.status}>Status: {connection.status}</Text>
      {connection.error ? <Text style={styles.error}>{connection.error}</Text> : null}
      <Button title="Conectar" onPress={() => mqttService.connect()} disabled={connection.status === 'conectando' || connection.status === 'conectado'} />
      <Button title="Desconectar" onPress={() => mqttService.disconnect()} disabled={connection.status === 'desconectado'} />
      <View style={styles.commands}>
        <Button title="Ligar lâmpada" onPress={() => sendCommand('ON')} disabled={connection.status !== 'conectado'} />
        <Button title="Desligar lâmpada" onPress={() => sendCommand('OFF')} disabled={connection.status !== 'conectado'} />
      </View>
      {publication ? <Text>{publication}</Text> : null}
      <Text style={styles.status}>Última mensagem</Text>
      <Text selectable>{message ? `${message.topic}\n${message.payload}` : 'Aguardando dados do simulador…'}</Text>
      <StatusBar style="dark" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 64,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#b91c1c',
  },
  commands: {
    gap: 12,
  },
});
