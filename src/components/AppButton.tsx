import { Pressable, StyleSheet, Text } from 'react-native';

import { useIoT } from '../services/IoTContext';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({ title, onPress, disabled = false, variant = 'primary' }: Props) {
  const { colors } = useIoT();
  const background = disabled ? colors.disabled : variant === 'primary' ? colors.primary : variant === 'danger' ? colors.errorSurface : colors.surface;
  const foreground = disabled ? colors.muted : variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.error : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: disabled ? colors.disabled : variant === 'secondary' ? colors.border : background, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[styles.label, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
