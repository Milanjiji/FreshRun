import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

console.log('[FCM] index.js loaded, registering background handler...');

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background Message received:', JSON.stringify(remoteMessage, null, 2));
  
  try {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || remoteMessage.data?.title || 'Order Update',
      body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
      android: {
        channelId: 'order_updates',
        pressAction: { id: 'default' },
      },
      data: remoteMessage.data,
    });
    console.log('[FCM] Background notification displayed via Notifee');
  } catch (err) {
    console.error('[FCM] Error displaying background notification:', err);
  }
});

import CodePush from '@revopush/react-native-code-push';

const CodePushApp = CodePush({
  checkFrequency: CodePush.CheckFrequency.ON_APP_START,
  installMode: CodePush.InstallMode.ON_NEXT_RESTART,
})(App);

AppRegistry.registerComponent(appName, () => CodePushApp);
