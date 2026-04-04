/**
 * MoveHandler - Procesa un movimiento del jugador y responde con la jugada del motor.
 *
 * Soporta:
 *  - Notación algebraica española: "Caballo f3", "Peón e4"
 *  - Notación por coordenadas: "de e2 a e4"
 *  - Enroques: "enroque corto", "enroque largo"
 *  - Capturas: "Alfil captura en e5"
 *  - Coronación: "Peón e8 corona dama"
 */

const { Chess } = require('chess.js');
const chessService = require('../services/chess-service');
const db = require('../services/db-service');
const { getBestMove } = require('../engine/stockfish-manager');
const { mapEloToStockfish, DEFAULT_ELO } = require('../utils/elo-mapper');

const MoveHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'MoveIntent'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Verificar que hay usuario y partida activa
    if (!sessionAttributes.userId) {
      return handlerInput.responseBuilder
        .speak('Primero dime quién eres. ¿Cómo te llamas?')
        .reprompt('Dime tu nombre.')
        .getResponse();
    }

    if (!sessionAttributes.activeGameId) {
      return handlerInput.responseBuilder
        .speak('No tienes una partida en curso. Di "nueva partida" para empezar.')
        .reprompt('Di "nueva partida".')
        .getResponse();
    }

    // Construir el comando de voz a partir de los slots
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    let voiceCommand = buildVoiceCommand(slots);

    if (!voiceCommand) {
      return handlerInput.responseBuilder
        .speak('No he entendido tu movimiento. Puedes decir, por ejemplo: "Peón e4", "Caballo f3", "de e2 a e4", o "enroque corto".')
        .reprompt('Di tu movimiento.')
        .getResponse();
    }

    // Cargar posición actual
    const chess = new Chess();
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    
    if (sessionAttributes.currentPgn) {
      chess.loadPgn(sessionAttributes.currentPgn);
    } else if (sessionAttributes.currentFen && sessionAttributes.currentFen !== START_FEN) {
      chess.load(sessionAttributes.currentFen);
    }
    // Si es START_FEN o no hay nada, new Chess() ya está en la posición inicial correcta sin flags de FEN.

    // Verificar que es turno de blancas (jugador siempre es blancas)
    if (chess.turn() !== 'w') {
      return handlerInput.responseBuilder
        .speak('No es tu turno. Espera la respuesta del motor.')
        .reprompt('Espera a que el motor juegue.')
        .getResponse();
    }

    // Ejecutar movimiento del jugador
    const playerResult = chessService.makePlayerMove(chess, voiceCommand);

    if (!playerResult.success) {
      return handlerInput.responseBuilder
        .speak(`${playerResult.error} Inténtalo de nuevo.`)
        .reprompt('Di tu movimiento. Por ejemplo: "Peón e4".')
        .getResponse();
    }

    let speechOutput = `Tu jugada: ${playerResult.description}. `;

    // Verificar estado después del movimiento del jugador
    const stateAfterPlayer = chessService.checkGameState(chess);
    if (stateAfterPlayer.isOver) {
      // Partida terminada por movimiento del jugador
      await finishGame(sessionAttributes, chess, stateAfterPlayer.result, handlerInput);

      speechOutput += stateAfterPlayer.description;
      speechOutput += await getGameEndSummary(sessionAttributes, stateAfterPlayer.result);

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt('Di "nueva partida" para jugar otra vez.')
        .getResponse();
    }

    const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;
    const params = mapEloToStockfish(engineElo);

    let engineMoveUCI;
    let engineDescription = '';

    try {
      engineMoveUCI = await getBestMove(
        chess.fen(),
        params.skillLevel,
        params.depth,
        3000
      );
    } catch (error) {
      console.error('Stockfish error:', error);
      // Fallback: movimiento aleatorio
      const legalMoves = chess.moves();
      if (legalMoves.length > 0) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const fallbackResult = chessService.makeEngineMove(chess, randomMove);
        if (fallbackResult.success) {
          engineDescription = fallbackResult.description;
          speechOutput += 'He tenido un problema con el motor, así que jugaré un movimiento básico. ';
        }
      }
      engineMoveUCI = null; // Mark as already handled or failed
    }

    // Aplicar movimiento del motor (si no se hizo en el fallback)
    if (engineMoveUCI) {
      const engineResult = chessService.makeEngineMove(chess, engineMoveUCI);
      if (engineResult.success) {
        engineDescription = engineResult.description;
      } else {
        // Fallback si el motor dio un movimiento inválido
        const legalMoves = chess.moves();
        if (legalMoves.length > 0) {
          const fallbackMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          const fallbackResult = chessService.makeEngineMove(chess, fallbackMove);
          if (fallbackResult.success) {
            engineDescription = fallbackResult.description;
            speechOutput += 'El motor sugirió una jugada inválida, así que he hecho un movimiento básico. ';
          }
        }
      }
    }

    if (engineDescription) {
      speechOutput += `Mi jugada: ${engineDescription}. `;
    }

    // Verificar estado después del movimiento del motor
    const stateAfterEngine = chessService.checkGameState(chess);
    if (stateAfterEngine.isOver) {
      await finishGame(sessionAttributes, chess, stateAfterEngine.result, handlerInput);

      speechOutput += stateAfterEngine.description;
      speechOutput += await getGameEndSummary(sessionAttributes, stateAfterEngine.result);

      return handlerInput.responseBuilder
        .speak(speechOutput)
        .reprompt('Di "nueva partida" para jugar otra vez.')
        .getResponse();
    }

    // Guardar estado
    if (stateAfterEngine.description) {
      speechOutput += stateAfterEngine.description;
    }
    speechOutput += 'Te toca.';

    sessionAttributes.currentFen = chess.fen();
    sessionAttributes.currentPgn = chess.pgn();
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    // Persistir en DB
    await db.updateGame(sessionAttributes.activeGameId, {
      fen: chess.fen(),
      pgn: chess.pgn(),
      moves_count: chess.history().length,
    });

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Di tu siguiente movimiento.')
      .getResponse();
  },
};

/**
 * Construye el comando de voz a partir de los slots del intent.
 */
function buildVoiceCommand(slots) {
  if (!slots) return null;

  const piece = slots.Piece?.value || '';
  const sourceColumn = slots.SourceColumn?.value || '';
  const sourceRow = slots.SourceRow?.value || '';
  const targetColumn = slots.TargetColumn?.value || '';
  const targetRow = slots.TargetRow?.value || '';
  const action = slots.Action?.value || '';
  const castling = slots.Castling?.value || '';
  const promotion = slots.Promotion?.value || '';

  // Enroque
  if (castling) {
    return castling;
  }

  // Notación por coordenadas: "de {source} a {target}"
  if (sourceColumn && sourceRow && targetColumn && targetRow) {
    let cmd = `de ${sourceColumn}${sourceRow} a ${targetColumn}${targetRow}`;
    if (promotion) cmd += ` corona ${promotion}`;
    return cmd;
  }

  // Notación algebraica: "{Pieza} {target}"
  if (targetColumn && targetRow) {
    let cmd = '';
    if (piece) cmd += `${piece} `;
    if (action) cmd += `${action} `;
    cmd += `${targetColumn}${targetRow}`;
    if (promotion) cmd += ` corona ${promotion}`;
    return cmd.trim() || null;
  }

  // Fallback: concatenar todo
  const parts = [piece, action, sourceColumn, sourceRow, targetColumn, targetRow, promotion].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Finaliza una partida y actualiza estadísticas.
 */
async function finishGame(sessionAttributes, chess, result, handlerInput) {
  const gameId = sessionAttributes.activeGameId;
  const userId = sessionAttributes.userId;
  const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;

  // Actualizar partida
  await db.updateGame(gameId, {
    fen: chess.fen(),
    pgn: chess.pgn(),
    moves_count: chess.history().length,
    result,
    finished_at: new Date().toISOString(),
  });

  // Calcular puntos
  let pointsGained = 0;
  const updates = {};

  if (result === 'win') {
    pointsGained = engineElo; // 1.0 * engineElo
    updates.wins = (sessionAttributes.userWins || 0) + 1;
  } else if (result === 'draw') {
    pointsGained = Math.floor(engineElo * 0.5); // 0.5 * engineElo
    updates.draws = (sessionAttributes.userDraws || 0) + 1;
  } else if (result === 'loss') {
    pointsGained = 0;
    updates.losses = (sessionAttributes.userLosses || 0) + 1;
  }

  // Actualizar usuario
  const user = await db.getUserById(userId);
  if (user) {
    updates.total_points = (user.total_points || 0) + pointsGained;
    updates.active_game_id = null;
    if (updates.wins !== undefined) updates.wins = (user.wins || 0) + 1;
    if (updates.losses !== undefined) updates.losses = (user.losses || 0) + 1;
    if (updates.draws !== undefined) updates.draws = (user.draws || 0) + 1;
    await db.updateUser(userId, updates);
  }

  // Limpiar sesión
  sessionAttributes.activeGameId = null;
  sessionAttributes.currentFen = null;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * Genera un resumen de fin de partida.
 */
async function getGameEndSummary(sessionAttributes, result) {
  const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;

  if (result === 'win') {
    return ` ¡Felicidades, ${sessionAttributes.userName}! Has ganado ${engineElo} puntos de ranking. Di "nueva partida" para jugar otra vez.`;
  } else if (result === 'draw') {
    return ` Tablas. Has ganado ${Math.floor(engineElo * 0.5)} puntos de ranking. Di "nueva partida" para jugar otra vez.`;
  } else {
    return ` Has perdido. No ganas puntos de ranking. ¡Inténtalo de nuevo! Di "nueva partida".`;
  }
}

module.exports = MoveHandler;
