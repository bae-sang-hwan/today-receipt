export type Emotion = 'HAPPY' | 'REGRET';

export interface Receipt {
  id: string;
  userId: string;
  imageUrl: string;
  shopName: string;
  amount: number;
  emotion: Emotion;
  memo?: string;
  createdAt: number; // 타임스탬프
}