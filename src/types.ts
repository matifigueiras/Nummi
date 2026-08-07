export type Currency = 'ARS' | 'USD';

export type MovementType = 'ingreso' | 'gasto';

export interface Movement {
  id: string;
  /** Fecha en formato ISO yyyy-mm-dd */
  date: string;
  description: string;
  category: string;
  type: MovementType;
  currency: Currency;
  /** Siempre positivo; el signo lo da `type` */
  amount: number;
}

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  initialBalance: number;
}

export type PositionKind = 'accion' | 'cripto';

export interface Position {
  id: string;
  kind: PositionKind;
  ticker: string;
  name: string;
  quantity: number;
  /** Precio de compra unitario, en USD */
  buyPrice: number;
  /** Precio actual unitario, en USD */
  currentPrice: number;
}

export interface Property {
  id: string;
  name: string;
  /** Alquiler mensual, en USD */
  monthlyRent: number;
  /** Gastos mensuales (expensas, impuestos), en USD */
  monthlyExpenses: number;
  /** Valor estimado de la propiedad, en USD */
  estimatedValue: number;
}

export interface SavingsGoal {
  currency: Currency;
  /** Meta de ahorro mensual */
  amount: number;
}

export interface DolarRate {
  compra: number;
  venta: number;
  /** ISO timestamp de la última actualización según la API */
  fechaActualizacion: string;
}
