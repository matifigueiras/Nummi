import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Field, FormInput, SaveButton } from '../components/form';
import { Screen } from '../components/Screen';
import { useAuth } from '../store/AuthContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';

// Login sin contraseña: se manda un mail con un código de 6 dígitos (y
// también un link, que queda como alternativa). No hay pantalla de registro
// aparte — el primer login con un mail nuevo ya crea la cuenta.
//
// Se pide el código en vez de depender sólo del link porque Gmail (y otros)
// prefetchean/escanean los links de los mails por seguridad, lo que consume
// el token de un solo uso antes de que el usuario llegue a tocarlo — el
// código de texto no tiene ese problema.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { signInWithEmail, verifyCode } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emailValid = EMAIL_RE.test(email.trim());
  const codeValid = code.trim().length >= 6;

  const handleSend = async () => {
    if (!emailValid || busy) return;
    setBusy(true);
    setErrorMessage('');
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    if (error) {
      setErrorMessage(error);
    } else {
      setStep('code');
    }
  };

  const handleVerify = async () => {
    if (!codeValid || busy) return;
    setBusy(true);
    setErrorMessage('');
    const { error } = await verifyCode(email.trim(), code.trim());
    setBusy(false);
    // Sin error, AuthContext detecta la sesión nueva solo (onAuthStateChange)
    if (error) setErrorMessage(error);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Feather name="dollar-sign" size={28} color={colors.inverse} />
        </View>
        <Text style={styles.title}>Nummi</Text>
        <Text style={styles.subtitle}>Tus finanzas, sincronizadas en todos tus dispositivos</Text>
      </View>

      <Card>
        {step === 'email' ? (
          <>
            <Field label="Email">
              <FormInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="tu@email.com"
                keyboardType="email-address"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errorMessage !== '' && <Text style={styles.error}>{errorMessage}</Text>}
            </Field>
            <SaveButton
              label={busy ? 'Enviando…' : 'Enviar código de acceso'}
              disabled={!emailValid || busy}
              onPress={handleSend}
            />
          </>
        ) : (
          <>
            <View style={styles.sentBox}>
              <Feather name="mail" size={22} color={colors.accent} />
              <Text style={styles.sentTitle}>Revisá tu correo</Text>
              <Text style={styles.sentText}>
                Te mandamos un código a {email.trim()}. Escribilo acá abajo para entrar.
              </Text>
            </View>
            <Field label="Código de acceso">
              <FormInput
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, '').slice(0, 10));
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Código del mail"
                keyboardType="number-pad"
                inputMode="numeric"
                autoCorrect={false}
              />
              {errorMessage !== '' && <Text style={styles.error}>{errorMessage}</Text>}
            </Field>
            <SaveButton
              label={busy ? 'Verificando…' : 'Ingresar'}
              disabled={!codeValid || busy}
              onPress={handleVerify}
            />
            <Pressable
              onPress={() => {
                setStep('email');
                setCode('');
                setErrorMessage('');
              }}
              hitSlop={8}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>Usar otro mail / reenviar</Text>
            </Pressable>
          </>
        )}
      </Card>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xxl,
      marginBottom: spacing.lg,
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: font.title,
      fontWeight: '700',
      color: c.ink,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: font.body,
      color: c.secondary,
      textAlign: 'center',
    },
    error: {
      fontSize: font.label,
      color: c.danger,
    },
    sentBox: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    sentTitle: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    sentText: {
      fontSize: font.body,
      color: c.secondary,
      textAlign: 'center',
      lineHeight: 21,
    },
    backLink: {
      alignItems: 'center',
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },
    backLinkText: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.secondary,
    },
  });
