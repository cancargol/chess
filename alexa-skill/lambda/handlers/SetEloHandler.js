/**
 * SetEloHandler - Ajusta el nivel de dificultad del motor.
 * El usuario dice: "Ajusta el nivel a ELO 1500"
 */

const { mapEloToStockfish, isValidElo, MIN_ELO, MAX_ELO } = require('../utils/elo-mapper');

const SetEloHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'SetEloIntent'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (!sessionAttributes.userId) {
      return handlerInput.responseBuilder
        .speak('Primero necesito saber quién eres. ¿Cómo te llamas?')
        .reprompt('Dime tu nombre.')
        .getResponse();
    }

    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const eloValue = parseInt(slots?.EloLevel?.value, 10);

    if (!eloValue || !isValidElo(eloValue)) {
      return handlerInput.responseBuilder
        .speak(`El nivel de ELO debe ser un número entre ${MIN_ELO} y ${MAX_ELO}. Por ejemplo, di "ajusta el nivel a 1500".`)
        .reprompt(`Di un número entre ${MIN_ELO} y ${MAX_ELO}.`)
        .getResponse();
    }

    const stockfishParams = mapEloToStockfish(eloValue);
    sessionAttributes.engineElo = eloValue;
    sessionAttributes.stockfishSkillLevel = stockfishParams.skillLevel;
    sessionAttributes.stockfishDepth = stockfishParams.depth;

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(`Nivel ajustado a ELO ${eloValue}. Categoría: ${stockfishParams.label}. El motor jugará con nivel de habilidad ${stockfishParams.skillLevel} y profundidad ${stockfishParams.depth}. Di "nueva partida" para empezar.`)
      .reprompt('Di "nueva partida" para comenzar.')
      .getResponse();
  },
};

module.exports = SetEloHandler;
