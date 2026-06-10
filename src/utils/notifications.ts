import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { API_BASE_URL } from '../config/api';

/**
 * Request notification permission for Android 13+
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'FreshRush Notification Permission',
        message: 'We need permission to send you order updates.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

/**
 * Create notification channels for Android
 */
export async function createNotificationChannels() {
  await notifee.createChannel({
    id: 'order_updates',
    name: 'Order Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

/**
 * Register FCM token with the backend
 */
export async function registerFCMToken(userToken: string, fcmToken: string) {
  try {
    console.log('[FCM] Registering token with backend...', fcmToken);
    const response = await fetch(`${API_BASE_URL}/user/fcm-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ token: fcmToken }),
    });
    
    if (response.ok) {
      console.log('[FCM] Token registered with backend successfully');
    } else {
      const errorText = await response.text();
      console.error('[FCM] Failed to register token with backend:', response.status, errorText);
    }
  } catch (error) {
    console.error('[FCM] Error registering token with backend:', error);
  }
}

/**
 * Setup FCM listeners
 */
export function setupFCMListeners(onNotification: (data: any) => void) {
  console.log('[FCM] Setting up listeners...');
  
  // Handle foreground messages
  const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
    console.log('[FCM] Foreground Message received:', JSON.stringify(remoteMessage, null, 2));
    
    try {
      // Display local notification
      await notifee.displayNotification({
        title: remoteMessage.notification?.title || remoteMessage.data?.title || 'Order Update',
        body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
        android: {
          channelId: 'order_updates',
          pressAction: { id: 'default' },
        },
        data: remoteMessage.data,
      });
      console.log('[FCM] Foreground notification displayed via Notifee');
    } catch (err) {
      console.error('[FCM] Error displaying foreground notification:', err);
    }
  });

  // Handle foreground notification banner clicks
  const unsubscribeOnForegroundEvent = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      console.log('[Notifee] Foreground notification pressed:', detail.notification.data);
      if (onNotification) onNotification(detail.notification.data);
    }
  });

  // Handle background/quit state notification clicks
  const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[FCM] Notification caused app to open from background:', remoteMessage);
    if (onNotification) onNotification(remoteMessage.data);
  });

  // Check if app was opened from a quit state via notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FCM] App opened from quit state via notification:', remoteMessage);
        if (onNotification) onNotification(remoteMessage.data);
      }
    });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnForegroundEvent();
    unsubscribeOnNotificationOpenedApp();
  };
}
