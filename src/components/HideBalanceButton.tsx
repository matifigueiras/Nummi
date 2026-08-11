import React from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePrivacy } from '../store/PrivacyContext';
import { useTheme } from '../store/ThemeContext';

// Botón de ojo para tapar/mostrar montos, tipo Mercado Pago. El estado vive
// en PrivacyContext y es compartido entre Home, Cuentas y Patrimonio.

export function HideBalanceButton() {
  const { hidden, toggleHidden } = usePrivacy();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={toggleHidden}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Mostrar montos' : 'Ocultar montos'}
    >
      <Feather name={hidden ? 'eye-off' : 'eye'} size={16} color={colors.secondary} />
    </Pressable>
  );
}
