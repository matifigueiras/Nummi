import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { Sheet } from './Sheet';

// La meta se define en ARS porque las estadísticas de Home consolidan en ARS.

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SavingsGoalModal({ visible, onClose }: Props) {
  const { savingsGoal, updateSavingsGoal } = useApp();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) setAmount(savingsGoal.amount > 0 ? String(savingsGoal.amount) : '');
  }, [visible, savingsGoal.amount]);

  const parsedAmount = parseAmount(amount);
  const valid = parsedAmount > 0;

  const handleSave = async () => {
    if (!valid) return;
    await updateSavingsGoal({ currency: 'ARS', amount: parsedAmount });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Meta de ahorro mensual">
      <Field label="Monto (ARS)">
        <FormInput
          big
          thousands
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>
      <SaveButton label="Guardar" disabled={!valid} onPress={handleSave} />
    </Sheet>
  );
}
