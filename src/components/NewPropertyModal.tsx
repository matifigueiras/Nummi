import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NewPropertyModal({ visible, onClose }: Props) {
  const { addProperty } = useApp();
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [expenses, setExpenses] = useState('');
  const [value, setValue] = useState('');

  const parsedRent = parseAmount(rent);
  const parsedExpenses = expenses.trim() === '' ? 0 : parseAmount(expenses);
  const parsedValue = parseAmount(value);
  const valid =
    name.trim().length > 0 && parsedRent >= 0 && parsedExpenses >= 0 && parsedValue > 0;

  const reset = () => {
    setName('');
    setRent('');
    setExpenses('');
    setValue('');
  };

  const handleSave = async () => {
    if (!valid) return;
    await addProperty({
      name: name.trim(),
      monthlyRent: parsedRent,
      monthlyExpenses: parsedExpenses,
      estimatedValue: parsedValue,
    });
    reset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nueva propiedad">
      <Field label="Nombre">
        <FormInput value={name} onChangeText={setName} placeholder="Ej: Depto 2 amb · Palermo" />
      </Field>

      <Field label="Alquiler mensual (USD)">
        <FormInput
          value={rent}
          onChangeText={setRent}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label="Gastos mensuales (USD)">
        <FormInput
          value={expenses}
          onChangeText={setExpenses}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label="Valor estimado (USD)">
        <FormInput
          value={value}
          onChangeText={setValue}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <SaveButton label="Agregar" disabled={!valid} onPress={handleSave} />
    </Sheet>
  );
}
