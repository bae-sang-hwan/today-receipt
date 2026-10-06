import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeSetting, type ThemeSetting } from './db/settings';
import { subscribe } from './db/repo';

export const lightColors = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  ink: '#16202B',
  muted: '#5F6B7A',
  faint: '#A3ACB8',
  line: '#E2E6EC',
  cell: '#EEF0F4',
  o: '#2457D6',
  oSoft: '#E3EBFC',
  x: '#D23F36',
  xSoft: '#FBE6E4',
  scrim: 'rgba(16, 22, 30, 0.45)',
  inverseText: '#FFFFFF',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  bg: '#101418',
  surface: '#181E25',
  ink: '#E7EBF0',
  muted: '#98A3B0',
  faint: '#5C6774',
  line: '#29313B',
  cell: '#1F262F',
  o: '#7AA2FF',
  oSoft: '#1D2C4D',
  x: '#FF7A70',
  xSoft: '#46201E',
  scrim: 'rgba(0, 0, 0, 0.6)',
  inverseText: '#101418',
};

// 캘린더 색상 7가지. 칩, 목록 점, 위젯 강조색에 쓴다. O/X 기호 색은 바꾸지 않는다.
export const CALENDAR_COLORS = ['#2457D6', '#D23F36', '#1E9E6A', '#E58A12', '#8A4FD8', '#D2479A', '#4B5563'];

export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
};

interface ThemeValue {
  colors: Colors;
  isDark: boolean;
  setting: ThemeSetting;
}

const ThemeContext = createContext<ThemeValue>({ colors: lightColors, isDark: false, setting: 'system' });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme();
  const [setting, setSettingState] = useState<ThemeSetting>(() => getThemeSetting());

  useEffect(() => subscribe((kind) => kind === 'setting' && setSettingState(getThemeSetting())), []);

  const value = useMemo(() => {
    const isDark = setting === 'dark' || (setting === 'system' && system === 'dark');
    return { colors: isDark ? darkColors : lightColors, isDark, setting };
  }, [setting, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
