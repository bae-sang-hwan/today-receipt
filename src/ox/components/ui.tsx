import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Switch,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../theme';
import { haptic } from '../haptics';
import type { MarkStyle, MarkValue } from '../db/repo';
import { markSymbol } from '../domain/mark';

// ---- 텍스트 ----

type Weight = keyof typeof fonts;

export const Txt = ({ weight = 'regular', style, ...rest }: TextProps & { weight?: Weight }) => {
  const { colors } = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts[weight], color: colors.ink, fontSize: 15 }, style]} />;
};

// ---- 누르는 모든 것: 누르면 햅틱 ----

type TapProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  hapticStyle?: keyof typeof haptic | 'none';
  pressedOpacity?: number;
};

export const Tap = ({ onPress, onLongPress, hapticStyle = 'tap', pressedOpacity = 0.6, style, disabled, ...rest }: TapProps) => (
  <Pressable
    {...rest}
    disabled={disabled}
    onPress={(e) => {
      if (hapticStyle !== 'none') haptic[hapticStyle]();
      onPress?.(e);
    }}
    onLongPress={
      onLongPress
        ? (e) => {
            haptic.longPress();
            onLongPress(e);
          }
        : undefined
    }
    style={(state) => [
      typeof style === 'function' ? style(state) : style,
      state.pressed && !disabled ? { opacity: pressedOpacity } : null,
    ]}
  />
);

// ---- 버튼 ----

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();
  const box: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.ink }
      : variant === 'outline'
        ? { borderWidth: 1.5, borderColor: colors.line }
        : variant === 'danger'
          ? { borderWidth: 1.5, borderColor: colors.xSoft }
          : {};
  const color = variant === 'primary' ? colors.inverseText : variant === 'danger' ? colors.x : colors.muted;
  return (
    <Tap onPress={onPress} disabled={disabled} style={[styles.button, box, disabled && { opacity: 0.35 }, style]}>
      <Txt weight={variant === 'primary' ? 'bold' : 'medium'} style={{ color, fontSize: 16 }}>
        {title}
      </Txt>
    </Tap>
  );
};

// ---- 상단 바 ----

export const Header = ({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Tap onPress={onBack} hitSlop={12} style={styles.headerBack} accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Tap>
      ) : null}
      <Txt weight="extrabold" style={{ fontSize: 19, flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
};

// ---- 목록 ----

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>{children}</View>;
};

export const Row = ({
  title,
  sub,
  value,
  onPress,
  left,
  right,
  last,
  titleStyle,
  chevron = !!onPress,
}: {
  title: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  last?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  chevron?: boolean;
}) => {
  const { colors } = useTheme();
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={titleStyle}>{title}</Txt>
        {sub ? <Txt style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>{sub}</Txt> : null}
      </View>
      {value ? <Txt style={{ color: colors.muted, fontSize: 14 }}>{value}</Txt> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
    </View>
  );
  return onPress ? <Tap onPress={onPress}>{content}</Tap> : content;
};

export const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic.tap();
        onChange(v);
      }}
      trackColor={{ true: colors.o, false: colors.line }}
      thumbColor="#FFFFFF"
    />
  );
};

// ---- O/X 기호 ----

export const Mark = ({ value, markStyle, size }: { value: MarkValue; markStyle: MarkStyle; size: number }) => {
  const { colors } = useTheme();
  if (value === '') return null;
  return (
    <Txt weight="extrabold" style={{ fontSize: size, lineHeight: size * 1.1, color: value === 'O' ? colors.o : colors.x }}>
      {markSymbol(value, markStyle)}
    </Txt>
  );
};

// ---- 바텀시트 ----

export const Sheet = ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* 모달은 화면 끝까지 그려지므로(edge-to-edge) 키보드 높이만큼 직접 띄운다. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: 20 + insets.bottom }]}>
          <View style={[styles.grab, { backgroundColor: colors.line }]} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const ConfirmSheet = ({
  visible,
  title,
  message,
  confirmText,
  danger,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmText: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt weight="extrabold" style={{ fontSize: 18 }}>
        {title}
      </Txt>
      {message ? <Txt style={{ color: colors.muted, lineHeight: 22 }}>{message}</Txt> : null}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Tap onPress={onConfirm} style={[styles.button, { backgroundColor: danger ? colors.x : colors.ink }]}>
          <Txt weight="bold" style={{ color: danger ? '#FFFFFF' : colors.inverseText, fontSize: 16 }}>
            {confirmText}
          </Txt>
        </Tap>
        <Button title="취소" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
};

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Txt weight="extrabold" style={{ fontSize: 18 }}>
        {title}
      </Txt>
      <View>
        {options.map((o) => (
          <Tap
            key={o.value}
            onPress={() => {
              onSelect(o.value);
              onClose();
            }}
            style={styles.option}
          >
            <Txt weight={o.value === value ? 'bold' : 'regular'} style={{ fontSize: 16, flex: 1 }}>
              {o.label}
            </Txt>
            {o.value === value ? <Ionicons name="checkmark" size={20} color={colors.o} /> : null}
          </Tap>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 56 },
  headerBack: { marginLeft: -6, padding: 2 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 54 },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  grab: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
});
