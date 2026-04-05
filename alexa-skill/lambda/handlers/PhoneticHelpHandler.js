const PhoneticHelpHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'PhoneticHelpIntent'
    );
  },

  handle(handlerInput) {
    const speechText = 'Claro, aquí tienes las letras que puedes usar para las coordenadas: ' +
      'A de Alfa, ' +
      'B de Bravo, ' +
      'C de Charlie, ' +
      'D de Delta, ' +
      'E de Echo, ' +
      'F de Foxtrot, ' +
      'G de Golf y ' +
      'H de Hotel. ' +
      'Puedes decir por ejemplo, caballo a f3 o, de e2 a e4.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt('¿Quieres hacer algún movimiento?')
      .getResponse();
  },
};

module.exports = PhoneticHelpHandler;
