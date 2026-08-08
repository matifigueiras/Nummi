import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { MovementType, RecurringMovement } from '../types';
import { AccountPicker } from './AccountPicker';
import { ChipGroup, ConfirmDeleteButton, Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

const CATEGORIES: Record<MovementType, string[]> = {
  gasto: ['Vivienda', 'Servicios', 'Comida', 'Transporte', 'Salud', 'Salidas', 'Ahorro', 'Otros'],
  ingreso: ['Sueldo', 'Freelance', 'Otros'],
};

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface Props {
  visible: boolean;
  onClose: () => void;
  recurring?: RecurringMovement | null;
}

export function RecurringModal({ visible, onClose, recurring }: Props) {
  const { accounts, addRecurring, updateRecurring, deleteRecurring } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [type, setType] = useState<MovementType>('gasto');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Vivienda');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [active, setActive] = useState(true);

  const editing = recurring ?? null;

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setType(editing.type);
      setAccountId(editing.accountId);
      setAmount(String(editing.amount).replace('.', ','));
      setDescription(editing.description);
      setCategory(editing.category);
      setDayOfMonth(editing.dayOfMonth);
      setActive(editing.active);
    } else {
      setType('gasto');
      setAccountId(accounts[0]?.id ?? null);
      setAmount('');
      setDescription('');
      setCategory('Vivienda');
      setDayOfMonth(1);
      setActive(true);
    }
  }, [visible, editing, accounts]);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const parsedAmount = parseAmount(amount);
  const valid = Boolean(account) && parsedAmount > 0 && description.trim().length > 0;

  const handleTypeChange = (next: MovementType) => {
    setType(next);
    if (!CATEGORIES[next].includes(category)) setCategory(CATEGORIES[next][0]);
  };

  const handleSave = async () => {
    if (!valid || !account) return;
    const data = {
      description: description.trim(),
      category,
      type,
      accountId: account.id,
      currency: account.currency,
      amount: parsedAmount,
      dayOfMonth,
      active,
    };
    if (editing) {
      await updateRecurring({ ...data, id: editing.id });
    } else {
      await addRecurring(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteRecurring(editing.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar movimiento fijo' : 'Nuevo movimiento fijo'}
    >
      <SegmentedControl
        options={[
          { value: 'gasto', label: 'Gasto' },
          { value: 'ingreso', label: 'Ingreso' },
        ]}
        value={type}
        onChange={handleTypeChange}
      />

      <Field label="Cuenta">
        <AccountPicker accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
      </Field>

      <Field label={account ? `Monto (${account.currency})` : 'Monto'}>
        <FormInput
          big
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label="Descripción">
        <FormInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ej: Alquiler, Sueldo, Netflix"
        />
      </Field>

      <Field label="Categoría">
        <ChipGroup options={CATEGORIES[type]} value={category} onChange={setCategory} />
      </Field>

      <Field label={`Día del mes: ${dayOfMonth}`}>
        <View style={styles.days}>
          {DAYS.map((day) => (
            <Pressable
              key={day}
              style={[styles.day, day === dayOfMonth && styles.dayActive]}
              onPress={() => setDayOfMonth(day)}
            >
              <Text style={[styles.dayLabel, day === dayOfMonth && styles.dayLabelActive]}>
                {day}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>
          En los meses más cortos se registra el último día.
        </Text>
      </Field>

      {editing && (
        <Pressable style={styles.toggle} onPress={() => setActive(!active)}>
          <Feather
            name={active ? 'check-square' : 'square'}
            size={18}
            color={active ? colors.accent : colors.muted}
          />
          <Text style={styles.toggleLabel}>Activo</Text>
        </Pressable>
      )}

      <SaveButton label={editing ? 'Guardar' : 'Crear'} disabled={!valid} onPress={handleSave} />

      {editing && (
        <>
          <ConfirmDeleteButton label="Eliminar movimiento fijo" onDelete={handleDelete} />
          <Text style={styles.hint}>
            Los movimientos que ya se registraron no se borran.
          </Text>
        </>
      )}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    days: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    day: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inkSoft,
    },
    dayActive: {
      backgroundColor: c.ink,
    },
    dayLabel: {
      fontSize: font.label,
      fontWeight: '500',
      color: c.secondary,
      fontVariant: ['tabular-nums'],
    },
    dayLabelActive: {
      color: c.inverse,
      fontWeight: '700',
    },
    hint: {
      fontSize: font.caption + 1,
      color: c.muted,
      lineHeight: 16,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    toggleLabel: {
      fontSize: font.body,
      color: c.ink,
      fontWeight: '500',
    },
  });
