import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { incomeExpenseByMonth } from '../utils/calc';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { SavingsGoalHistory } from './SavingsGoalHistory';
import { Sheet } from './Sheet';

// La meta se define en ARS porque las estadísticas de Home consolidan en ARS.

const HISTORY_MONTHS = 6;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SavingsGoalModal({ visible, onClose }: Props) {
  const { savingsGoal, updateSavingsGoal, movements, dolar, dolarHistory } = useApp();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) setAmount(savingsGoal.amount > 0 ? String(savingsGoal.amount) : '');
  }, [visible, savingsGoal.amount]);

  const rateForDate = useCallback(
    (date: string) => dolarHistory.rateForDate(date) ?? dolar.rate.venta,
    [dolarHistory, dolar.rate.venta],
  );

  const history = useMemo(
    () => incomeExpenseByMonth(movements, new Date(), HISTORY_MONTHS, rateForDate),
    [movements, rateForDate],
  );

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
      <SavingsGoalHistory data={history} goalAmount={savingsGoal.amount} />
    </Sheet>
  );
}
