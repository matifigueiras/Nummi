import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../store/AppContext';
import { Currency, Property } from '../types';
import { ConfirmDeleteButton, Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

// Cada monto lleva su propia moneda: valor en USD con alquiler en ARS es el
// caso típico.

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Si viene, el modal edita esa propiedad en vez de crear una nueva */
  property?: Property | null;
}

export function NewPropertyModal({ visible, onClose, property }: Props) {
  const { addProperty, updateProperty, deleteProperty } = useApp();
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [rentCurrency, setRentCurrency] = useState<Currency>('ARS');
  const [expenses, setExpenses] = useState('');
  const [expensesCurrency, setExpensesCurrency] = useState<Currency>('ARS');
  const [value, setValue] = useState('');
  const [valueCurrency, setValueCurrency] = useState<Currency>('USD');

  const editing = property ?? null;

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setRent(String(editing.monthlyRent).replace('.', ','));
      setRentCurrency(editing.rentCurrency);
      setExpenses(String(editing.monthlyExpenses).replace('.', ','));
      setExpensesCurrency(editing.expensesCurrency);
      setValue(String(editing.estimatedValue).replace('.', ','));
      setValueCurrency(editing.valueCurrency);
    } else {
      setName('');
      setRent('');
      setRentCurrency('ARS');
      setExpenses('');
      setExpensesCurrency('ARS');
      setValue('');
      setValueCurrency('USD');
    }
  }, [visible, editing]);

  const parsedRent = parseAmount(rent);
  const parsedExpenses = expenses.trim() === '' ? 0 : parseAmount(expenses);
  const parsedValue = parseAmount(value);
  const valid =
    name.trim().length > 0 && parsedRent >= 0 && parsedExpenses >= 0 && parsedValue > 0;

  const handleSave = async () => {
    if (!valid) return;
    const data = {
      name: name.trim(),
      monthlyRent: parsedRent,
      rentCurrency,
      monthlyExpenses: parsedExpenses,
      expensesCurrency,
      estimatedValue: parsedValue,
      valueCurrency,
    };
    if (editing) {
      await updateProperty({ ...data, id: editing.id });
    } else {
      await addProperty(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteProperty(editing.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar propiedad' : 'Nueva propiedad'}
    >
      <Field label="Nombre">
        <FormInput value={name} onChangeText={setName} placeholder="Ej: Depto 2 amb · Palermo" />
      </Field>

      <AmountField
        label="Alquiler mensual"
        amount={rent}
        onAmount={setRent}
        currency={rentCurrency}
        onCurrency={setRentCurrency}
      />

      <AmountField
        label="Gastos mensuales"
        amount={expenses}
        onAmount={setExpenses}
        currency={expensesCurrency}
        onCurrency={setExpensesCurrency}
      />

      <AmountField
        label="Valor estimado"
        amount={value}
        onAmount={setValue}
        currency={valueCurrency}
        onCurrency={setValueCurrency}
      />

      <SaveButton label={editing ? 'Guardar' : 'Agregar'} disabled={!valid} onPress={handleSave} />

      {editing && <ConfirmDeleteButton label="Eliminar propiedad" onDelete={handleDelete} />}
    </Sheet>
  );
}

function AmountField({
  label,
  amount,
  onAmount,
  currency,
  onCurrency,
}: {
  label: string;
  amount: string;
  onAmount: (value: string) => void;
  currency: Currency;
  onCurrency: (value: Currency) => void;
}) {
  return (
    <Field label={label}>
      <View style={styles.row}>
        <FormInput
          style={styles.input}
          value={amount}
          onChangeText={onAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        <View style={styles.toggle}>
          <SegmentedControl
            options={[
              { value: 'ARS', label: 'ARS' },
              { value: 'USD', label: 'USD' },
            ]}
            value={currency}
            onChange={onCurrency}
          />
        </View>
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
  },
  toggle: {
    width: 136,
  },
});
