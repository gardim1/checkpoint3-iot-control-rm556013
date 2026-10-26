import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useIoT } from '../services/IoTContext';
import { AppButton } from './AppButton';

export function ScreenLayout({ children }: { children: ReactNode }) {
  const { colors, feedback, clearFeedback } = useIoT();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {feedback ? (
        <View style={[styles.feedback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{feedback}</Text>
          <AppButton title="Fechar aviso" variant="secondary" onPress={clearFeedback} />
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16, flexGrow: 1 },
  feedback: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
});
