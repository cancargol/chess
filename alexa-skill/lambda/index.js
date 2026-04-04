/**
 * Ajedrez Maestro — Alexa Skill Lambda Handler
 *
 * Entry point para la Skill de Alexa que permite jugar al ajedrez
 * contra el motor Stockfish, con distintos niveles de dificultad.
 *
 * Funcionalidades:
 *  - Identificación de usuario por nombre
 *  - Registro con email y generación de PIN web
 *  - Ajuste de ELO del motor (100-3000)
 *  - Movimientos por voz en notación española y por coordenadas
 *  - Enroques, capturas, coronación, captura al paso
 *  - Persistencia de partidas en DynamoDB
 *  - Sistema de ranking ponderado por ELO
 */

const Alexa = require('ask-sdk-core');

// Handlers
const LaunchHandler = require('./handlers/LaunchHandler');
const { IdentifyUserHandler, ProvideEmailHandler } = require('./handlers/IdentifyUserHandler');
const SetEloHandler = require('./handlers/SetEloHandler');
const MoveHandler = require('./handlers/MoveHandler');
const StatusHandler = require('./handlers/StatusHandler');
const ResignHandler = require('./handlers/ResignHandler');
const NewGameHandler = require('./handlers/NewGameHandler');
const {
  HelpHandler,
  CancelStopHandler,
  FallbackHandler,
  SessionEndedHandler,
  ErrorHandler,
} = require('./handlers/HelpHandler');

// ============================================================
// Interceptors
// ============================================================

/**
 * Request Interceptor: carga atributos persistentes en la sesión.
 */
const LoadAttributesInterceptor = {
  async process(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Si ya hay datos en sesión, no recargar
    if (sessionAttributes.loaded) return;

    // Marcar como cargado para no repetir
    sessionAttributes.loaded = true;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
  },
};

/**
 * Response Interceptor: loguea la respuesta para debugging.
 */
const LogResponseInterceptor = {
  process(handlerInput) {
    const response = handlerInput.responseBuilder.getResponse();
    if (response.outputSpeech) {
      console.log('Response:', response.outputSpeech.ssml || response.outputSpeech.text);
    }
  },
};

// ============================================================
// Skill Builder
// ============================================================

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchHandler,
    IdentifyUserHandler,
    ProvideEmailHandler,
    SetEloHandler,
    MoveHandler,
    NewGameHandler,
    StatusHandler,
    ResignHandler,
    HelpHandler,
    CancelStopHandler,
    FallbackHandler,
    SessionEndedHandler
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LoadAttributesInterceptor)
  .addResponseInterceptors(LogResponseInterceptor)
  .withCustomUserAgent('ajedrez-maestro/v1.0')
  .lambda();
