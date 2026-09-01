export type CategoryKey = 'food' | 'cafe' | 'shopping' | 'transport' | 'culture' | 'life' | 'beauty' | 'etc';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'food', label: '식비', icon: 'restaurant-outline' },
  { key: 'cafe', label: '카페/간식', icon: 'cafe-outline' },
  { key: 'shopping', label: '쇼핑', icon: 'bag-handle-outline' },
  { key: 'transport', label: '교통', icon: 'car-outline' },
  { key: 'culture', label: '문화/여가', icon: 'film-outline' },
  { key: 'life', label: '생활', icon: 'basket-outline' },
  { key: 'beauty', label: '뷰티/건강', icon: 'medkit-outline' },
  { key: 'etc', label: '기타', icon: 'ellipsis-horizontal-circle-outline' },
];

export const DEFAULT_CATEGORY: CategoryKey = 'etc';

export const getCategory = (key?: string | null): CategoryDef => {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES.find(c => c.key === DEFAULT_CATEGORY)!;
};
