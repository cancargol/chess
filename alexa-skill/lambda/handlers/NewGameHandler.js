/**
 * NewGameHandler - Inicia una nueva partida de ajedrez.
 * Si hay una partida activa, ofrece abandonarla primero.
 */

const db = require('../services/db-service');
const { mapEloToStockfish, DEFAULT_ELO } = require('../utils/elo-mapper');
const { resetEngine } = require('../engine/stockfish-manager');

const NewGameHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'NewGameIntent'
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

    // Si hay partida activa, primero abandonarla
    if (sessionAttributes.activeGameId) {
      const existingGame = await db.getGameById(sessionAttributes.activeGameId);
      if (existingGame && existingGame.result === 'in_progress') {
        // Abandonar la partida anterior
        await db.updateGame(existingGame.id, {
          result: 'loss',
          finished_at: new Date().toISOString(),
        });

        const user = await db.getUserById(sessionAttributes.userId);
        if (user) {
          await db.updateUser(sessionAttributes.userId, {
            losses: (user.losses || 0) + 1,
          });
        }
      }
    }

    // Configurar ELO del motor
    const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;
    const params = mapEloToStockfish(engineElo);

    // Crear nueva partida en DB
    const newGame = await db.createGame(sessionAttributes.userId, engineElo);

    // Actualizar usuario con partida activa
    await db.updateUser(sessionAttributes.userId, {
      active_game_id: newGame.id,
    });

    // Resetear motor
    try {
      await resetEngine();
    } catch {
      // No es crítico si falla el reset
    }

    // Configurar sesión
    sessionAttributes.activeGameId = newGame.id;
    sessionAttributes.currentFen = newGame.fen;
    sessionAttributes.currentPgn = newGame.pgn || '';
    sessionAttributes.stockfishSkillLevel = params.skillLevel;
    sessionAttributes.stockfishDepth = params.depth;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(`¡Nueva partida! Juegas con blancas contra el motor a ELO ${engineElo}, nivel ${params.label}. Tienes el primer movimiento. Di tu jugada, por ejemplo: "Peón e4" o "de e2 a e4".`)
      .reprompt('Te toca. Di tu primer movimiento.')
      .getResponse();
  },
};

module.exports = NewGameHandler;
