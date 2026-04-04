/**
 * IdentifyUserHandler - Identifica al usuario por nombre.
 * Si el nombre existe, carga el perfil.
 * Si no, ofrece crear uno nuevo pidiendo el email.
 */

const db = require('../services/db-service');
const { DEFAULT_ELO } = require('../utils/elo-mapper');

const IdentifyUserHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'IdentifyUserIntent'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const userName = slots?.UserName?.value;

    if (!userName) {
      return handlerInput.responseBuilder
        .speak('No he entendido tu nombre. ¿Podrías repetirlo?')
        .reprompt('¿Cómo te llamas?')
        .getResponse();
    }

    // Buscar usuario existente
    const existingUser = await db.findUserByName(userName);

    if (existingUser) {
      // Usuario encontrado
      sessionAttributes.userId = existingUser.id;
      sessionAttributes.userName = existingUser.name;
      sessionAttributes.userElo = existingUser.current_elo;
      sessionAttributes.engineElo = existingUser.current_elo;

      // Verificar partida activa
      if (existingUser.active_game_id) {
        const game = await db.getGameById(existingUser.active_game_id);
        if (game && game.result === 'in_progress') {
          sessionAttributes.activeGameId = game.id;
          sessionAttributes.currentFen = game.fen;
          sessionAttributes.engineElo = game.engine_elo;

          handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

          return handlerInput.responseBuilder
            .speak(`¡Hola, ${existingUser.name}! Te he encontrado. Tienes una partida en curso contra ELO ${game.engine_elo}. Te toca jugar. Di tu movimiento.`)
            .reprompt('Di tu movimiento, por ejemplo: "Peón e4".')
            .getResponse();
        }
      }

      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      return handlerInput.responseBuilder
        .speak(`¡Hola, ${existingUser.name}! Tu ELO es ${existingUser.current_elo}, con ${existingUser.wins} victorias y ${existingUser.losses} derrotas. Tu PIN para la web es: ${existingUser.web_pin}. Di "nueva partida" para empezar a jugar.`)
        .reprompt('Di "nueva partida" o "ajusta el nivel a 1500".')
        .getResponse();
    }

    // Usuario no encontrado → pedir email para crear
    sessionAttributes.pendingUserName = userName;
    sessionAttributes.awaitingEmail = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(`No he encontrado a ${userName}. ¿Quieres crear un perfil nuevo? Si es así, dime tu correo electrónico.`)
      .reprompt('Dime tu dirección de correo electrónico para crear tu perfil.')
      .getResponse();
  },
};

/**
 * ProvideEmailHandler - Recibe el email para crear un nuevo usuario.
 */
const ProvideEmailHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'ProvideEmailIntent'
    );
  },

  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const slots = handlerInput.requestEnvelope.request.intent.slots;

    if (!sessionAttributes.awaitingEmail || !sessionAttributes.pendingUserName) {
      return handlerInput.responseBuilder
        .speak('No esperaba un correo electrónico en este momento. ¿Cómo te llamas?')
        .reprompt('Dime tu nombre.')
        .getResponse();
    }

    // Construir email desde slots
    const emailUser = slots?.EmailUser?.value || '';
    const emailDomain = slots?.EmailDomain?.value || '';
    const emailExtension = slots?.EmailExtension?.value || '';

    let email = '';
    if (emailUser && emailDomain) {
      email = `${emailUser}@${emailDomain}`;
      if (emailExtension) {
        email += `.${emailExtension}`;
      }
    } else {
      // Intentar con slot único
      email = slots?.FullEmail?.value || `${emailUser}@${emailDomain}.${emailExtension || 'com'}`;
    }

    // Limpiar email
    email = email.replace(/\s+/g, '').toLowerCase();

    if (!db.isValidEmail(email)) {
      return handlerInput.responseBuilder
        .speak(`El correo "${email}" no parece válido. ¿Puedes intentar de nuevo? Dilo despacio, por ejemplo: "juan arroba gmail punto com".`)
        .reprompt('Dime tu correo electrónico.')
        .getResponse();
    }

    // Crear usuario
    try {
      const newUser = await db.createUser(sessionAttributes.pendingUserName, email);

      sessionAttributes.userId = newUser.id;
      sessionAttributes.userName = newUser.name;
      sessionAttributes.userElo = DEFAULT_ELO;
      sessionAttributes.engineElo = DEFAULT_ELO;
      delete sessionAttributes.pendingUserName;
      delete sessionAttributes.awaitingEmail;

      handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

      return handlerInput.responseBuilder
        .speak(`¡Perfecto, ${newUser.name}! He creado tu perfil. Tu ELO inicial es ${DEFAULT_ELO}. Importante: tu PIN para acceder a la web es: ${newUser.web_pin}. Recuérdalo. Di "nueva partida" para empezar a jugar.`)
        .reprompt('Di "nueva partida" para comenzar una partida de ajedrez.')
        .getResponse();
    } catch (error) {
      console.error('Error creating user:', error);
      return handlerInput.responseBuilder
        .speak('Ha ocurrido un error al crear tu perfil. Inténtalo de nuevo más tarde.')
        .getResponse();
    }
  },
};

module.exports = { IdentifyUserHandler, ProvideEmailHandler };
