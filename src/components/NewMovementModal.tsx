import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, ThemeColors } from '../theme';
import { Movement, MovementType } from '../types';
import { formatMoney, todayISO } from '../utils/format';
import { AccountPicker } from './AccountPicker';
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

type UiType = MovementType | 'transferencia';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Si viene, el modal edita ese movimiento en vez de crear uno nuevo */
  movement?: Movement | null;
  /** Cuenta preseleccionada al crear */
  defaultAccountId?: string;
}

export function NewMovementModal({ visible, onClose, movement, defaultAccountId }: Props) {
  const {
    accounts,
    movements,
    categories,
    addMovement,
    updateMovement,
    deleteMovement,
    addTransfer,
  } = useApp();
  // Nombres de categoría por tipo, según lo configurado en Más
  const categoryNames = (t: MovementType) =>
    categories.filter((c) => c.type === t).map((c) => c.name);
  const [uiType, setUiType] = useState<UiType>('gasto');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  // Transferencias
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [amountTo, setAmountTo] = useState('');

  const editing = movement ?? null;
  const editingTransfer = Boolean(editing?.transferId);

  // Al abrir: precargar si es edición, resetear si es alta
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setUiType(editing.type);
      setAccountId(editing.accountId);
      setAmount(String(editing.amount).replace('.', ','));
      setDescription(editing.description);
      setCategory(editing.category);
      setDate(editing.date);
    } else {
      const first = defaultAccountId ?? accounts[0]?.id ?? null;
      setUiType('gasto');
      setAccountId(first);
      setAmount('');
      setDescription('');
      setCategory(categoryNames('gasto')[0] ?? 'Otros');
      setDate(todayISO());
      setToAccountId(accounts.find((a) => a.id !== first)?.id ?? null);
      setAmountTo('');
    }
  }, [visible, editing, defaultAccountId, accounts]);

  const isTransfer = uiType === 'transferencia';
  const parsedAmount = parseAmount(amount);
  const parsedAmountTo = parseAmount(amountTo);

  const fromAccount = accounts.find((a) => a.id === accountId) ?? null;
  const toAccount = accounts.find((a) => a.id === toAccountId) ?? null;
  // Entre cuentas de la misma moneda el monto es uno solo
  const sameCurrency = fromAccount && toAccount && fromAccount.currency === toAccount.currency;

  const valid = isTransfer
    ? Boolean(fromAccount && toAccount && fromAccount.id !== toAccount.id) &&
      parsedAmount > 0 &&
      (sameCurrency || parsedAmountTo > 0)
    : Boolean(fromAccount) && parsedAmount > 0 && description.trim().length > 0;

  const handleTypeChange = (next: UiType) => {
    setUiType(next);
    if (next !== 'transferencia') {
      const options = categoryNames(next);
      if (!options.includes(category)) setCategory(options[0] ?? 'Otros');
    }
  };

  const handleSave = async () => {
    if (!valid || !fromAccount) return;
    if (isTransfer && toAccount) {
      await addTransfer({
        date,
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amountFrom: parsedAmount,
        amountTo: sameCurrency ? parsedAmount : parsedAmountTo,
        description: description.trim() || undefined,
      });
    } else if (editing) {
      await updateMovement({
        ...editing,
        date,
        description: description.trim(),
        category,
        type: uiType as MovementType,
        accountId: fromAccount.id,
        currency: fromAccount.currency,
        amount: parsedAmount,
      });
    } else {
      await addMovement({
        date,
        description: description.trim(),
        category,
        type: uiType as MovementType,
        accountId: fromAccount.id,
        currency: fromAccount.currency,
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

  const impliedRate =
    isTransfer && !sameCurrency && parsedAmount > 0 && parsedAmountTo > 0 && fromAccount
      ? fromAccount.currency === 'ARS'
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

      <Field label={isTransfer ? 'Sale de' : 'Cuenta'}>
        <AccountPicker
          accounts={accounts}
          selectedId={accountId}
          onSelect={(id) => {
            setAccountId(id);
            if (id === toAccountId) {
              setToAccountId(accounts.find((a) => a.id !== id)?.id ?? null);
            }
          }}
        />
      </Field>

      {isTransfer && (
        <Field label="Entra a">
          <AccountPicker
            accounts={accounts.filter((a) => a.id !== accountId)}
            selectedId={toAccountId}
            onSelect={setToAccountId}
          />
        </Field>
      )}

      <Field
        label={
          isTransfer && fromAccount
            ? `Monto (${fromAccount.currency})`
            : fromAccount
              ? `Monto (${fromAccount.currency})`
              : 'Monto'
        }
      >
        <FormInput
          big
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      {isTransfer && !sameCurrency && toAccount && (
        <Field label={`Entra (${toAccount.currency})`}>
          <FormInput
            big
            value={amountTo}
            onChangeText={setAmountTo}
            placeholder="0"
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </Field>
      )}

      {impliedRate !== null && (
        <ImpliedRate rate={impliedRate} />
      )}

      <Field label={isTransfer ? 'Descripción (opcional)' : 'Descripción'}>
        <FormInput
          value={description}
          onChangeText={setDescription}
          placeholder={
            isTransfer && fromAccount && toAccount
              ? `${fromAccount.name} → ${toAccount.name}`
              : 'Ej: Supermercado'
          }
        />
      </Field>

      {!isTransfer && (
        <Field label="Categoría">
          <ChipGroup
            options={categoryNames(uiType as MovementType)}
            value={category}
            onChange={setCategory}
          />
        </Field>
      )}

      <SaveButton label={editing ? 'Guardar' : 'Agregar'} disabled={!valid} onPress={handleSave} />

      {editing && <ConfirmDeleteButton label="Eliminar movimiento" onDelete={handleDelete} />}
    </Sheet>
  );
}

function ImpliedRate({ rate }: { rate: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.impliedRate}>
      Tipo de cambio implícito: ${Math.round(rate).toLocaleString('es-AR')}
    </Text>
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
  const { accounts } = useApp();
  const styles = useThemedStyles(makeStyles);
  const out = legs.find((m) => m.type === 'gasto');
  const inn = legs.find((m) => m.type === 'ingreso');
  const nameOf = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'cuenta eliminada';
  return (
    <Sheet visible={visible} onClose={onClose} title="Transferencia">
      {out && inn && (
        <Text style={styles.transferSummary}>
          Salieron {formatMoney(out.amount, out.currency)} de {nameOf(out.accountId)} y entraron{' '}
          {formatMoney(inn.amount, inn.currency)} a {nameOf(inn.accountId)}.
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
