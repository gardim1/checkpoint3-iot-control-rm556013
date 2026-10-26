import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { IoTProvider, useIoT } from '../services/IoTContext';
import { AppButton } from './AppButton';

type TabParams = { Dashboard: undefined; Histórico: undefined; Configurações: undefined };
const Tabs = createBottomTabNavigator<TabParams>();

function AppNavigation() {
  const { colors, preferences, preferenceError, retryPreferences } = useIoT();
  const dark = preferences?.theme === 'dark';
  if (!preferences) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 28, gap: 20 }}>
        <StatusBar style="dark" />
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>IoT Control</Text>
        {preferenceError ? <>
          <Text style={{ color: colors.error, textAlign: 'center' }}>{preferenceError}</Text>
          <AppButton title="Tentar novamente" onPress={retryPreferences} />
        </> : <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Carregando preferências…</Text>
        </>}
      </View>
    );
  }
  const baseTheme = dark ? DarkTheme : DefaultTheme;
  const theme = { ...baseTheme, colors: { ...baseTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.error } };
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs.Navigator screenOptions={{
        headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}>
        <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'IoT Control', tabBarLabel: 'Dashboard' }} />
        <Tabs.Screen name="Histórico" component={HistoryScreen} />
        <Tabs.Screen name="Configurações" component={SettingsScreen} />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}

export function IoTApp() {
  return <IoTProvider><AppNavigation /></IoTProvider>;
}
