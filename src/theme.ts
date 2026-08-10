// Design tokens de Nummi. Todo el estilo visual sale de acá — no hardcodear
// colores ni espaciados en los componentes. Los colores se consumen vía
// useTheme()/useThemedStyles() (src/store/ThemeContext.tsx), nunca importando
// una paleta directamente.

export interface ThemeColors {
  bg: string;
  card: string;
  ink: string;
  secondary: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  income: string;
  incomeText: string;
  incomeSoft: string;
  expense: string;
  expenseText: string;
  expenseSoft: string;
  /** Tercer color categórico, sólo para el donut de composición de Patrimonio */
  investment: string;
  inkSoft: string;
  danger: string;
  dangerSoft: string;
  /** Estado "atención" (ej: cotización desactualizada) — siempre con ícono + texto */
  warningText: string;
  warningSoft: string;
  /** Texto/ícono sobre fondos `ink` (FAB, chips activos) */
  inverse: string;
}

// Pares ingresos/gastos validados para daltonismo y contraste sobre la
// superficie de cada modo (light: ΔE CVD 11.3 · dark: ΔE CVD 9.8, ambos ≥3:1).
export const lightColors: ThemeColors = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  ink: '#0F172A',
  secondary: '#475569',
  muted: '#8A94A6',
  border: '#E8EAEE',
  accent: '#0E9F6E',
  accentSoft: '#E6F5EF',
  income: '#0E9F6E',
  incomeText: '#0A7A54',
  incomeSoft: '#E6F5EF',
  expense: '#E8590C',
  expenseText: '#C2410C',
  expenseSoft: '#FDEEE3',
  investment: '#2563EB',
  inkSoft: '#EEF1F5',
  danger: '#DC2626',
  dangerSoft: '#FEE9E9',
  warningText: '#92400E',
  warningSoft: '#FEF3C7',
  inverse: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  bg: '#0D0F14',
  card: '#171A21',
  ink: '#F2F4F8',
  secondary: '#A6AFBE',
  muted: '#6E7787',
  border: '#262C37',
  accent: '#15A06E',
  accentSoft: '#143126',
  income: '#15A06E',
  incomeText: '#3ECF96',
  incomeSoft: '#143126',
  expense: '#E56A1F',
  expenseText: '#F08B4E',
  expenseSoft: '#33231A',
  investment: '#3B82F6',
  inkSoft: '#222834',
  danger: '#F87171',
  dangerSoft: '#3B2023',
  warningText: '#FBBF24',
  warningSoft: '#39301A',
  inverse: '#171A21',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  full: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  fab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

export const font = {
  title: 26,
  heading: 19,
  body: 15,
  label: 13,
  caption: 11,
} as const;
