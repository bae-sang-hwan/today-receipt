import type { MarkStyle, MarkValue } from '../db/repo';

export const markSymbol = (value: MarkValue, style: MarkStyle) =>
  value === '' ? '' : style === 'check' ? (value === 'O' ? '✓' : '✕') : value;
