import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { Itinerary } from "./types";
import { humanDate } from "./utils";

/**
 * Push / local notification helpers (expo-notifications). On Android we create a
 * high-importance channel. We use scheduled LOCAL notifications for trip
 * reminders (works offline, no server needed); the same registration also
 * returns an Expo push token so a backend can later send remote pushes.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Voyage AI",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C5CE7",
    });
  }

  if (!Device.isDevice) return null; // push tokens require a physical device

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Voyage AI",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#6C5CE7",
    });
  }
  return status === "granted";
}

/** Fire an immediate confirmation notification. */
export async function notifyNow(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

/**
 * Schedule a reminder for a saved trip. If the trip has a start date in the
 * future we schedule for 9am the day before; otherwise we send a gentle
 * "ready to explore?" nudge shortly after saving (demo-friendly).
 */
export async function scheduleTripReminder(trip: Itinerary): Promise<string> {
  const first = trip.days[0]?.date;
  let trigger: Notifications.NotificationTriggerInput;
  let body: string;

  if (first) {
    const start = new Date(first);
    const remindAt = new Date(start);
    remindAt.setDate(remindAt.getDate() - 1);
    remindAt.setHours(9, 0, 0, 0);
    if (remindAt.getTime() > Date.now()) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remindAt,
      };
      body = `Your ${trip.destination} trip starts ${humanDate(first)} — your plan is ready offline.`;
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      };
      body = `Your ${trip.destination} plan is saved and available offline. Have a great trip!`;
    }
  } else {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    };
    body = `Your ${trip.destination} plan is saved and available offline. Tap to explore.`;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `✈️ ${trip.destination}`,
      body,
      data: { tripId: trip.id },
    },
    trigger,
  });
}
