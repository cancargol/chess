/**
 * ResignHandler - El jugador abandona la partida actual.
 * El usuario dice: "Me rindo" o "Abandono"
 */

const db = require('../services/db-service');
const { Chess } = require('chess.js');

const ResignHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ResignIntent'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (!sessionAttributes.userId) {
      return handlerInput.responseBuilder
        .speak('Primero dime quién eres. ¿Cómo te llamas?')
        .reprompt('Dime tu nombre.')
        .getResponse();
    }

    if (!sessionAttributes.activeGameId) {
      return handlerInput.responseBuilder
        .speak('No tienes ninguna partida en curso. Di "nueva partida" para empezar una.')
        .reprompt('Di "nueva partida".')
        .getResponse();
    }

    const gameId = sessionAttributes.activeGameId;
    const userId = sessionAttributes.userId;
    const engineElo = sessionAttributes.engineElo || 1200;

    // Obtener FEN actual para guardar PGN completo
    let pgn = '';
    if (sessionAttributes.currentFen) {
      try {
        const chess = new Chess(sessionAttributes.currentFen);
        pgn = chess.pgn();
      } catch { /* ignorar */ }
    }

    // Marcar partida como derrota
    await db.updateGame(gameId, {
      result: 'loss',
      pgn,
      finished_at: new Date().toISOString(),
    });

    // Actualizar estadísticas del usuario (derrota, 0 puntos)
    const user = await db.getUserById(userId);
    if (user) {
      await db.updateUser(userId, {
        losses: (user.losses || 0) + 1,
        active_game_id: null,
      });
    }

    // Limpiar sesión
    sessionAttributes.activeGameId = null;
    sessionAttributes.currentFen = null;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(`Has abandonado la partida contra motor ELO ${engineElo}. No ganas puntos de ranking. Tu nuevo marcador: ${(user?.wins || 0)} victorias y ${(user?.losses || 0) + 1} derrotas. Di "nueva partida" para jugar otra vez.`)
      .reprompt('Di "nueva partida" para empezar otra partida.')
      .getResponse();
  },
};

module.exports = ResignHandler;
