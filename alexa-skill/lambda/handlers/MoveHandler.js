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
const { finishGame, getGameEndSummary } = require('../utils/game-utils');

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

    // Verificar que es turno de blancas (jugador siempre es blancas)
    if (chess.turn() !== 'w') {
      return handlerInput.responseBuilder
        .speak('No es tu turno. Espera la respuesta del motor.')
        .reprompt('Espera a que el motor juegue.')
        .getResponse();
    }

    // Ejecutar movimiento del jugador (SOLO para validación, no se guarda en DB todavía)
    const playerResult = chessService.makePlayerMove(chess, voiceCommand);

    if (!playerResult.success) {
      return handlerInput.responseBuilder
        .speak(`${playerResult.error} Inténtalo de nuevo.`)
        .reprompt('Di tu movimiento. Por ejemplo: "Peón e4".')
        .getResponse();
    }

    // GUARDAR EN SESIÓN EL MOVIMIENTO PENDIENTE
    sessionAttributes.pendingPlayerMove = {
      voiceCommand: voiceCommand,
      playerDescription: playerResult.description,
      pgn: sessionAttributes.currentPgn,
      fen: sessionAttributes.currentFen
    };
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const speechOutput = `${playerResult.description}. Tienes 8 segundos para rectificar o di Deshacer.`;

    // Directiva APL con Temporizador de 8 segundos
    const aplDirective = {
      type: 'Alexa.Presentation.APL.RenderDocument',
      token: 'chess-timer',
      document: {
        type: 'APL',
        version: '1.4',
        mainTemplate: {
          items: [
            {
              type: 'Container',
              direction: 'column',
              items: [
                {
                  type: 'Text',
                  text: `Esperando... (${playerResult.description})`,
                  textAlign: 'center'
                }
              ]
            }
          ]
        }
      },
      commands: [
        {
          type: 'Sequential',
          commands: [
            {
              type: 'Idle',
              delay: 8000
            },
            {
              type: 'SendEvent',
              arguments: ['engineMoveRequested']
            }
          ]
        }
      ]
    };

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .addDirective(aplDirective)
      .reprompt('Si quieres rectificar, di deshacer.')
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

  // 1. Enroque
  if (castling) {
    return castling;
  }

  // 2. Notación con destino claro
  if (targetColumn && targetRow) {
    let cmd = '';
    
    // Si hay pieza, la añadimos al principio
    if (piece) cmd += `${piece} `;
    
    // Si hay origen (columna o fila), lo añadimos para desambiguar
    if (sourceColumn || sourceRow) {
      if (sourceColumn) cmd += `${sourceColumn}`;
      if (sourceRow) cmd += `${sourceRow}`;
      
      // Si hay acción (captura)
      if (action) {
        cmd += ` ${action} `;
      } else if (sourceColumn && sourceColumn !== targetColumn) {
        // Atajo: si hay dos columnas distintas y no hay acción, es una captura de peón (ej: "b c3" -> "b x c3")
        cmd += ' x ';
      } else {
        cmd += ' ';
      }
    } else if (action) {
      cmd += `${action} `;
    }

    cmd += `${targetColumn}${targetRow}`;
    if (promotion) cmd += ` corona ${promotion}`;
    return cmd.trim();
  }

  // 3. Fallback: concatenar todo lo que haya
  const parts = [piece, action, sourceColumn, sourceRow, targetColumn, targetRow, promotion].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

module.exports = MoveHandler;
