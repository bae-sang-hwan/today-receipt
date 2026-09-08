import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { triggerNavHaptic } from '../utils/haptics';

type Props = {
  bottomOffset: number;
};

export const FloatingAddButton = ({ bottomOffset }: Props) => {
  const navigation = useNavigation<any>();

  const onPress = () => {
    triggerNavHaptic();
    navigation.navigate('Add');
  };

  return (
    <TouchableOpacity
      style={[styles.button, { bottom: bottomOffset }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons name="add" size={30} color={colors.white} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
