import { TestIds } from 'react-native-google-mobile-ads';

export const APP_NAME = '하루 OX 캘린더';

// 무료 사용자가 만들 수 있는 캘린더 수. 넘으면 프리미엄 화면을 연다.
export const FREE_CALENDAR_LIMIT = 2;

// Play Console에 등록할 비소모성 인앱 상품 ID. 가격(₩2,900)은 Play Console에서 정한다.
export const PREMIUM_SKU = 'premium_lifetime';
export const PREMIUM_FALLBACK_PRICE = '₩2,900';

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-5927873314061819/2518464072';

export const GOOGLE_WEB_CLIENT_ID = '296991066097-2i9s6lddu6afbpidckl8ttt0k064jm6r.apps.googleusercontent.com';

// 비어 있으면 설정 화면에서 해당 줄을 숨긴다. 출시 전에 채워야 한다.
export const CONTACT_EMAIL = '01039766629b@gmail.com';
export const PRIVACY_POLICY_URL = 'https://bae-sang-hwan.github.io/today-receipt/';
export const ACCOUNT_DELETION_URL = 'https://bae-sang-hwan.github.io/today-receipt/delete-account';

export const NAME_MAX_LENGTH = 12;
export const MEMO_MAX_LENGTH = 50;

// 기록 사진은 긴 변을 이 크기(px)로 줄이고 JPEG로 압축해 저장·백업한다.
export const PHOTO_MAX_SIZE = 1280;
export const PHOTO_QUALITY = 0.7;

// 매일 알림을 미리 예약해 두는 기간. 이 기간 동안 앱을 안 열면 알림이 멈춘다.
export const REMINDER_SCHEDULE_DAYS = 30;
export const DEFAULT_REMINDER = '21:00';
