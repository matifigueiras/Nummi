import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useApp } from '../store/AppContext';
import { useThemedStyles } from '../store/ThemeContext';
import { font, ThemeColors } from '../theme';
import { Currency, Position, PositionKind } from '../types';
import { ConfirmDeleteButton, Field, FormInput, parseAmount, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  kind: PositionKind;
  /** Si viene, el modal edita esa posición en vez de crear una nueva */
  position?: Position | null;
}

export function NewPositionModal({ visible, onClose, kind, position }: Props) {
  const { addPosition, updatePosition, deletePosition, livePrices } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  const editing = position ?? null;
  const effectiveKind = editing?.kind ?? kind;

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTicker(editing.ticker);
      setName(editing.name);
      setCurrency(editing.currency);
      setQuantity(String(editing.quantity).replace('.', ','));
      setBuyPrice(String(editing.buyPrice).replace('.', ','));
      setCurrentPrice(String(editing.currentPrice).replace('.', ','));
    } else {
      setTicker('');
      setName('');
      setCurrency('USD');
      setQuantity('');
      setBuyPrice('');
      setCurrentPrice('');
    }
  }, [visible, editing]);

  const parsedQuantity = parseAmount(quantity);
  const parsedBuyPrice = parseAmount(buyPrice);
  const parsedCurrentPrice = parseAmount(currentPrice);
  const valid =
    ticker.trim().length > 0 && parsedQuantity > 0 && parsedBuyPrice > 0 && parsedCurrentPrice > 0;

  const handleSave = async () => {
    if (!valid) return;
    const data = {
      kind: effectiveKind,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      currency,
      quantity: parsedQuantity,
      buyPrice: parsedBuyPrice,
      currentPrice: parsedCurrentPrice,
    };
    if (editing) {
      await updatePosition({ ...data, id: editing.id });
    } else {
      await addPosition(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deletePosition(editing.id);
    onClose();
  };

  const noun = effectiveKind === 'accion' ? 'acción' : 'cripto';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? `Editar ${noun}` : `Nueva ${noun}`}
    >
      <Field label="Ticker">
        <FormInput
          value={ticker}
          onChangeText={setTicker}
          placeholder={effectiveKind === 'accion' ? 'Ej: AAPL' : 'Ej: BTC'}
          autoCapitalize="characters"
        />
      </Field>

      <Field label="Nombre (opcional)">
        <FormInput
          value={name}
          onChangeText={setName}
          placeholder={effectiveKind === 'accion' ? 'Ej: Apple' : 'Ej: Bitcoin'}
        />
      </Field>

      <Field label="Moneda de los precios">
        <SegmentedControl
          options={[
            { value: 'USD', label: 'USD' },
            { value: 'ARS', label: 'ARS' },
          ]}
          value={currency}
          onChange={setCurrency}
        />
      </Field>

      <Field label="Cantidad">
        <FormInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder={effectiveKind === 'accion' ? 'Ej: 10' : 'Ej: 0,05'}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label={`Precio de compra (${currency})`}>
        <FormInput
          value={buyPrice}
          onChangeText={setBuyPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label={`Precio actual (${currency})`}>
        <FormInput
          value={currentPrice}
          onChangeText={setCurrentPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
        {editing && livePrices.liveIds.includes(editing.id) && (
          <Text style={styles.liveHint}>
            Este precio se actualiza solo cada 5 minutos: lo que edites acá se va a sobrescribir.
          </Text>
        )}
      </Field>

      <SaveButton label={editing ? 'Guardar' : 'Agregar'} disabled={!valid} onPress={handleSave} />

      {editing && <ConfirmDeleteButton label={`Eliminar ${noun}`} onDelete={handleDelete} />}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    liveHint: {
      fontSize: font.caption + 1,
      color: c.accent,
      lineHeight: 16,
    },
  });
