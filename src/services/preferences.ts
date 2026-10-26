import type { Preferences, ThemeName } from '../types/iot';
import { DEFAULT_BROKER_URL } from '../types/mqtt';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export class PreferencesStorage {
  constructor(private readonly storage: StorageAdapter) {}

  async load(): Promise<Preferences> {
    try {
      const [brokerUrl, theme] = await Promise.all([
        this.storage.getItem('brokerUrl'),
        this.storage.getItem('theme'),
      ]);
      return { brokerUrl: brokerUrl ?? DEFAULT_BROKER_URL, theme: theme === 'dark' ? 'dark' : 'light' };
    } catch {
      throw new Error('Não foi possível carregar as preferências. Tente novamente.');
    }
  }

  async saveBrokerUrl(url: string): Promise<void> {
    await this.storage.setItem('brokerUrl', url);
  }

  async saveTheme(theme: ThemeName): Promise<void> {
    await this.storage.setItem('theme', theme);
  }
}
