export type Currency = 'ARS' | 'USD';

export type MovementType = 'ingreso' | 'gasto';

export interface Movement {
  id: string;
  /** Fecha en formato ISO yyyy-mm-dd */
  date: string;
  description: string;
  category: string;
  type: MovementType;
  /** Cuenta a la que pertenece el movimiento */
  accountId: string;
  /** Redundante con la moneda de la cuenta, pero evita buscarla para formatear */
  currency: Currency;
  /** Siempre positivo; el signo lo da `type` */
  amount: number;
  /** Si nació de un movimiento fijo, cuál (evita generarlo dos veces) */
  recurringId?: string;
  /**
   * Si está presente, este movimiento es una pata de una transferencia entre
   * cajas (ej: compra de USD = gasto ARS + ingreso USD con el mismo id).
   * Las transferencias cuentan para los saldos pero NO para las estadísticas
   * de ingresos/gastos del mes.
   */
  transferId?: string;
}

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  /** Saldo previo a los movimientos registrados en la app */
  initialBalance: number;
}

export type PositionKind = 'accion' | 'cripto';

export interface Position {
  id: string;
  kind: PositionKind;
  ticker: string;
  name: string;
  quantity: number;
  /** Moneda en la que cotizan los precios (ej: CEDEARs y acciones locales en ARS) */
  currency: Currency;
  /** Precio de compra unitario */
  buyPrice: number;
  /** Precio actual unitario */
  currentPrice: number;
}

// Cada monto de una propiedad tiene su propia moneda: es común que el valor
// esté en USD pero el alquiler y los gastos se cobren/paguen en ARS.
export interface Property {
  id: string;
  name: string;
  /** Alquiler mensual */
  monthlyRent: number;
  rentCurrency: Currency;
  /** Gastos mensuales (expensas, impuestos) */
  monthlyExpenses: number;
  expensesCurrency: Currency;
  /** Valor estimado de la propiedad */
  estimatedValue: number;
  valueCurrency: Currency;
}

/**
 * Movimiento que se repite todos los meses (sueldo, alquiler, suscripciones).
 * La app lo carga sola cuando llega el día, así no hay que registrarlo a mano
 * mes a mes.
 */
export interface RecurringMovement {
  id: string;
  description: string;
  category: string;
  type: MovementType;
  accountId: string;
  currency: Currency;
  amount: number;
  /** Día del mes en que ocurre (1-31; se recorta al último día si el mes es más corto) */
  dayOfMonth: number;
  /** Pausado: deja de generar movimientos sin perder la definición */
  active: boolean;
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
