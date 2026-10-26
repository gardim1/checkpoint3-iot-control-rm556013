import AsyncStorage from '@react-native-async-storage/async-storage';

import { PreferencesStorage } from './preferences';

export const storageService = new PreferencesStorage(AsyncStorage);
