import * as Haptics from 'expo-haptics';

export const triggerNavHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
