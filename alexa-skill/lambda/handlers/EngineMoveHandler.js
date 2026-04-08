/**
 * EngineMoveHandler - Procesa el evento automático de APL tras 8 segundos.
 * Aplica la jugada del jugador que estaba pendiente y genera la respuesta del motor.
 */

const { Chess } = require('chess.js');
const chessService = require('../services/chess-service');
const db = require('../services/db-service');
const { getBestMove } = require('../engine/stockfish-manager');
const { mapEloToStockfish, DEFAULT_ELO } = require('../utils/elo-mapper');
const { finishGame, getGameEndSummary } = require('../utils/game-utils');

const EngineMoveHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'Alexa.Presentation.APL.UserEvent' &&
      handlerInput.requestEnvelope.request.arguments &&
      handlerInput.requestEnvelope.request.arguments[0] === 'engineMoveRequested'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const pending = sessionAttributes.pendingPlayerMove;

    if (!pending) {
      console.warn('EngineMoveHandler called without pending move.');
      return handlerInput.responseBuilder
        .speak('Lo siento, no tengo una jugada pendiente que procesar.')
        .getResponse();
    }

    // Cargar posición anterior al movimiento del jugador
    const chess = new Chess();
    try {
      if (pending.pgn) {
        chess.loadPgn(pending.pgn);
      } else if (pending.fen) {
        chess.load(pending.fen);
      }
    } catch (e) {
      console.error('Error loading position in EngineMoveHandler:', e);
      delete sessionAttributes.pendingPlayerMove;
      return handlerInput.responseBuilder.speak('Error al recuperar la posición de la partida.').getResponse();
    }

    // APLICAR primero el movimiento del jugador (ahora que pasaron los 4s)
    const playerResult = chessService.makePlayerMove(chess, pending.voiceCommand);
    if (!playerResult.success) {
      console.error('Failed to re-apply player move:', playerResult.error);
      delete sessionAttributes.pendingPlayerMove;
      return handlerInput.responseBuilder.speak('Hubo un error al confirmar tu jugada. Por favor, repítela.').getResponse();
    }

    let speechOutput = '';
    
    // Verificar estado después del movimiento del jugador
    const stateAfterPlayer = chessService.checkGameState(chess);
    if (stateAfterPlayer.isOver) {
      await finishGame(sessionAttributes, chess, stateAfterPlayer.result, handlerInput);
      speechOutput = stateAfterPlayer.description + await getGameEndSummary(sessionAttributes, stateAfterPlayer.result);
      delete sessionAttributes.pendingPlayerMove;
      return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }

    // AHORA: Calcular y Aplicar movimiento del motor
    const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;
    const params = mapEloToStockfish(engineElo);
    let engineDescription = '';

    try {
      const engineMoveUCI = await getBestMove(chess.fen(), params.skillLevel, params.depth, 3000);
      if (engineMoveUCI) {
        const engineResult = chessService.makeEngineMove(chess, engineMoveUCI);
        if (engineResult.success) {
          engineDescription = engineResult.description;
        } else {
          console.error('ChessService failed to make engine move:', engineResult.error);
        }
      }
    } catch (error) {
      console.error('Stockfish execution error in EngineMoveHandler:', error);
    }

    // Fallback si el motor falla
    if (!engineDescription) {
      console.warn('Using random fallback move for motor.');
      const legalMoves = chess.moves();
      if (legalMoves.length > 0) {
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const fallbackResult = chessService.makeEngineMove(chess, randomMove);
        if (fallbackResult.success) {
          engineDescription = fallbackResult.description;
        }
      }
    }

    if (engineDescription) {
      speechOutput = `Mi jugada: ${engineDescription}. `;
    } else {
      speechOutput = 'En este momento no puedo realizar mi jugada. Te toca de nuevo. ';
    }

    // Verificar estado después del movimiento del motor
    const stateAfterEngine = chessService.checkGameState(chess);
    if (stateAfterEngine.isOver) {
      await finishGame(sessionAttributes, chess, stateAfterEngine.result, handlerInput);
      speechOutput += stateAfterEngine.description + await getGameEndSummary(sessionAttributes, stateAfterEngine.result);
      delete sessionAttributes.pendingPlayerMove;
      return handlerInput.responseBuilder.speak(speechOutput).getResponse();
    }

    if (stateAfterEngine.description) {
      speechOutput += stateAfterEngine.description;
    }
    speechOutput += 'Te toca.';

    // Actualizar estado en sesión
    sessionAttributes.currentFen = chess.fen();
    sessionAttributes.currentPgn = chess.pgn();
    delete sessionAttributes.pendingPlayerMove;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    // Persistir en DB
    try {
      await db.updateGame(sessionAttributes.activeGameId, {
        fen: chess.fen(),
        pgn: chess.pgn(),
        moves_count: chess.history().length,
      });
    } catch (dbError) {
      console.error('Failed to update DB in EngineMoveHandler:', dbError);
    }

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Dime tu siguiente movimiento.')
      .getResponse();
  },
};

module.exports = EngineMoveHandler;
