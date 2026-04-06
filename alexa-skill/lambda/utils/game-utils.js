const db = require('../services/db-service');
const { DEFAULT_ELO } = require('./elo-mapper');

/**
 * Finaliza una partida y actualiza estadísticas.
 */
async function finishGame(sessionAttributes, chess, result, handlerInput) {
  const gameId = sessionAttributes.activeGameId;
  const userId = sessionAttributes.userId;
  const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;

  // Actualizar partida
  await db.updateGame(gameId, {
    fen: chess.fen(),
    pgn: chess.pgn(),
    moves_count: chess.history().length,
    result,
    finished_at: new Date().toISOString(),
  });

  // Calcular puntos
  let pointsGained = 0;
  const updates = {};

  if (result === 'win') {
    pointsGained = engineElo;
    updates.wins = (sessionAttributes.userWins || 0) + 1;
  } else if (result === 'draw') {
    pointsGained = Math.floor(engineElo * 0.5);
    updates.draws = (sessionAttributes.userDraws || 0) + 1;
  } else if (result === 'loss') {
    pointsGained = 0;
    updates.losses = (sessionAttributes.userLosses || 0) + 1;
  }

  // Actualizar usuario
  const user = await db.getUserById(userId);
  if (user) {
    updates.total_points = (user.total_points || 0) + pointsGained;
    updates.active_game_id = null;
    // Opcionalmente actualizar contadores individuales si el objeto user los tiene
    await db.updateUser(userId, updates);
  }

  // Limpiar sesión
  sessionAttributes.activeGameId = null;
  sessionAttributes.currentFen = null;
  sessionAttributes.currentPgn = null;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/**
 * Genera un resumen de fin de partida.
 */
async function getGameEndSummary(sessionAttributes, result) {
  const engineElo = sessionAttributes.engineElo || DEFAULT_ELO;
  const userName = sessionAttributes.userName || 'jugador';

  if (result === 'win') {
    return ` ¡Felicidades, ${userName}! Has ganado ${engineElo} puntos de ranking. Di "nueva partida" para jugar otra vez.`;
  } else if (result === 'draw') {
    return ` Tablas. Has ganado ${Math.floor(engineElo * 0.5)} puntos de ranking. Di "nueva partida" para jugar otra vez.`;
  } else {
    return ` Has perdido. No ganas puntos de ranking. ¡Inténtalo de nuevo! Di "nueva partida".`;
  }
}

module.exports = {
  finishGame,
  getGameEndSummary
};
