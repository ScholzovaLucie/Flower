import AsyncStorage from '@react-native-async-storage/async-storage';

const PLANTS_KEY = '@plants';
const SETTINGS_KEY = '@settings';

export const savePlants = async (plants) => {
  try {
    await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
  } catch (e) {
    console.error('Chyba při ukládání kytek:', e);
  }
};

export const loadPlants = async () => {
  try {
    const data = await AsyncStorage.getItem(PLANTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Chyba při načítání kytek:', e);
    return [];
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Chyba při ukládání nastavení:', e);
  }
};

export const loadSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { apiKey: '', notificationHour: 8 };
  } catch (e) {
    console.error('Chyba při načítání nastavení:', e);
    return { apiKey: '', notificationHour: 8 };
  }
};
