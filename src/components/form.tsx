import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import {
  addDaysISO,
  formatDayLabel,
  formatThousandsLive,
  stripThousands,
  todayISO,
} from '../utils/format';


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
  /** Separador de miles en vivo mientras se escribe (para campos de monto) */
  thousands?: boolean;
}

export function FormInput({ big, thousands, style, value, onChangeText, ...rest }: InputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const displayValue = thousands && typeof value === 'string' ? formatThousandsLive(value) : value;
  const handleChangeText = thousands
    ? (text: string) => onChangeText?.(stripThousands(text, typeof value === 'string' ? value : ''))
    : onChangeText;
  return (
    <TextInput
      style={[big ? styles.bigInput : styles.input, style]}
      placeholderTextColor={colors.muted}
      {...rest}
      value={displayValue}
      onChangeText={handleChangeText}
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

/** Selector de día con flechas: Hoy / Ayer / fechas anteriores. No permite futuro. */
export function DayStepper({ date, onChange }: { date: string; onChange: (iso: string) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const atToday = date >= todayISO();
  return (
    <View style={styles.dayRow}>
      <Pressable
        style={styles.dayButton}
        onPress={() => onChange(addDaysISO(date, -1))}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Día anterior"
      >
        <Feather name="chevron-left" size={18} color={colors.ink} />
      </Pressable>
      <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
      <Pressable
        style={[styles.dayButton, atToday && styles.dayButtonDisabled]}
        onPress={() => onChange(addDaysISO(date, 1))}
        disabled={atToday}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Día siguiente"
        accessibilityState={{ disabled: atToday }}
      >
        <Feather name="chevron-right" size={18} color={atToday ? colors.muted : colors.ink} />
      </Pressable>
    </View>
  );
}

/** Botón de borrado en dos pasos: el primer tap arma, el segundo confirma. */
export function ConfirmDeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handlePress = () => {
    if (armed) {
      onDelete();
      setArmed(false);
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 8000);
  };

  return (
    <Pressable style={[styles.deleteButton, armed && styles.deleteButtonArmed]} onPress={handlePress}>
      <Text style={[styles.deleteLabel, armed && styles.deleteLabelArmed]}>
        {armed ? 'Tocá de nuevo para confirmar' : label}
      </Text>
    </Pressable>
  );
}

// parseAmount vive en utils/format para poder testearla sin montar componentes;
// se reexporta acá porque los formularios ya importan de este módulo.
export { parseAmount } from '../utils/format';

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
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.bg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    dayButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayButtonDisabled: {
      opacity: 0.5,
    },
    dayLabel: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    deleteButton: {
      backgroundColor: c.dangerSoft,
      borderRadius: radius.md,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
    },
    deleteButtonArmed: {
      backgroundColor: c.danger,
    },
    deleteLabel: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.danger,
    },
    deleteLabelArmed: {
      color: '#FFFFFF',
    },
  });
