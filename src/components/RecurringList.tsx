import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { RecurringMovement } from '../types';
import { formatMoney } from '../utils/format';
import { Card } from './Card';
import { RecurringModal } from './RecurringModal';

// Lista de movimientos fijos: los que la app carga sola todos los meses.

export function RecurringList() {
  const { recurrings } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [modal, setModal] = useState<{ recurring: RecurringMovement | null } | null>(null);

  const monthlyNote =
    recurrings.filter((r) => r.active).length > 0
      ? `${recurrings.filter((r) => r.active).length} activos`
      : null;

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Movimientos fijos</Text>
            {monthlyNote && <Text style={styles.subtitle}>{monthlyNote}</Text>}
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => setModal({ recurring: null })}
            hitSlop={6}
          >
            <Feather name="plus" size={18} color={colors.ink} />
          </Pressable>
        </View>

        {recurrings.length === 0 ? (
          <Text style={styles.empty}>
            El sueldo, el alquiler o las suscripciones se repiten todos los meses. Cargalos una vez
            y la app los registra sola cuando llega el día.
          </Text>
        ) : (
          recurrings.map((item) => (
            <Pressable
              key={item.id}
              style={styles.row}
              onPress={() => setModal({ recurring: item })}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      item.type === 'ingreso' ? colors.incomeSoft : colors.expenseSoft,
                  },
                ]}
              >
                <Feather
                  name="repeat"
                  size={15}
                  color={item.type === 'ingreso' ? colors.incomeText : colors.expenseText}
                />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, !item.active && styles.inactive]} numberOfLines={1}>
                  {item.description}
                </Text>
                <Text style={styles.meta}>
                  Día {item.dayOfMonth} · {item.category}
                  {item.active ? '' : ' · pausado'}
                </Text>
              </View>
              <Text
                style={[
                  styles.amount,
                  {
                    color:
                      item.type === 'ingreso'
                        ? colors.incomeText
                        : item.active
                          ? colors.ink
                          : colors.muted,
                  },
                ]}
              >
                {formatMoney(item.amount, item.currency)}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <RecurringModal
        visible={modal !== null}
        onClose={() => setModal(null)}
        recurring={modal?.recurring ?? null}
      />
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    subtitle: {
      fontSize: font.caption + 1,
      color: c.muted,
      marginTop: 1,
    },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: font.label,
      color: c.muted,
      lineHeight: 19,
      paddingVertical: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      gap: 1,
    },
    name: {
      fontSize: font.body,
      fontWeight: '600',
      color: c.ink,
    },
    inactive: {
      color: c.muted,
    },
    meta: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
    amount: {
      fontSize: font.body,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
