/**
 * StatusHandler - Dice el estado actual del tablero.
 * El usuario dice: "Estado" o "¿Cómo va la partida?"
 */

const { Chess } = require('chess.js');
const chessService = require('../services/chess-service');

const StatusHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'StatusIntent'
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

    if (!sessionAttributes.activeGameId || !sessionAttributes.currentFen) {
      return handlerInput.responseBuilder
        .speak('No tienes una partida en curso. Di "nueva partida" para empezar.')
        .reprompt('Di "nueva partida".')
        .getResponse();
    }

    const chess = new Chess(sessionAttributes.currentFen);

    // Resumen del tablero
    const summary = chessService.getBoardSummary(chess);
    const recentMoves = chessService.getRecentMoves(chess, 4);

    let speech = summary + ' ';
    speech += `Últimas jugadas: ${recentMoves}. `;
    speech += `Partida contra motor ELO ${sessionAttributes.engineElo}. `;

    if (sessionAttributes.webPin) {
      speech += `Recuerda que puedes ver el tablero en la web: cancargol punto guithub punto i o, barra, chess. Tu PIN es ${sessionAttributes.webPin.split('').join(' ')}. `;
    }

    speech += 'Di tu movimiento para continuar.';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('Di tu movimiento.')
      .getResponse();
  },
};

module.exports = StatusHandler;
