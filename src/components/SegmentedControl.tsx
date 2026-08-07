import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: c.inkSoft,
      borderRadius: radius.full,
      padding: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: c.card,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    label: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
    },
    labelActive: {
      color: c.ink,
    },
  });
