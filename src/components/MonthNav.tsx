import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, ThemeColors } from '../theme';
import { formatMonth } from '../utils/format';

interface Props {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  /** No se puede navegar más allá del mes actual */
  nextDisabled: boolean;
}

export function MonthNav({ month, onPrev, onNext, nextDisabled }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.button}
        onPress={onPrev}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <Feather name="chevron-left" size={20} color={colors.ink} />
      </Pressable>
      <Text style={styles.month}>{formatMonth(month)}</Text>
      <Pressable
        style={[styles.button, nextDisabled && styles.buttonDisabled]}
        onPress={onNext}
        disabled={nextDisabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        accessibilityState={{ disabled: nextDisabled }}
      >
        <Feather name="chevron-right" size={20} color={nextDisabled ? colors.muted : colors.ink} />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    button: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    month: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
  });
