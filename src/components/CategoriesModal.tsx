import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../store/AppContext';
import { useTheme, useThemedStyles } from '../store/ThemeContext';
import { font, radius, spacing, ThemeColors } from '../theme';
import { Category, MovementType } from '../types';
import { ConfirmDeleteButton, Field, FormInput, SaveButton } from './form';
import { SegmentedControl } from './SegmentedControl';
import { Sheet } from './Sheet';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CategoriesModal({ visible, onClose }: Props) {
  const { categories } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [type, setType] = useState<MovementType>('gasto');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  const list = categories.filter((c) => c.type === type);

  return (
    <>
      <Sheet visible={visible && editing === null} onClose={onClose} title="Categorías">
        <SegmentedControl
          options={[
            { value: 'gasto', label: 'De gastos' },
            { value: 'ingreso', label: 'De ingresos' },
          ]}
          value={type}
          onChange={setType}
        />

        <View style={styles.list}>
          {list.map((category) => (
            <Pressable
              key={category.id}
              style={styles.row}
              onPress={() => setEditing(category)}
            >
              <Text style={styles.name}>{category.name}</Text>
              <Feather name="edit-2" size={14} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.addRow} onPress={() => setEditing('new')}>
          <Feather name="plus" size={16} color={colors.accent} />
          <Text style={styles.addLabel}>Nueva categoría de {type === 'gasto' ? 'gasto' : 'ingreso'}</Text>
        </Pressable>
      </Sheet>

      <CategoryEditor
        visible={visible && editing !== null}
        onClose={() => setEditing(null)}
        category={editing === 'new' ? null : editing}
        type={type}
      />
    </>
  );
}

function CategoryEditor({
  visible,
  onClose,
  category,
  type,
}: {
  visible: boolean;
  onClose: () => void;
  category: Category | null;
  type: MovementType;
}) {
  const { movements, addCategory, updateCategory, deleteCategory } = useApp();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState('');

  React.useEffect(() => {
    if (visible) setName(category?.name ?? '');
  }, [visible, category]);

  const valid = name.trim().length > 0;
  const usedCount = category
    ? movements.filter((m) => m.category === category.name && m.type === category.type).length
    : 0;

  const handleSave = async () => {
    if (!valid) return;
    if (category) {
      await updateCategory({ ...category, name: name.trim() }, category.name);
    } else {
      await addCategory({ name: name.trim(), type });
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!category) return;
    await deleteCategory(category.id);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
    >
      <Field label="Nombre">
        <FormInput value={name} onChangeText={setName} placeholder="Ej: Gimnasio, Mascota" />
        {category && name.trim() !== category.name && usedCount > 0 && (
          <Text style={styles.hint}>
            Se renombrará también en {usedCount} movimiento{usedCount === 1 ? '' : 's'}.
          </Text>
        )}
      </Field>

      <SaveButton label={category ? 'Guardar' : 'Crear'} disabled={!valid} onPress={handleSave} />

      {category && (
        <>
          <ConfirmDeleteButton label="Eliminar categoría" onDelete={handleDelete} />
          <Text style={styles.hint}>
            {usedCount > 0
              ? `Los ${usedCount} movimiento${usedCount === 1 ? '' : 's'} que la usan la conservan; solo deja de ofrecerse al cargar.`
              : 'Deja de ofrecerse al cargar movimientos.'}
          </Text>
        </>
      )}
    </Sheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: {
      gap: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    name: {
      fontSize: font.body,
      color: c.ink,
      fontWeight: '500',
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
    },
    addLabel: {
      fontSize: font.label,
      fontWeight: '600',
      color: c.accent,
    },
    hint: {
      fontSize: font.caption + 1,
      color: c.muted,
      lineHeight: 16,
    },
  });
