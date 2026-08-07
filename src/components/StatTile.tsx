import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemedStyles } from '../store/ThemeContext';
import { font, radius, shadow, spacing, ThemeColors } from '../theme';

interface Props {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}

export function StatTile({ icon, iconColor, iconBg, label, value, sub, children }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tile}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={15} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: 3,
      ...shadow.card,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: font.label,
      color: c.secondary,
    },
    value: {
      fontSize: 19,
      fontWeight: '700',
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    sub: {
      fontSize: font.caption,
      color: c.muted,
    },
  });
