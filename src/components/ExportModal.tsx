import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { exportFilename, saveCsv } from '../services/export';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { movementsToCsv, positionsToCsv, propertiesToCsv } from '../utils/csv';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: Props) {
  const { movements, accounts, positions, properties } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [error, setError] = useState<string | null>(null);

  const options = [
    {
      key: 'movimientos',
      icon: 'list' as const,
      label: 'Movimientos',
      detail: `${movements.length} registros`,
      build: () => movementsToCsv(movements, accounts),
    },
    {
      key: 'inversiones',
      icon: 'trending-up' as const,
      label: 'Acciones y cripto',
      detail: `${positions.length} posiciones`,
      build: () => positionsToCsv(positions),
    },
    {
      key: 'propiedades',
      icon: 'key' as const,
      label: 'Propiedades',
      detail: `${properties.length} propiedades`,
      build: () => propertiesToCsv(properties),
    },
  ];

  const handleExport = async (kind: string, build: () => string) => {
    setError(null);
    try {
      await saveCsv(exportFilename(kind), build());
      onClose();
    } catch {
      setError('No se pudo generar el archivo. Probá de nuevo.');
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Exportar datos">
      <Text style={styles.intro}>
        Se descarga un CSV que podés abrir en Excel o Google Sheets. Usa punto y coma como
        separador y coma decimal.
      </Text>

      <View style={styles.list}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            style={styles.row}
            onPress={() => handleExport(option.key, option.build)}
          >
            <View style={styles.icon}>
              <Feather name={option.icon} size={16} color={colors.secondary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.label}>{option.label}</Text>
              <Text style={styles.detail}>{option.detail}</Text>
            </View>
            <Feather name="download" size={16} color={colors.accent} />
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    intro: {
      fontSize: font.label,
      color: c.secondary,
      lineHeight: 19,
    },
    list: {
      gap: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      gap: 1,
    },
    label: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    detail: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
    error: {
      fontSize: font.label,
      color: c.danger,
    },
  });
