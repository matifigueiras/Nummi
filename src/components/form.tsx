import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';

// Piezas compartidas por los formularios de los sheets (movimiento, posición,
// propiedad): campo con etiqueta, inputs, chips y botón de guardar.

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface InputProps extends TextInputProps {
  /** Tipografía grande para montos */
  big?: boolean;
}

export function FormInput({ big, style, ...rest }: InputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      style={[big ? styles.bigInput : styles.input, style]}
      placeholderTextColor={colors.muted}
      {...rest}
    />
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SaveButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.saveButton, disabled && styles.saveButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.saveLabel}>{label}</Text>
    </Pressable>
  );
}

/** Acepta coma o punto como separador decimal ("15,5" / "0.048"); NaN si no parsea */
export function parseAmount(raw: string): number {
  return Number(raw.trim().replace(',', '.'));
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    field: {
      gap: spacing.sm,
    },
    fieldLabel: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
    },
    bigInput: {
      fontSize: 30,
      fontWeight: '700',
      color: c.ink,
      backgroundColor: c.bg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    input: {
      fontSize: font.body,
      color: c.ink,
      backgroundColor: c.bg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
    },
    chipActive: {
      backgroundColor: c.ink,
    },
    chipLabel: {
      fontSize: font.label,
      fontWeight: '500',
      color: c.secondary,
    },
    chipLabelActive: {
      color: c.inverse,
    },
    saveButton: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveLabel: {
      fontSize: font.body,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
