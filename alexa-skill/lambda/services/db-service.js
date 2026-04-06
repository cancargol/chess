/**
 * Servicio de base de datos DynamoDB para Ajedrez Caracol.
 * Gestiona usuarios y partidas.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'ajedrez_maestro_users';
const GAMES_TABLE = process.env.GAMES_TABLE || 'ajedrez_maestro_games';

// ============================================================
// USUARIOS
// ============================================================

/**
 * Busca un usuario por nombre (case-insensitive).
 * Usa GSI name-index.
 */
async function findUserByName(name) {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'name_lower-index',
    KeyConditionExpression: 'name_lower = :name',
    ExpressionAttributeValues: {
      ':name': name.toLowerCase().trim(),
    },
    Limit: 1,
  }));

  return result.Items?.[0] || null;
}

/**
 * Obtiene un usuario por su ID.
 */
async function getUserById(userId) {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { id: userId },
  }));

  return result.Item || null;
}

/**
 * Crea un nuevo usuario.
 */
async function createUser(name, email) {
  const pin = generatePin();
  const user = {
    id: uuidv4(),
    name: name.trim(),
    name_lower: name.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    current_elo: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    total_points: 0,
    active_game_id: null,
    web_pin: pin,
    created_at: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)',
  }));

  return user;
}

/**
 * Actualiza campos de un usuario.
 */
async function updateUser(userId, updates) {
  const expressions = [];
  const names = {};
  const values = {};

  Object.entries(updates).forEach(([key, value], i) => {
    const nameKey = `#k${i}`;
    const valueKey = `:v${i}`;
    expressions.push(`${nameKey} = ${valueKey}`);
    names[nameKey] = key;
    values[valueKey] = value;
  });

  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { id: userId },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

/**
 * Obtiene todos los usuarios para el ranking.
 */
async function getAllUsers() {
  const result = await docClient.send(new ScanCommand({
    TableName: USERS_TABLE,
    ProjectionExpression: 'id, #n, current_elo, wins, losses, draws, total_points, created_at',
    ExpressionAttributeNames: { '#n': 'name' },
  }));

  return result.Items || [];
}

// ============================================================
// PARTIDAS
// ============================================================

/**
 * Crea una nueva partida.
 */
async function createGame(playerId, engineElo) {
  const game = {
    id: uuidv4(),
    player_id: playerId,
    pgn: '',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    engine_elo: engineElo,
    result: 'in_progress',
    moves_count: 0,
    started_at: new Date().toISOString(),
    finished_at: null,
  };

  await docClient.send(new PutCommand({
    TableName: GAMES_TABLE,
    Item: game,
  }));

  return game;
}

/**
 * Obtiene una partida por su ID.
 */
async function getGameById(gameId) {
  const result = await docClient.send(new GetCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId },
  }));

  return result.Item || null;
}

/**
 * Actualiza una partida (FEN, PGN, resultado, etc).
 */
async function updateGame(gameId, updates) {
  const expressions = [];
  const names = {};
  const values = {};

  Object.entries(updates).forEach(([key, value], i) => {
    const nameKey = `#k${i}`;
    const valueKey = `:v${i}`;
    expressions.push(`${nameKey} = ${valueKey}`);
    names[nameKey] = key;
    values[valueKey] = value;
  });

  await docClient.send(new UpdateCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

/**
 * Lista las partidas de un jugador (más recientes primero).
 */
async function getGamesByPlayer(playerId, limit = 20) {
  const result = await docClient.send(new QueryCommand({
    TableName: GAMES_TABLE,
    IndexName: 'player_id-index',
    KeyConditionExpression: 'player_id = :pid',
    ExpressionAttributeValues: {
      ':pid': playerId,
    },
    ScanIndexForward: false,
    Limit: limit,
  }));

  return result.Items || [];
}

/**
 * Lista todas las partidas terminadas (para el ranking).
 */
async function getAllFinishedGames() {
  const result = await docClient.send(new ScanCommand({
    TableName: GAMES_TABLE,
    FilterExpression: '#r <> :ip',
    ExpressionAttributeNames: { '#r': 'result' },
    ExpressionAttributeValues: { ':ip': 'in_progress' },
  }));

  return result.Items || [];
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Genera un PIN de 4 dígitos para acceso web.
 */
function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Valida formato básico de email.
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Formato básico: algo@algo.algo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

module.exports = {
  findUserByName,
  getUserById,
  createUser,
  updateUser,
  getAllUsers,
  createGame,
  getGameById,
  updateGame,
  getGamesByPlayer,
  getAllFinishedGames,
  isValidEmail,
  generatePin,
};
