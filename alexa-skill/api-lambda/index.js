/**
 * API Lambda para el Dashboard de Ajedrez Maestro.
 * Sirve datos de DynamoDB al dashboard estático en GitHub Pages.
 *
 * Endpoints:
 *   GET  /api/players        → Lista jugadores (ranking)
 *   GET  /api/players/{id}   → Detalle de jugador
 *   GET  /api/games          → Lista partidas terminadas
 *   GET  /api/games/{id}     → Detalle de partida (PGN)
 *   GET  /api/player-games/{id} → Partidas de un jugador
 *   POST /api/auth           → Verificar PIN
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'ajedrez_maestro_users';
const GAMES_TABLE = process.env.GAMES_TABLE || 'ajedrez_maestro_games';

// GitHub Pages origin for CORS
const ALLOWED_ORIGINS = [
  'https://cancargol.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
];

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const path = event.path || event.rawPath || '/';
  const origin = event.headers?.origin || event.headers?.Origin || '';

  // CORS headers
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  try {
    // Route requests
    if (method === 'GET' && path === '/api/players') {
      return await getPlayers(corsHeaders);
    }

    if (method === 'GET' && path.startsWith('/api/players/')) {
      const id = path.replace('/api/players/', '');
      return await getPlayerById(id, corsHeaders);
    }

    if (method === 'GET' && path.startsWith('/api/player-games/')) {
      const id = path.replace('/api/player-games/', '');
      return await getPlayerGames(id, corsHeaders);
    }

    if (method === 'GET' && path === '/api/games') {
      return await getGames(corsHeaders);
    }

    if (method === 'GET' && path.startsWith('/api/games/')) {
      const id = path.replace('/api/games/', '');
      return await getGameById(id, corsHeaders);
    }

    if (method === 'POST' && path === '/api/auth') {
      const body = JSON.parse(event.body || '{}');
      return await verifyPin(body.pin, corsHeaders);
    }

    return response(404, { error: 'Not found' }, corsHeaders);
  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: 'Internal server error' }, corsHeaders);
  }
};

// ============================================================
// HANDLERS
// ============================================================

async function getPlayers(headers) {
  const result = await docClient.send(new ScanCommand({
    TableName: USERS_TABLE,
    ProjectionExpression: 'id, #n, current_elo, wins, losses, draws, total_points, created_at',
    ExpressionAttributeNames: { '#n': 'name' },
  }));

  const players = (result.Items || []).sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  return response(200, { players }, headers);
}

async function getPlayerById(userId, headers) {
  if (!userId) return response(400, { error: 'Missing player ID' }, headers);

  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { id: userId },
  }));

  if (!result.Item) return response(404, { error: 'Player not found' }, headers);

  // Don't expose sensitive fields
  const { web_pin, email, ...player } = result.Item;
  return response(200, { player }, headers);
}

async function getPlayerGames(playerId, headers) {
  if (!playerId) return response(400, { error: 'Missing player ID' }, headers);

  const result = await docClient.send(new QueryCommand({
    TableName: GAMES_TABLE,
    IndexName: 'player_id-index',
    KeyConditionExpression: 'player_id = :pid',
    ExpressionAttributeValues: { ':pid': playerId },
    ScanIndexForward: false,
    Limit: 100,
  }));

  return response(200, { games: result.Items || [] }, headers);
}

async function getGames(headers) {
  const result = await docClient.send(new ScanCommand({
    TableName: GAMES_TABLE,
    FilterExpression: '#r <> :ip',
    ExpressionAttributeNames: { '#r': 'result' },
    ExpressionAttributeValues: { ':ip': 'in_progress' },
  }));

  const games = (result.Items || []).sort((a, b) =>
    new Date(b.finished_at || b.started_at || 0) - new Date(a.finished_at || a.started_at || 0)
  );

  return response(200, { games }, headers);
}

async function getGameById(gameId, headers) {
  if (!gameId) return response(400, { error: 'Missing game ID' }, headers);

  const result = await docClient.send(new GetCommand({
    TableName: GAMES_TABLE,
    Key: { id: gameId },
  }));

  if (!result.Item) return response(404, { error: 'Game not found' }, headers);
  return response(200, { game: result.Item }, headers);
}

async function verifyPin(pin, headers) {
  if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return response(400, { success: false, message: 'PIN inválido' }, headers);
  }

  const result = await docClient.send(new ScanCommand({
    TableName: USERS_TABLE,
    FilterExpression: 'web_pin = :pin',
    ExpressionAttributeValues: { ':pin': pin },
    Limit: 1,
  }));

  const user = result.Items?.[0];

  if (!user) {
    return response(401, { success: false, message: 'PIN no encontrado' }, headers);
  }

  return response(200, {
    success: true,
    user: { id: user.id, name: user.name },
  }, headers);
}

// ============================================================
// UTILS
// ============================================================

function response(statusCode, body, headers) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}
