import type { ThemeName } from '../types/iot';

export type AppColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  error: string;
  errorSurface: string;
  disabled: string;
  input: string;
};

export const colors: Record<ThemeName, AppColors> = {
  light: {
    background: '#F2F5F8',
    surface: '#FFFFFF',
    text: '#17263B',
    muted: '#52647B',
    border: '#D6DFE9',
    primary: '#164FBC',
    onPrimary: '#FFFFFF',
    success: '#126441',
    successSurface: '#DDF5E8',
    warning: '#7A4800',
    warningSurface: '#FFF0CB',
    error: '#AA2232',
    errorSurface: '#FFE6E8',
    disabled: '#DCE3ED',
    input: '#FFFFFF',
  },
  dark: {
    background: '#0C1420',
    surface: '#162235',
    text: '#ECF2FA',
    muted: '#A6B6CD',
    border: '#314159',
    primary: '#94B9FF',
    onPrimary: '#10264D',
    success: '#83E2B3',
    successSurface: '#173C31',
    warning: '#FFD18B',
    warningSurface: '#44341F',
    error: '#FFABB4',
    errorSurface: '#452735',
    disabled: '#2B3A50',
    input: '#101C2D',
  },
};

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, '0')).join(':');
}
