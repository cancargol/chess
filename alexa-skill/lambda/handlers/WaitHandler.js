/**
 * WaitHandler - Maneja el comando "espera" o "un momento".
 * Simplemente responde con un mensaje de confirmación y un reprompt
 * para reiniciar el temporizador de 16 segundos de Alexa.
 */

const WaitHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'WaitIntent'
    );
  },

  handle(handlerInput) {
    const speechOutput = 'Claro, no hay problema. Tómate tu tiempo para pensar. Avísame cuando sepas qué movimiento quieres hacer.';
    const repromptText = '¿Has decidido ya tu movimiento? Si necesitas más tiempo, solo dime: espera.';

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .reprompt(repromptText)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = WaitHandler;
