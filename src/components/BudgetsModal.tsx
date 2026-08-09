import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, spacing, ThemeColors } from '../theme';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { Sheet } from './Sheet';

// Un límite mensual por categoría de gasto, en pesos. Dejar el campo vacío
// (o en 0) equivale a no tener presupuesto.

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function BudgetsModal({ visible, onClose }: Props) {
  const { categories, budgets, setBudget } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const expenseCategories = categories.filter((c) => c.type === 'gasto');

  useEffect(() => {
    if (!visible) return;
    const initial: Record<string, string> = {};
    for (const category of expenseCategories) {
      const budget = budgets.find((b) => b.category === category.name);
      initial[category.name] = budget ? String(budget.amount) : '';
    }
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, budgets, categories]);

  const handleSave = async () => {
    for (const category of expenseCategories) {
      const raw = draft[category.name] ?? '';
      const parsed = raw.trim() === '' ? 0 : parseAmount(raw);
      const current = budgets.find((b) => b.category === category.name)?.amount ?? 0;
      const next = Number.isFinite(parsed) ? parsed : 0;
      if (next !== current) await setBudget(category.name, next);
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Presupuestos del mes">
      <Text style={styles.intro}>
        Poné un límite mensual en pesos a las categorías que quieras controlar. Los gastos en
        dólares se convierten al blue.
      </Text>

      <View style={styles.list}>
        {expenseCategories.map((category) => (
          <Field key={category.id} label={category.name}>
            <FormInput
              value={draft[category.name] ?? ''}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, [category.name]: value }))}
              placeholder="Sin presupuesto"
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </Field>
        ))}
      </View>

      <SaveButton label="Guardar" disabled={false} onPress={handleSave} />
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
      gap: spacing.lg,
    },
  });
