import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, shadow, spacing, ThemeColors } from '../theme';

interface Props {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

export function StatTile({ icon, iconColor, iconBg, label, value, sub, onPress, children }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable style={styles.tile} onPress={onPress} disabled={!onPress}>
      <View style={styles.tileHeader}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconColor} />
        </View>
        {/* Lápiz: señala que el tile se puede tocar para editar */}
        {onPress && <Feather name="edit-2" size={13} color={colors.muted} />}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {children}
    </Pressable>
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
    tileHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
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
