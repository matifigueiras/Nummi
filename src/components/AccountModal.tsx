import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, ThemeColors } from '../theme';
import { Account, Currency } from '../types';
import { ConfirmDeleteButton, Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Si viene, el modal edita esa cuenta en vez de crear una nueva */
  account?: Account | null;
  /** Cuántas cuentas hay: no se permite borrar la última */
  accountCount: number;
}

export function AccountModal({ visible, onClose, account, accountCount }: Props) {
  const { addAccount, updateAccount, deleteAccount } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [initialBalance, setInitialBalance] = useState('');

  const editing = account ?? null;

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setCurrency(editing.currency);
      setInitialBalance(String(editing.initialBalance).replace('.', ','));
    } else {
      setName('');
      setCurrency('ARS');
      setInitialBalance('');
    }
  }, [visible, editing]);

  // El saldo inicial vacío se toma como cero: una cuenta nueva suele arrancar así
  const parsedBalance = initialBalance.trim() === '' ? 0 : parseAmount(initialBalance);
  const valid = name.trim().length > 0 && Number.isFinite(parsedBalance);

  const handleSave = async () => {
    if (!valid) return;
    const data = { name: name.trim(), currency, initialBalance: parsedBalance };
    if (editing) {
      await updateAccount({ ...data, id: editing.id });
    } else {
      await addAccount(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteAccount(editing.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
    >
      <Field label="Nombre">
        <FormInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Mercado Pago, Banco, Efectivo"
        />
      </Field>

      <Field label="Moneda">
        <SegmentedControl
          options={[
            { value: 'ARS', label: 'Pesos' },
            { value: 'USD', label: 'Dólares' },
          ]}
          value={currency}
          onChange={setCurrency}
        />
        {editing && (
          <Text style={styles.hint}>
            Cambiar la moneda no convierte los montos ya cargados.
          </Text>
        )}
      </Field>

      <Field label="Saldo inicial">
        <FormInput
          thousands
          value={initialBalance}
          onChangeText={setInitialBalance}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <Text style={styles.hint}>
          Lo que ya tenías en esta cuenta antes de empezar a registrar movimientos.
        </Text>
      </Field>

      <SaveButton label={editing ? 'Guardar' : 'Crear cuenta'} disabled={!valid} onPress={handleSave} />

      {editing &&
        (accountCount > 1 ? (
          <ConfirmDeleteButton
            label="Eliminar cuenta y sus movimientos"
            onDelete={handleDelete}
          />
        ) : (
          <Text style={styles.hint}>
            No se puede eliminar la única cuenta: creá otra primero.
          </Text>
        ))}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hint: {
      fontSize: font.caption + 1,
      color: c.muted,
      lineHeight: 16,
    },
  });
