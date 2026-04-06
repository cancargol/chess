/**
 * LaunchRequestHandler - Se activa cuando el usuario abre la Skill.
 * Flujo:
 *  1. Si hay sesión con usuario identificado → cargar y resumir
 *  2. Si no → preguntar "¿Quién eres?"
 */

const db = require('../services/db-service');

const LaunchHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Si ya hay usuario en sesión
    if (sessionAttributes.userId) {
      const user = await db.getUserById(sessionAttributes.userId);
      if (user) {
        sessionAttributes.userName = user.name;
        sessionAttributes.userElo = user.current_elo;

        // ¿Tiene partida activa?
        if (user.active_game_id) {
          const game = await db.getGameById(user.active_game_id);
          if (game && game.result === 'in_progress') {
            sessionAttributes.activeGameId = game.id;
            sessionAttributes.currentFen = game.fen;
            sessionAttributes.currentPgn = game.pgn || '';
            sessionAttributes.engineElo = game.engine_elo;

            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

            return handlerInput.responseBuilder
              .speak(`¡Bienvenido de nuevo, ${user.name}! Tienes una partida en curso contra un motor de ELO ${game.engine_elo}. Se han jugado ${game.moves_count} movimientos. Te toca jugar. Di tu movimiento o di "estado" para ver el tablero.`)
              .reprompt('Di tu movimiento. Por ejemplo: "Peón e4" o "de e2 a e4".')
              .getResponse();
          }
        }

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
          .speak(`¡Hola, ${user.name}! Tu ELO actual es ${user.current_elo}. Tienes ${user.wins} victorias y ${user.losses} derrotas. ¿Qué quieres hacer? Di "nueva partida" para empezar, o "ajusta el nivel a" seguido de un número de ELO.`)
          .reprompt('Di "nueva partida" o "ajusta el nivel a 1500".')
          .getResponse();
      }
    }

    // No hay usuario en sesión → preguntar
    return handlerInput.responseBuilder
      .speak('¡Bienvenido a Ajedrez Caracol! Soy tu entrenador de ajedrez. ¿Quién eres? Dime tu nombre.')
      .reprompt('¿Cómo te llamas? Dime tu nombre para cargar tu perfil.')
      .getResponse();
  },
};

module.exports = LaunchHandler;
