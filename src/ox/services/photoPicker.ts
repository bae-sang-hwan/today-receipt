import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PHOTO_MAX_SIZE, PHOTO_QUALITY } from '../config';

// 안드로이드 사진 선택기로 한 장을 고른다. 권한이 필요 없다.
// 긴 변을 PHOTO_MAX_SIZE로 줄인 JPEG 임시 파일 경로를 돌려주고, 취소하면 null.
export const pickPhoto = async (): Promise<string | null> => {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > PHOTO_MAX_SIZE) {
    ctx.resize(asset.width >= asset.height ? { width: PHOTO_MAX_SIZE } : { height: PHOTO_MAX_SIZE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  return saved.uri;
};
