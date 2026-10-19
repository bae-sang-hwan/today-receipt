import { Directory, File, Paths } from 'expo-file-system';

// 기록 사진 파일은 앱 문서 폴더 photos/{id}.jpg에 둔다. 사진을 바꾸면 id도 새로 만들어
// 이미지 캐시와 다른 기기의 사본이 옛 사진을 보여주지 않게 한다.
const photoDir = () => {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
};

export const newPhotoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const photoFile = (id: string) => new File(photoDir(), `${id}.jpg`);

// 고른 사진(임시 파일)을 기록 사진 폴더로 옮기고 새 id를 돌려준다.
export const importPhoto = (uri: string) => {
  const id = newPhotoId();
  new File(uri).move(photoFile(id));
  return id;
};

export const deleteLocalPhoto = (id: string) => {
  try {
    const file = photoFile(id);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('사진 파일 삭제 실패:', e);
  }
};
