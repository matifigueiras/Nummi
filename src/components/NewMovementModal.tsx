import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Currency, MovementType } from '../types';
import { todayISO } from '../utils/format';
import { ChipGroup, Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

const CATEGORIES: Record<MovementType, string[]> = {
  gasto: ['Comida', 'Vivienda', 'Transporte', 'Servicios', 'Salidas', 'Salud', 'Viajes', 'Ahorro', 'Otros'],
  ingreso: ['Sueldo', 'Freelance', 'Ahorro', 'Otros'],
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NewMovementModal({ visible, onClose }: Props) {
  const { addMovement } = useApp();
  const [type, setType] = useState<MovementType>('gasto');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Comida');

  const parsedAmount = parseAmount(amount);
  const valid = parsedAmount > 0 && description.trim().length > 0;

  const reset = () => {
    setType('gasto');
    setCurrency('ARS');
    setAmount('');
    setDescription('');
    setCategory('Comida');
  };

  const handleTypeChange = (next: MovementType) => {
    setType(next);
    if (!CATEGORIES[next].includes(category)) setCategory(CATEGORIES[next][0]);
  };

  const handleSave = async () => {
    if (!valid) return;
    await addMovement({
      date: todayISO(),
      description: description.trim(),
      category,
      type,
      currency,
      amount: parsedAmount,
    });
    reset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nuevo movimiento">
      <SegmentedControl
        options={[
          { value: 'gasto', label: 'Gasto' },
          { value: 'ingreso', label: 'Ingreso' },
        ]}
        value={type}
        onChange={handleTypeChange}
      />

      <Field label="Caja">
        <SegmentedControl
          options={[
            { value: 'ARS', label: 'ARS' },
            { value: 'USD', label: 'USD' },
          ]}
          value={currency}
          onChange={setCurrency}
        />
      </Field>

      <Field label="Monto">
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
        <FormInput value={description} onChangeText={setDescription} placeholder="Ej: Supermercado" />
      </Field>

      <Field label="Categoría">
        <ChipGroup options={CATEGORIES[type]} value={category} onChange={setCategory} />
      </Field>

      <SaveButton label="Agregar" disabled={!valid} onPress={handleSave} />
    </Sheet>
  );
}
