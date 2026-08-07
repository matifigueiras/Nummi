import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../store/AppContext';
import { Currency } from '../types';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

// Cada monto lleva su propia moneda: valor en USD con alquiler en ARS es el
// caso típico.

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NewPropertyModal({ visible, onClose }: Props) {
  const { addProperty } = useApp();
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [rentCurrency, setRentCurrency] = useState<Currency>('ARS');
  const [expenses, setExpenses] = useState('');
  const [expensesCurrency, setExpensesCurrency] = useState<Currency>('ARS');
  const [value, setValue] = useState('');
  const [valueCurrency, setValueCurrency] = useState<Currency>('USD');

  const parsedRent = parseAmount(rent);
  const parsedExpenses = expenses.trim() === '' ? 0 : parseAmount(expenses);
  const parsedValue = parseAmount(value);
  const valid =
    name.trim().length > 0 && parsedRent >= 0 && parsedExpenses >= 0 && parsedValue > 0;

  const reset = () => {
    setName('');
    setRent('');
    setRentCurrency('ARS');
    setExpenses('');
    setExpensesCurrency('ARS');
    setValue('');
    setValueCurrency('USD');
  };

  const handleSave = async () => {
    if (!valid) return;
    await addProperty({
      name: name.trim(),
      monthlyRent: parsedRent,
      rentCurrency,
      monthlyExpenses: parsedExpenses,
      expensesCurrency,
      estimatedValue: parsedValue,
      valueCurrency,
    });
    reset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nueva propiedad">
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

      <SaveButton label="Agregar" disabled={!valid} onPress={handleSave} />
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
