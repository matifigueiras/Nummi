import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { PositionKind } from '../types';
import { Field, FormInput, parseAmount, SaveButton } from './form';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  kind: PositionKind;
}

export function NewPositionModal({ visible, onClose, kind }: Props) {
  const { addPosition } = useApp();
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  const parsedQuantity = parseAmount(quantity);
  const parsedBuyPrice = parseAmount(buyPrice);
  const parsedCurrentPrice = parseAmount(currentPrice);
  const valid =
    ticker.trim().length > 0 && parsedQuantity > 0 && parsedBuyPrice > 0 && parsedCurrentPrice > 0;

  const reset = () => {
    setTicker('');
    setName('');
    setQuantity('');
    setBuyPrice('');
    setCurrentPrice('');
  };

  const handleSave = async () => {
    if (!valid) return;
    await addPosition({
      kind,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim().toUpperCase(),
      quantity: parsedQuantity,
      buyPrice: parsedBuyPrice,
      currentPrice: parsedCurrentPrice,
    });
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={kind === 'accion' ? 'Nueva acción' : 'Nueva cripto'}
    >
      <Field label="Ticker">
        <FormInput
          value={ticker}
          onChangeText={setTicker}
          placeholder={kind === 'accion' ? 'Ej: AAPL' : 'Ej: BTC'}
          autoCapitalize="characters"
        />
      </Field>

      <Field label="Nombre (opcional)">
        <FormInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'accion' ? 'Ej: Apple' : 'Ej: Bitcoin'}
        />
      </Field>

      <Field label="Cantidad">
        <FormInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder={kind === 'accion' ? 'Ej: 10' : 'Ej: 0,05'}
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label="Precio de compra (USD)">
        <FormInput
          value={buyPrice}
          onChangeText={setBuyPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <Field label="Precio actual (USD)">
        <FormInput
          value={currentPrice}
          onChangeText={setCurrentPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          inputMode="decimal"
        />
      </Field>

      <SaveButton label="Agregar" disabled={!valid} onPress={handleSave} />
    </Sheet>
  );
}
