/**
 * Servicio de lógica de ajedrez usando chess.js.
 * Wrapper que integra la validación de movimientos con la notación española.
 */

const { Chess } = require('chess.js');
const { parseSpanishMove, moveToSpanish, describeBoardState } = require('../utils/spanish-notation');

/**
 * Crea una nueva instancia de partida.
 * @param {string} [fen] - Posición FEN opcional
 * @returns {Chess}
 */
function createGame(fen) {
  return fen ? new Chess(fen) : new Chess();
}

/**
 * Intenta realizar un movimiento a partir de un comando de voz en español.
 *
 * @param {Chess} chess - Instancia de chess.js
 * @param {string} voiceInput - Texto del comando de voz
 * @returns {{ success: boolean, move?: object, san?: string, description?: string, error?: string }}
 */
function makePlayerMove(chess, voiceInput) {
  const parsed = parseSpanishMove(voiceInput);

  if (parsed.type === 'error') {
    return { success: false, error: parsed.error };
  }

  let move = null;

  try {
    if (parsed.type === 'san') {
      // Notación algebraica: "Nf3", "O-O", etc.
      move = chess.move(parsed.san);
    } else if (parsed.type === 'coordinates') {
      // Notación por coordenadas: { from: 'e2', to: 'e4' }
      const moveObj = { from: parsed.from, to: parsed.to };
      if (parsed.promotion) {
        moveObj.promotion = parsed.promotion;
      }
      move = chess.move(moveObj);
    }
  } catch (e) {
    // chess.js lanza error en movimientos ilegales
    return {
      success: false,
      error: `Movimiento ilegal. ${getHelpForPosition(chess)}`,
    };
  }

  if (!move) {
    return {
      success: false,
      error: `No pude ejecutar ese movimiento. ${getHelpForPosition(chess)}`,
    };
  }

  return {
    success: true,
    move,
    san: move.san,
    description: moveToSpanish(move.san, move),
  };
}

/**
 * Aplica un movimiento del motor (en formato UCI: "e2e4" o SAN: "Nf3").
 *
 * @param {Chess} chess
 * @param {string} engineMove - Movimiento del motor (UCI o SAN)
 * @returns {{ success: boolean, move?: object, description?: string }}
 */
function makeEngineMove(chess, engineMove) {
  let move = null;

  try {
    // Primero intentar como SAN
    move = chess.move(engineMove);
  } catch {
    try {
      // Intentar como coordenadas UCI (e.g., "e2e4", "e7e8q")
      const from = engineMove.substring(0, 2);
      const to = engineMove.substring(2, 4);
      const promotion = engineMove.length > 4 ? engineMove[4] : undefined;
      move = chess.move({ from, to, promotion });
    } catch {
      return { success: false, error: `Motor produjo un movimiento inválido: ${engineMove}` };
    }
  }

  if (!move) {
    return { success: false, error: `Motor produjo un movimiento inválido: ${engineMove}` };
  }

  return {
    success: true,
    move,
    description: moveToSpanish(move.san, move),
  };
}

/**
 * Comprueba el estado de la partida.
 * @param {Chess} chess
 * @returns {{ isOver: boolean, result: string, description: string }}
 */
function checkGameState(chess) {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'negras' : 'blancas';
    const result = chess.turn() === 'w' ? 'loss' : 'win'; // Si es turno de blancas y es mate, negras ganan → player pierde
    return {
      isOver: true,
      result,
      description: `¡Jaque mate! Ganan las ${winner}.`,
    };
  }

  if (chess.isStalemate()) {
    return {
      isOver: true,
      result: 'draw',
      description: 'Tablas por ahogado. No hay movimientos legales.',
    };
  }

  if (chess.isDraw()) {
    let reason = 'Tablas';
    if (chess.isThreefoldRepetition()) reason = 'Tablas por triple repetición';
    else if (chess.isInsufficientMaterial()) reason = 'Tablas por material insuficiente';
    return {
      isOver: true,
      result: 'draw',
      description: `${reason}.`,
    };
  }

  let description = '';
  if (chess.isCheck()) {
    description = '¡Jaque! ';
  }

  return {
    isOver: false,
    result: 'in_progress',
    description,
  };
}

/**
 * Genera una sugerencia de ayuda para la posición actual.
 */
function getHelpForPosition(chess) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return 'No hay movimientos legales.';

  // Mostrar hasta 3 movimientos posibles como ejemplo
  const examples = moves.slice(0, 3).map(m => m.san);
  return `Movimientos posibles: ${examples.join(', ')}, entre otros.`;
}

/**
 * Obtiene un resumen verbal del tablero.
 */
function getBoardSummary(chess) {
  const turn = chess.turn() === 'w' ? 'blancas' : 'negras';
  const moveNumber = Math.ceil(chess.moveNumber());
  const totalMoves = chess.history().length;

  let summary = `Movimiento ${moveNumber}. Turno de las ${turn}. `;
  summary += `Se han jugado ${totalMoves} jugadas. `;

  if (chess.isCheck()) {
    summary += '¡Estás en jaque! ';
  }

  // Contar material
  const board = chess.board();
  const material = { w: [], b: [] };
  const PIECE_NAMES = { k: 'Rey', q: 'Dama', r: 'Torre', b: 'Alfil', n: 'Caballo', p: 'Peón' };

  for (const row of board) {
    for (const square of row) {
      if (square) {
        material[square.color].push(PIECE_NAMES[square.type]);
      }
    }
  }

  summary += `Tus piezas: ${material.w.join(', ')}. `;
  summary += `Piezas del motor: ${material.b.join(', ')}.`;

  return summary;
}

/**
 * Obtiene las últimas N jugadas en español.
 */
function getRecentMoves(chess, count = 4) {
  const history = chess.history({ verbose: true });
  if (history.length === 0) return 'Aún no se han realizado jugadas.';

  const recent = history.slice(-count);
  return recent.map((move, i) => {
    const color = move.color === 'w' ? 'Blancas' : 'Negras';
    return `${color}: ${moveToSpanish(move.san, move)}`;
  }).join('. ');
}

module.exports = {
  createGame,
  makePlayerMove,
  makeEngineMove,
  checkGameState,
  getBoardSummary,
  getRecentMoves,
  getHelpForPosition,
};
