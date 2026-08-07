import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, ThemeColors } from '../theme';
import { Currency, Movement, MovementType } from '../types';
import { formatMoney, todayISO } from '../utils/format';
import {
  ChipGroup,
  ConfirmDeleteButton,
  DayStepper,
  Field,
  FormInput,
  parseAmount,
  SaveButton,
} from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

const CATEGORIES: Record<MovementType, string[]> = {
  gasto: ['Comida', 'Vivienda', 'Transporte', 'Servicios', 'Salidas', 'Salud', 'Viajes', 'Ahorro', 'Otros'],
  ingreso: ['Sueldo', 'Freelance', 'Ahorro', 'Otros'],
};

type UiType = MovementType | 'transferencia';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Si viene, el modal edita ese movimiento en vez de crear uno nuevo */
  movement?: Movement | null;
}

export function NewMovementModal({ visible, onClose, movement }: Props) {
  const { movements, addMovement, updateMovement, deleteMovement, addTransfer } = useApp();
  const [uiType, setUiType] = useState<UiType>('gasto');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Comida');
  const [date, setDate] = useState(todayISO());
  // Transferencias
  const [transferFrom, setTransferFrom] = useState<Currency>('ARS');
  const [amountTo, setAmountTo] = useState('');

  const editing = movement ?? null;
  const editingTransfer = Boolean(editing?.transferId);

  // Al abrir: precargar si es edición, resetear si es alta
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setUiType(editing.type);
      setCurrency(editing.currency);
      setAmount(String(editing.amount).replace('.', ','));
      setDescription(editing.description);
      setCategory(editing.category);
      setDate(editing.date);
    } else {
      setUiType('gasto');
      setCurrency('ARS');
      setAmount('');
      setDescription('');
      setCategory('Comida');
      setDate(todayISO());
      setTransferFrom('ARS');
      setAmountTo('');
    }
  }, [visible, editing]);

  const isTransfer = uiType === 'transferencia';
  const parsedAmount = parseAmount(amount);
  const parsedAmountTo = parseAmount(amountTo);

  const valid = isTransfer
    ? parsedAmount > 0 && parsedAmountTo > 0
    : parsedAmount > 0 && description.trim().length > 0;

  const handleTypeChange = (next: UiType) => {
    setUiType(next);
    if (next !== 'transferencia' && !CATEGORIES[next].includes(category)) {
      setCategory(CATEGORIES[next][0]);
    }
  };

  const handleSave = async () => {
    if (!valid) return;
    if (isTransfer) {
      await addTransfer({
        date,
        from: transferFrom,
        amountFrom: parsedAmount,
        amountTo: parsedAmountTo,
        description: description.trim() || undefined,
      });
    } else if (editing) {
      await updateMovement({
        ...editing,
        date,
        description: description.trim(),
        category,
        type: uiType,
        currency,
        amount: parsedAmount,
      });
    } else {
      await addMovement({
        date,
        description: description.trim(),
        category,
        type: uiType,
        currency,
        amount: parsedAmount,
      });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteMovement(editing.id);
    onClose();
  };

  // Editar una pata de transferencia no tiene sentido: se muestra el resumen
  // de las dos patas y solo se puede eliminar la transferencia completa.
  if (editing && editingTransfer) {
    const legs = movements.filter((m) => m.transferId === editing.transferId);
    return (
      <TransferSummarySheet
        visible={visible}
        onClose={onClose}
        legs={legs}
        onDelete={handleDelete}
      />
    );
  }

  const toCurrency: Currency = transferFrom === 'ARS' ? 'USD' : 'ARS';
  const impliedRate =
    isTransfer && parsedAmount > 0 && parsedAmountTo > 0
      ? transferFrom === 'ARS'
        ? parsedAmount / parsedAmountTo
        : parsedAmountTo / parsedAmount
      : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
    >
      <SegmentedControl<UiType>
        options={
          editing
            ? [
                { value: 'gasto', label: 'Gasto' },
                { value: 'ingreso', label: 'Ingreso' },
              ]
            : [
                { value: 'gasto', label: 'Gasto' },
                { value: 'ingreso', label: 'Ingreso' },
                { value: 'transferencia', label: 'Transfer.' },
              ]
        }
        value={uiType}
        onChange={handleTypeChange}
      />

      <Field label="Fecha">
        <DayStepper date={date} onChange={setDate} />
      </Field>

      {isTransfer ? (
        <TransferFields
          transferFrom={transferFrom}
          onTransferFrom={setTransferFrom}
          amount={amount}
          onAmount={setAmount}
          amountTo={amountTo}
          onAmountTo={setAmountTo}
          toCurrency={toCurrency}
          impliedRate={impliedRate}
          description={description}
          onDescription={setDescription}
        />
      ) : (
        <>
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
            <FormInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Supermercado"
            />
          </Field>

          <Field label="Categoría">
            <ChipGroup options={CATEGORIES[uiType]} value={category} onChange={setCategory} />
          </Field>
        </>
      )}

      <SaveButton label={editing ? 'Guardar' : 'Agregar'} disabled={!valid} onPress={handleSave} />

      {editing && <ConfirmDeleteButton label="Eliminar movimiento" onDelete={handleDelete} />}
    </Sheet>
  );
}

function TransferFields({
  transferFrom,
  onTransferFrom,
  amount,
  onAmount,
  amountTo,
  onAmountTo,
  toCurrency,
  impliedRate,
  description,
  onDescription,
}: {
  transferFrom: Currency;
  onTransferFrom: (c: Currency) => void;
  amount: string;
  onAmount: (v: string) => void;
  amountTo: string;
  onAmountTo: (v: string) => void;
  toCurrency: Currency;
  impliedRate: number | null;
  description: string;
  onDescription: (v: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Field label="Dirección">
        <SegmentedControl
          options={[
            { value: 'ARS', label: 'ARS → USD' },
            { value: 'USD', label: 'USD → ARS' },
          ]}
          value={transferFrom}
          onChange={onTransferFrom}
        />
      </Field>

      <Field label={`Sale de Caja ${transferFrom}`}>
        <FormInput
          big
          value={amount}
          onChangeText={onAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label={`Entra a Caja ${toCurrency}`}>
        <FormInput
          big
          value={amountTo}
          onChangeText={onAmountTo}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      {impliedRate !== null && (
        <Text style={styles.impliedRate}>
          Tipo de cambio implícito: ${Math.round(impliedRate).toLocaleString('es-AR')}
        </Text>
      )}

      <Field label="Descripción (opcional)">
        <FormInput
          value={description}
          onChangeText={onDescription}
          placeholder={transferFrom === 'ARS' ? 'Compra USD' : 'Venta USD'}
        />
      </Field>
    </>
  );
}

function TransferSummarySheet({
  visible,
  onClose,
  legs,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  legs: Movement[];
  onDelete: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const out = legs.find((m) => m.type === 'gasto');
  const inn = legs.find((m) => m.type === 'ingreso');
  return (
    <Sheet visible={visible} onClose={onClose} title="Transferencia">
      {out && inn && (
        <Text style={styles.transferSummary}>
          {out.description} · Salieron {formatMoney(out.amount, out.currency)} de Caja{' '}
          {out.currency} y entraron {formatMoney(inn.amount, inn.currency)} a Caja {inn.currency}.
        </Text>
      )}
      <Text style={styles.transferHint}>
        Las transferencias no se editan: si está mal cargada, eliminala (se borran las dos patas) y
        cargala de nuevo.
      </Text>
      <ConfirmDeleteButton label="Eliminar transferencia" onDelete={onDelete} />
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    impliedRate: {
      fontSize: font.label,
      color: c.muted,
      textAlign: 'center',
    },
    transferSummary: {
      fontSize: font.body,
      color: c.ink,
      lineHeight: 22,
    },
    transferHint: {
      fontSize: font.label,
      color: c.muted,
      lineHeight: 18,
    },
  });
