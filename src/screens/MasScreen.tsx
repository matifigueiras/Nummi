import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { ThemeMode, useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';

// El resto del contenido de "Más" se define en próximas iteraciones.

const ITEMS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'tag', label: 'Categorías' },
  { icon: 'target', label: 'Metas de ahorro' },
  { icon: 'download', label: 'Exportar datos' },
  { icon: 'database', label: 'Conectar almacenamiento' },
];

export function MasScreen() {
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen>
      <Text style={styles.title}>Más</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View>
          <Text style={styles.name}>Mati</Text>
          <Text style={styles.email}>matifigueiras9@gmail.com</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>Apariencia</Text>
        <SegmentedControl<ThemeMode>
          options={[
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
            { value: 'system', label: 'Sistema' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Card>

      <Card style={styles.listCard}>
        {ITEMS.map((item, index) => (
          <View key={item.label} style={[styles.item, index > 0 && styles.itemBorder]}>
            <View style={styles.itemIcon}>
              <ItemIcon icon={item.icon} />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pronto</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.footer}>Nummi v0.1 · Datos simulados</Text>
    </Screen>
  );
}

function ItemIcon({ icon }: { icon: keyof typeof Feather.glyphMap }) {
  const { colors } = useTheme();
  return <Feather name={icon} size={16} color={colors.secondary} />;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: font.title,
      fontWeight: '700',
      color: c.ink,
      letterSpacing: -0.4,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    name: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    email: {
      fontSize: font.label,
      color: c.muted,
      marginTop: 1,
    },
    sectionLabel: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
      marginBottom: spacing.md,
    },
    listCard: {
      paddingVertical: spacing.sm,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md + 2,
    },
    itemBorder: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    itemIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemLabel: {
      flex: 1,
      fontSize: font.body,
      fontWeight: '500',
      color: c.ink,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
    },
    badgeText: {
      fontSize: font.caption,
      fontWeight: '600',
      color: c.secondary,
    },
    footer: {
      textAlign: 'center',
      fontSize: font.caption,
      color: c.muted,
      marginTop: spacing.sm,
    },
  });
