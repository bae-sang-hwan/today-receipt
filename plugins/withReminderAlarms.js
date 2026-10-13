const { withAndroidManifest } = require('expo/config-plugins');

// 매일 기록 알림(expo-notifications 로컬 알림)에 필요한 권한을 앱 매니페스트에 직접 넣는다.
// - RECEIVE_BOOT_COMPLETED: 광고 SDK(play-services-ads-api)가 tools:node="remove"로 지워서,
//   재부팅하면 예약된 알림이 사라지고 앱을 열 때까지 다시 예약되지 않는다. replace로 되살린다.
// - SCHEDULE_EXACT_ALARM: 없으면 Android가 알림을 최대 1시간 늦게 보낸다. 사용자가 허용하지 않은 기기에서는
//   expo-notifications가 알아서 부정확한 알람으로 예약하므로 권한이 없어도 동작은 한다.
const PERMISSIONS = ['android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.SCHEDULE_EXACT_ALARM'];

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const list = (manifest['uses-permission'] ??= []);
    for (const name of PERMISSIONS) {
      const existing = list.find((p) => p.$['android:name'] === name);
      if (existing) existing.$['tools:node'] = 'replace';
      else list.push({ $: { 'android:name': name, 'tools:node': 'replace' } });
    }
    return cfg;
  });
