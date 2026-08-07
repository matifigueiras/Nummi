import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useThemedStyles } from '../store/ThemeContext';
import { radius, shadow, spacing, ThemeColors } from '../theme';

export function Card({ style, children, ...rest }: ViewProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xl,
      ...shadow.card,
    },
  });
