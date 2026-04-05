/**
 * HelpHandler - Ayuda, Cancel, Stop.
 */

const HelpHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent'
    );
  },

  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const hasGame = !!sessionAttributes.activeGameId;

    let help = 'CanCargolChess te permite jugar partidas de ajedrez contra un motor de distintos niveles. ';
    help += 'Puedes usar estos comandos: ';
    help += '"Nueva partida" para empezar una partida. ';
    help += '"Ajusta el nivel a" seguido de un ELO entre 100 y 3000. ';

    if (hasGame) {
      help += 'Para mover, puedes decir: ';
      help += '"Peón e4" para notación algebraica. ';
      help += '"De e2 a e4" para notación por coordenadas. ';
      help += '"Caballo f3", "Torre a d1", "Alfil captura en e5". ';
      help += '"Enroque corto" o "enroque largo". ';
      help += '"Peón e8 corona dama" para coronar. ';
      help += '"Estado" para saber cómo va la partida. ';
      help += '"Me rindo" para abandonar. ';
    }

    help += '¿Qué quieres hacer?';

    return handlerInput.responseBuilder
      .speak(help)
      .reprompt('¿Qué quieres hacer?')
      .getResponse();
  },
};

const CancelStopHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent')
    );
  },

  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const hasGame = !!sessionAttributes.activeGameId;

    let goodbye = '¡Hasta luego! ';
    if (hasGame) {
      goodbye += 'Tu partida se ha guardado. Cuando vuelvas, podrás continuar donde la dejaste. ';
    }
    goodbye += '¡Que las piezas te sean favorables!';

    return handlerInput.responseBuilder
      .speak(goodbye)
      .withShouldEndSession(true)
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent'
    );
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('No he entendido eso. Puedes decir "ayuda" para ver los comandos disponibles, o di tu movimiento como "Peón e4".')
      .reprompt('Di "ayuda" o tu movimiento.')
      .getResponse();
  },
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },

  handle(handlerInput) {
    console.log(`Session ended: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },

  handle(handlerInput, error) {
    console.error('Error handled:', error.message, error.stack);

    return handlerInput.responseBuilder
      .speak('Lo siento, ha ocurrido un error. Inténtalo de nuevo.')
      .reprompt('¿Puedes repetir tu comando?')
      .getResponse();
  },
};

module.exports = {
  HelpHandler,
  CancelStopHandler,
  FallbackHandler,
  SessionEndedHandler,
  ErrorHandler,
};
