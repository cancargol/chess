/**
 * UndoHandler - Permite al usuario cancelar un movimiento durante la ventana de 4 segundos.
 */

const UndoHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'UndoIntent'
    );
  },

  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const pendingMove = sessionAttributes.pendingPlayerMove;

    if (!pendingMove) {
      return handlerInput.responseBuilder
        .speak('No hay ningún movimiento pendiente que rectificar.')
        .reprompt('¿Qué pieza quieres mover?')
        .getResponse();
    }

    // Cancelar el movimiento pendiente
    const pieceDescription = pendingMove.playerDescription || 'tu última jugada';
    delete sessionAttributes.pendingPlayerMove;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    const speechOutput = `De acuerdo, he cancelado tu movimiento de ${pieceDescription}. Estamos de nuevo en tu turno. ¿Qué mueves?`;

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt('Dime qué pieza quieres mover ahora.')
      .getResponse();
  },
};

module.exports = UndoHandler;
