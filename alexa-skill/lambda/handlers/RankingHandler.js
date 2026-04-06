const db = require('../services/db-service');

const RankingHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'RankingIntent'
    );
  },

  async handle(handlerInput) {
    try {
      const users = await db.getAllUsers();
      
      if (!users || users.length === 0) {
        return handlerInput.responseBuilder
          .speak('Todavía no hay jugadores en el ranking. ¡Sé el primero en jugar!')
          .getResponse();
      }

      // Ordenar por puntos totales descendente
      const sortedUsers = users.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
      const top3 = sortedUsers.slice(0, 3);

      let speech = 'Aquí tienes el Top 3 de Ajedrez Caracol: ';
      
      top3.forEach((user, index) => {
        const position = ['primero', 'segundo', 'tercero'][index];
        speech += `${position}, ${user.name} con ${user.total_points || 0} puntos. `;
      });

      if (users.length > 3) {
        speech += '¡Sigue jugando para subir posiciones!';
      }

      return handlerInput.responseBuilder
        .speak(speech)
        .getResponse();
    } catch (error) {
      console.error('Error fetching ranking:', error);
      return handlerInput.responseBuilder
        .speak('Lo siento, no he podido recuperar el ranking en este momento.')
        .getResponse();
    }
  },
};

module.exports = RankingHandler;
