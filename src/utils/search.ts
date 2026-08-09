import { Movement } from '../types';

// Rango Unicode de los signos diacríticos combinados (acentos, tildes) que
// quedan sueltos después de normalizar con NFD.
const DIACRITICS = /[̀-ͯ]/g;

/** Minúsculas y sin acentos, para comparar sin importar cómo se haya escrito */
function normalize(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

/**
 * Filtra movimientos cuya descripción o categoría contengan `query`, sin
 * importar mayúsculas ni acentos ("cafe" encuentra "Café"). Con `query`
 * vacío (o solo espacios) devuelve todos los movimientos sin tocar.
 */
export function searchMovements(movements: Movement[], query: string): Movement[] {
  const q = normalize(query.trim());
  if (q === '') return movements;
  return movements.filter(
    (m) => normalize(m.description).includes(q) || normalize(m.category).includes(q),
  );
}
