import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { BudgetsModal } from '../components/BudgetsModal';
import { CategoriesModal } from '../components/CategoriesModal';
import { ExportModal } from '../components/ExportModal';
import { ConfirmDeleteButton } from '../components/form';
import { RecurringList } from '../components/RecurringList';
import { SavingsGoalModal } from '../components/SavingsGoalModal';
import { Screen } from '../components/Screen';
import { SegmentedControl } from '../components/SegmentedControl';
import { Sheet } from '../components/Sheet';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { ThemeMode, useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';

export function MasScreen() {
  const { mode, setMode, colors } = useTheme();
  const { resetData } = useApp();
  const { session, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const email = session?.user.email ?? '';

  return (
    <Screen>
      <Text style={styles.title}>Más</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{email.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
          <Feather name="log-out" size={18} color={colors.muted} />
        </Pressable>
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

      <RecurringList />

      <Card style={styles.listCard}>
        <Pressable style={styles.item} onPress={() => setShowGoalModal(true)}>
          <View style={styles.itemIcon}>
            <ItemIcon icon="target" />
          </View>
          <Text style={styles.itemLabel}>Meta de ahorro</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          style={[styles.item, styles.itemBorder]}
          onPress={() => setShowBudgets(true)}
        >
          <View style={styles.itemIcon}>
            <ItemIcon icon="sliders" />
          </View>
          <Text style={styles.itemLabel}>Presupuestos</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          style={[styles.item, styles.itemBorder]}
          onPress={() => setShowCategories(true)}
        >
          <View style={styles.itemIcon}>
            <ItemIcon icon="tag" />
          </View>
          <Text style={styles.itemLabel}>Categorías</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable style={[styles.item, styles.itemBorder]} onPress={() => setShowExport(true)}>
          <View style={styles.itemIcon}>
            <ItemIcon icon="download" />
          </View>
          <Text style={styles.itemLabel}>Exportar datos</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
        <Pressable style={[styles.item, styles.itemBorder]} onPress={() => setShowResetModal(true)}>
          <View style={styles.itemIcon}>
            <ItemIcon icon="rotate-ccw" />
          </View>
          <Text style={styles.itemLabel}>Restablecer datos</Text>
          <Feather name="chevron-right" size={18} color={colors.muted} />
        </Pressable>
      </Card>

      <Text style={styles.footer}>Nummi v0.1 · Sincronizado con tu cuenta</Text>

      <SavingsGoalModal visible={showGoalModal} onClose={() => setShowGoalModal(false)} />
      <CategoriesModal visible={showCategories} onClose={() => setShowCategories(false)} />
      <BudgetsModal visible={showBudgets} onClose={() => setShowBudgets(false)} />
      <ExportModal visible={showExport} onClose={() => setShowExport(false)} />

      <Sheet
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Restablecer datos"
      >
        <Text style={styles.resetText}>
          Se borra todo lo que cargaste (movimientos, fijos, posiciones, propiedades, presupuestos
          y meta). Tus cuentas y categorías quedan igual. No se puede deshacer.
        </Text>
        <ConfirmDeleteButton
          label="Restablecer datos"
          onDelete={async () => {
            await resetData();
            setShowResetModal(false);
          }}
        />
      </Sheet>
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
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    avatarRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    email: {
      flex: 1,
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
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
    footer: {
      textAlign: 'center',
      fontSize: font.caption,
      color: c.muted,
      marginTop: spacing.sm,
    },
    resetText: {
      fontSize: font.body,
      color: c.secondary,
      lineHeight: 21,
    },
  });
