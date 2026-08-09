import { Movement } from '../../types';
import { searchMovements } from '../search';

function movement(over: Partial<Movement>): Movement {
  return {
    id: 'm1',
    date: '2026-08-05',
    description: 'Supermercado Coto',
    category: 'Comida',
    accountId: 'caja-ars',
    type: 'gasto',
    currency: 'ARS',
    amount: 1000,
    ...over,
  };
}

describe('searchMovements', () => {
  it('encuentra por coincidencia parcial en la descripción', () => {
    const movements = [movement({ description: 'Café de especialidad' })];
    expect(searchMovements(movements, 'café')).toHaveLength(1);
  });

  it('encuentra por categoría', () => {
    const movements = [movement({ category: 'Transporte', description: 'Carga SUBE' })];
    expect(searchMovements(movements, 'transporte')).toHaveLength(1);
  });

  it('no distingue mayúsculas de minúsculas', () => {
    const movements = [movement({ description: 'Alquiler depto' })];
    expect(searchMovements(movements, 'ALQUILER')).toHaveLength(1);
  });

  // El teclado en español a veces se escribe sin tildes
  it('ignora acentos tanto en el texto como en la búsqueda', () => {
    const movements = [movement({ description: 'Café de especialidad' })];
    expect(searchMovements(movements, 'cafe')).toHaveLength(1);
    const conTilde = [movement({ description: 'Cafe sin tilde' })];
    expect(searchMovements(conTilde, 'café')).toHaveLength(1);
  });

  it('devuelve todos los movimientos con la búsqueda vacía', () => {
    const movements = [movement({}), movement({ id: 'm2' })];
    expect(searchMovements(movements, '')).toHaveLength(2);
    expect(searchMovements(movements, '   ')).toHaveLength(2);
  });

  it('devuelve un array vacío cuando nada coincide', () => {
    const movements = [movement({ description: 'Supermercado Coto' })];
    expect(searchMovements(movements, 'gimnasio')).toHaveLength(0);
  });

  it('no rompe con texto que tenga caracteres especiales de regex', () => {
    const movements = [movement({ description: 'Precio (oferta)' })];
    expect(() => searchMovements(movements, '(oferta)')).not.toThrow();
    expect(searchMovements(movements, '(oferta)')).toHaveLength(1);
  });
});
