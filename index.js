import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message handled in the background!', remoteMessage);
  
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'Order Update',
    body: remoteMessage.notification?.body || '',
    android: {
      channelId: 'order_updates',
      pressAction: { id: 'default' },
    },
    data: remoteMessage.data,
  });
});

AppRegistry.registerComponent(appName, () => App);
