/**
 * Mapeo de ELO solicitado por el usuario a parámetros de Stockfish.
 * Stockfish Skill Level: 0-20
 * Depth: profundidad de búsqueda
 */

const ELO_RANGES = [
  { min: 100, max: 400, skillLevel: 0, depth: 1, label: 'Principiante absoluto' },
  { min: 401, max: 600, skillLevel: 2, depth: 2, label: 'Principiante' },
  { min: 601, max: 800, skillLevel: 4, depth: 3, label: 'Casual bajo' },
  { min: 801, max: 1000, skillLevel: 6, depth: 5, label: 'Casual' },
  { min: 1001, max: 1200, skillLevel: 8, depth: 7, label: 'Aficionado bajo' },
  { min: 1201, max: 1400, skillLevel: 10, depth: 9, label: 'Aficionado' },
  { min: 1401, max: 1600, skillLevel: 12, depth: 11, label: 'Intermedio' },
  { min: 1601, max: 1800, skillLevel: 14, depth: 13, label: 'Avanzado bajo' },
  { min: 1801, max: 2000, skillLevel: 16, depth: 15, label: 'Avanzado' },
  { min: 2001, max: 2200, skillLevel: 18, depth: 17, label: 'Experto' },
  { min: 2201, max: 2500, skillLevel: 19, depth: 19, label: 'Maestro' },
  { min: 2501, max: 3000, skillLevel: 20, depth: 22, label: 'Gran Maestro' },
];

const MIN_ELO = 100;
const MAX_ELO = 3000;
const DEFAULT_ELO = 1200;

/**
 * Mapea un valor ELO a parámetros de Stockfish
 * @param {number} elo - ELO solicitado (100-3000)
 * @returns {{ skillLevel: number, depth: number, label: string, elo: number }}
 */
function mapEloToStockfish(elo) {
  const clampedElo = Math.max(MIN_ELO, Math.min(MAX_ELO, elo));

  const range = ELO_RANGES.find(r => clampedElo >= r.min && clampedElo <= r.max);

  if (!range) {
    // Fallback al rango más cercano
    return {
      skillLevel: 10,
      depth: 9,
      label: 'Aficionado',
      elo: clampedElo,
    };
  }

  return {
    skillLevel: range.skillLevel,
    depth: range.depth,
    label: range.label,
    elo: clampedElo,
  };
}

/**
 * Valida que un ELO esté en rango
 * @param {number} elo
 * @returns {boolean}
 */
function isValidElo(elo) {
  return typeof elo === 'number' && elo >= MIN_ELO && elo <= MAX_ELO;
}

/**
 * Devuelve la etiqueta descriptiva para un ELO
 * @param {number} elo
 * @returns {string}
 */
function getEloLabel(elo) {
  const { label } = mapEloToStockfish(elo);
  return label;
}

module.exports = {
  mapEloToStockfish,
  isValidElo,
  getEloLabel,
  MIN_ELO,
  MAX_ELO,
  DEFAULT_ELO,
  ELO_RANGES,
};
