/**
 * Cliente API para el Dashboard.
 * Realiza fetch al API Gateway de AWS en lugar de acceder a DynamoDB directamente.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Error de red' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ============================================================
// PLAYERS
// ============================================================

export async function getAllPlayers() {
  const data = await apiFetch('/players');
  return data.players || [];
}

export async function getPlayerById(playerId) {
  const data = await apiFetch(`/players/${playerId}`);
  return data.player || null;
}

// ============================================================
// GAMES
// ============================================================

export async function getAllGames() {
  const data = await apiFetch('/games');
  return data.games || [];
}

export async function getGameById(gameId) {
  const data = await apiFetch(`/games/${gameId}`);
  return data.game || null;
}

export async function getPlayerGames(playerId) {
  const data = await apiFetch(`/player-games/${playerId}`);
  return data.games || [];
}

// ============================================================
// AUTH
// ============================================================

const AUTH_KEY = 'ajedrez_maestro_auth';

export async function verifyPin(pin) {
  const data = await apiFetch('/auth', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });

  if (data.success) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      pin,
      userId: data.user.id,
      userName: data.user.name,
      timestamp: Date.now(),
    }));
  }

  return data;
}

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return null;

    const auth = JSON.parse(stored);

    // Expire after 30 days
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - auth.timestamp > thirtyDays) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    return auth;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function isAuthenticated() {
  return !!getStoredAuth();
}
