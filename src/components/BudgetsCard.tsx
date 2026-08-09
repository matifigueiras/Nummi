import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { BudgetProgress } from '../utils/calc';
import { formatMoney } from '../utils/format';
import { BudgetsModal } from './BudgetsModal';
import { Card } from './Card';

// Avance de los presupuestos del mes. El estado se comunica con ícono + texto
// además del color, para no depender sólo del color.

interface Props {
  progress: BudgetProgress[];
  /** Sólo se ofrece editar en el mes en curso */
  editable: boolean;
}

export function BudgetsCard({ progress, editable }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [showModal, setShowModal] = useState(false);

  const exceeded = progress.filter((p) => p.status === 'excedido').length;

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Presupuestos</Text>
          {exceeded > 0 && (
            <Text style={styles.subtitle}>
              {exceeded} excedido{exceeded === 1 ? '' : 's'}
            </Text>
          )}
        </View>
        {editable && (
          <Pressable style={styles.editButton} onPress={() => setShowModal(true)} hitSlop={6}>
            <Feather name="edit-2" size={14} color={colors.secondary} />
          </Pressable>
        )}
      </View>

      {progress.length === 0 ? (
        <Pressable onPress={() => editable && setShowModal(true)}>
          <Text style={styles.empty}>
            Poné un límite mensual a las categorías que querés controlar y mirá cuánto te queda.
          </Text>
        </Pressable>
      ) : (
        <View style={styles.list}>
          {progress.map((item) => (
            <BudgetRow key={item.category} item={item} />
          ))}
        </View>
      )}

      <BudgetsModal visible={showModal} onClose={() => setShowModal(false)} />
    </Card>
  );
}

function BudgetRow({ item }: { item: BudgetProgress }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const tone =
    item.status === 'excedido'
      ? colors.danger
      : item.status === 'cerca'
        ? colors.warningText
        : colors.accent;

  const note =
    item.status === 'excedido'
      ? `${formatMoney(Math.abs(item.remaining), 'ARS')} de más`
      : `Quedan ${formatMoney(item.remaining, 'ARS')}`;

  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.amounts}>
          {formatMoney(item.spent, 'ARS')} / {formatMoney(item.limit, 'ARS')}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(item.ratio, 1) * 100}%`, backgroundColor: tone },
          ]}
        />
      </View>
      <View style={styles.noteRow}>
        {item.status !== 'ok' && (
          <Feather
            name={item.status === 'excedido' ? 'alert-circle' : 'alert-triangle'}
            size={11}
            color={tone}
          />
        )}
        <Text style={[styles.note, item.status !== 'ok' && { color: tone }]}>
          {note} · {Math.round(item.ratio * 100)}%
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: font.heading,
      fontWeight: '700',
      color: c.ink,
    },
    subtitle: {
      fontSize: font.caption + 1,
      color: c.danger,
      fontWeight: '600',
      marginTop: 1,
    },
    editButton: {
      width: 30,
      height: 30,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: font.label,
      color: c.muted,
      lineHeight: 19,
    },
    list: {
      gap: spacing.lg,
    },
    item: {
      gap: 5,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    category: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.ink,
    },
    amounts: {
      fontSize: font.caption + 1,
      color: c.secondary,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: c.inkSoft,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.full,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    note: {
      fontSize: font.caption + 1,
      color: c.muted,
    },
  });
