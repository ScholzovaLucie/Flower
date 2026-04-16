import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { savePlants, loadPlants, loadSettings, saveSettings } from '../services/storage';
import { schedulePlantNotifications, cancelPlantNotifications } from '../services/notifications';

const PlantContext = createContext(null);

// ─── Health calculation ────────────────────────────────────────────────────

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

/**
 * Vypočítá zdraví kytky (0-100).
 */
export const calculatePlantHealth = (plant) => {
  if (!plant.lastWatered) return 15; // Nikdy nezalitá

  const now = new Date();
  const lastWateredDate = new Date(plant.lastWatered);
  const daysSince = (now - lastWateredDate) / (1000 * 60 * 60 * 24);

  let expectedInterval;
  if (plant.scheduleType === 'interval') {
    expectedInterval = Math.max(1, plant.wateringInterval || 7);
  } else {
    const daysCount = (plant.wateringDays || []).length;
    expectedInterval = daysCount > 0 ? 7 / daysCount : 7;
  }

  if (daysSince <= expectedInterval * 0.6) return 100;
  if (daysSince <= expectedInterval) return Math.round(lerp(70, 100, 1 - (daysSince - expectedInterval * 0.6) / (expectedInterval * 0.4)));
  if (daysSince <= expectedInterval * 1.6) return Math.round(lerp(40, 70, 1 - (daysSince - expectedInterval) / (expectedInterval * 0.6)));
  if (daysSince <= expectedInterval * 2.5) return Math.round(lerp(15, 40, 1 - (daysSince - expectedInterval * 1.6) / (expectedInterval * 0.9)));
  return 5;
};

/**
 * Vypočítá celkové zdraví zahrady (0-100).
 */
export const calculateGardenHealth = (plants) => {
  if (!plants || plants.length === 0) return 100;
  const avg = plants.reduce((sum, p) => sum + calculatePlantHealth(p), 0) / plants.length;
  return Math.round(avg);
};

/**
 * Vrátí datum příštího zalití.
 */
export const getNextWateringDate = (plant) => {
  if (!plant.lastWatered) return new Date();

  const last = new Date(plant.lastWatered);

  if (plant.scheduleType === 'interval') {
    const next = new Date(last);
    next.setDate(next.getDate() + (plant.wateringInterval || 7));
    return next;
  } else {
    // Najdi příští den v týdnu
    const days = (plant.wateringDays || []).slice().sort((a, b) => a - b);
    if (days.length === 0) return null;

    const now = new Date();
    const todayDay = now.getDay();

    // Zkus najít den v tento nebo příští týden
    for (let offset = 1; offset <= 8; offset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + offset);
      if (days.includes(checkDate.getDay())) return checkDate;
    }
    return null;
  }
};

/**
 * Vrátí true pokud kytka potřebuje zalit dnes.
 */
export const needsWateringToday = (plant) => {
  const health = calculatePlantHealth(plant);
  if (health < 40) return true; // Přesčasová

  if (!plant.lastWatered) return true;

  if (plant.scheduleType === 'days') {
    const today = new Date().getDay();
    return (plant.wateringDays || []).includes(today);
  }

  const next = getNextWateringDate(plant);
  if (!next) return false;
  const now = new Date();
  const diff = (next - now) / (1000 * 60 * 60 * 24);
  return diff <= 0.5;
};

// ─── Provider ──────────────────────────────────────────────────────────────

export function PlantProvider({ children }) {
  const [plants, setPlants] = useState([]);
  const [settings, setSettings] = useState({ apiKey: '', notificationHour: 8 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [loadedPlants, loadedSettings] = await Promise.all([loadPlants(), loadSettings()]);
      setPlants(loadedPlants);
      setSettings(loadedSettings);
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (newPlants) => {
    setPlants(newPlants);
    await savePlants(newPlants);
  }, []);

  const addPlant = useCallback(async (plantData) => {
    const plant = {
      ...plantData,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
      lastWatered: null,
      wateringHistory: [],
      notificationIds: [],
    };

    try {
      const ids = await schedulePlantNotifications(plant, settings.notificationHour);
      plant.notificationIds = ids;
    } catch (e) {
      console.warn('Nepodařilo se naplánovat notifikace:', e);
    }

    const newPlants = [...plants, plant];
    await persist(newPlants);
    return plant;
  }, [plants, persist, settings.notificationHour]);

  const updatePlant = useCallback(async (id, updates) => {
    const idx = plants.findIndex((p) => p.id === id);
    if (idx === -1) return;

    const updated = { ...plants[idx], ...updates };

    // Přeplánuj notifikace pokud se změnil rozvrh
    if (updates.scheduleType || updates.wateringDays || updates.wateringInterval) {
      try {
        await cancelPlantNotifications(updated.notificationIds || []);
        const ids = await schedulePlantNotifications(updated, settings.notificationHour);
        updated.notificationIds = ids;
      } catch (e) {
        console.warn('Nepodařilo se přeplánovat notifikace:', e);
      }
    }

    const newPlants = [...plants];
    newPlants[idx] = updated;
    await persist(newPlants);
  }, [plants, persist, settings.notificationHour]);

  const removePlant = useCallback(async (id) => {
    const plant = plants.find((p) => p.id === id);
    if (!plant) return;

    // Smaž foto
    if (plant.photoUri && plant.photoUri.startsWith(FileSystem.documentDirectory)) {
      try { await FileSystem.deleteAsync(plant.photoUri, { idempotent: true }); } catch {}
    }

    // Zruš notifikace
    try { await cancelPlantNotifications(plant.notificationIds || []); } catch {}

    await persist(plants.filter((p) => p.id !== id));
  }, [plants, persist]);

  const waterPlant = useCallback(async (id, note = '') => {
    const idx = plants.findIndex((p) => p.id === id);
    if (idx === -1) return;

    const now = new Date().toISOString();
    const history = [...(plants[idx].wateringHistory || []), { date: now, note }];
    // Zachovej max 50 záznamů
    const trimmed = history.slice(-50);

    const updated = { ...plants[idx], lastWatered: now, wateringHistory: trimmed };

    // Přeplánuj notifikace od dnešního dne
    try {
      await cancelPlantNotifications(updated.notificationIds || []);
      const ids = await schedulePlantNotifications(updated, settings.notificationHour);
      updated.notificationIds = ids;
    } catch (e) {
      console.warn('Nepodařilo se přeplánovat notifikace:', e);
    }

    const newPlants = [...plants];
    newPlants[idx] = updated;
    await persist(newPlants);
  }, [plants, persist, settings.notificationHour]);

  const updateSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await saveSettings(merged);
  }, [settings]);

  const gardenHealth = calculateGardenHealth(plants);

  return (
    <PlantContext.Provider
      value={{
        plants,
        loading,
        settings,
        gardenHealth,
        addPlant,
        updatePlant,
        removePlant,
        waterPlant,
        updateSettings,
        calculatePlantHealth,
        needsWateringToday,
        getNextWateringDate,
      }}
    >
      {children}
    </PlantContext.Provider>
  );
}

export const usePlants = () => {
  const ctx = useContext(PlantContext);
  if (!ctx) throw new Error('usePlants must be used within PlantProvider');
  return ctx;
};
