import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('watering', {
      name: 'Zalévání kytek',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  return true;
};

/**
 * Naplánuje notifikace pro kytku na příští 4 týdny.
 * Vrací pole notification ID.
 */
export const schedulePlantNotifications = async (plant, hour = 8) => {
  // Zruš existující notifikace kytky
  if (plant.notificationIds && plant.notificationIds.length > 0) {
    await cancelPlantNotifications(plant.notificationIds);
  }

  const ids = [];
  const now = new Date();

  if (plant.scheduleType === 'interval') {
    // Každých X dní
    const interval = plant.wateringInterval || 7;
    for (let i = 1; i <= 8; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + interval * i);
      date.setHours(hour, 0, 0, 0);

      if (date > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '💧 Čas zalévat!',
            body: `${plant.name} potřebuje zalit!`,
            data: { plantId: plant.id },
            channelId: 'watering',
          },
          trigger: { date },
        });
        ids.push(id);
      }
    }
  } else {
    // Konkrétní dny v týdnu (wateringDays: 0=Ne, 1=Po, ..., 6=So)
    const days = plant.wateringDays || [];
    if (days.length === 0) return ids;

    for (let week = 0; week < 4; week++) {
      for (const dayOfWeek of days) {
        const date = new Date(now);
        // Najdi příští výskyt tohoto dne
        const currentDay = date.getDay();
        let daysUntil = dayOfWeek - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        daysUntil += week * 7;

        date.setDate(date.getDate() + daysUntil);
        date.setHours(hour, 0, 0, 0);

        if (date > now) {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: '💧 Čas zalévat!',
              body: `${plant.name} potřebuje zalit!`,
              data: { plantId: plant.id },
              channelId: 'watering',
            },
            trigger: { date },
          });
          ids.push(id);
        }
      }
    }
  }

  return ids;
};

export const cancelPlantNotifications = async (ids = []) => {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore if already cancelled
    }
  }
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
