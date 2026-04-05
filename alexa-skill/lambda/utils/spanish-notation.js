/**
 * Parser de notación algebraica española a SAN (Standard Algebraic Notation).
 *
 * Soporta:
 *  - Notación algebraica española: "Caballo f3" → "Nf3"
 *  - Notación por coordenadas: "de e2 a e4" → "e2e4" (move object)
 *  - Capturas: "Alfil captura en e5" → "Bxe5"
 *  - Enroque corto / largo: "O-O" / "O-O-O"
 *  - Captura al paso (se valida por chess.js automáticamente)
 *  - Coronación: "Peón e8 corona dama" → "e8=Q"
 */

// Mapa de piezas: español → SAN
const PIECE_MAP = {
  rey: 'K',
  reina: 'Q',
  dama: 'Q',
  torre: 'R',
  alfil: 'B',
  caballo: 'N',
  peon: '',
  peón: '',
};

// Mapa de coronación
const PROMOTION_MAP = {
  dama: 'q',
  reina: 'q',
  torre: 'r',
  alfil: 'b',
  caballo: 'n',
};

// Columnas válidas del tablero
const VALID_COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const VALID_ROWS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Normaliza el texto de entrada: minúsculas, quitar acentos, limpiar espacios
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae una casilla (columna + fila) de un texto.
 * Ej: "e4" → { column: 'e', row: '4', square: 'e4' }
 */
function extractSquare(text) {
  const match = text.match(/([a-h])\s*([1-8])/);
  if (match) {
    return { column: match[1], row: match[2], square: `${match[1]}${match[2]}` };
  }
  return null;
}

/**
 * Parsea un comando de voz en español a un objeto de movimiento.
 *
 * @param {string} voiceInput - Texto del comando de voz
 * @returns {{ type: string, san?: string, from?: string, to?: string, promotion?: string, error?: string }}
 */
function parseSpanishMove(voiceInput) {
  const input = normalize(voiceInput);

  // === ENROQUES ===
  if (input.includes('enroque corto') || input === 'enroque kingside') {
    return { type: 'san', san: 'O-O' };
  }
  if (input.includes('enroque largo') || input === 'enroque queenside') {
    return { type: 'san', san: 'O-O-O' };
  }

  // === NOTACIÓN POR COORDENADAS: "de e2 a e4" ===
  const coordMatch = input.match(/de\s+([a-h]\s*[1-8])\s+a\s+([a-h]\s*[1-8])/);
  if (coordMatch) {
    const from = coordMatch[1].replace(/\s/g, '');
    const to = coordMatch[2].replace(/\s/g, '');

    // Buscar coronación
    let promotion = null;
    for (const [word, piece] of Object.entries(PROMOTION_MAP)) {
      if (input.includes(`corona ${word}`) || input.includes(`coronar ${word}`) || input.includes(`promocion ${word}`)) {
        promotion = piece;
        break;
      }
    }

    return { type: 'coordinates', from, to, promotion };
  }

  // === NOTACIÓN ALGEBRAICA ESPAÑOLA ===

  // Buscar la pieza
  let pieceSAN = '';
  let foundPiece = false;
  let inputForSquares = input;

  for (const [name, san] of Object.entries(PIECE_MAP)) {
    if (input.startsWith(name)) {
      pieceSAN = san;
      foundPiece = true;
      // IMPORTANTE: Quitar la pieza para evitar que su última letra (ej: damA) 
      // se confunda con una columna de desambiguación.
      inputForSquares = input.substring(name.length).trim();
      break;
    }
  }

  // Detectar captura
  const isCapture = input.includes('captura') || input.includes('come') || input.includes('toma');

  // Extraer casillas del texto (usando el input limpio)
  const squares = [];
  const squareRegex = /([a-h])\s*([1-8])/g;
  let match;
  while ((match = squareRegex.exec(inputForSquares)) !== null) {
    squares.push(`${match[1]}${match[2]}`);
  }

  if (squares.length === 0) {
    // Si no hay casillas en el resto, miramos si hay una en el input total (fallback)
    const fallbackMatch = input.match(/([a-h])\s*([1-8])/);
    if (fallbackMatch) {
      squares.push(`${fallbackMatch[1]}${fallbackMatch[2]}`);
    } else {
      return { type: 'error', error: 'No se encontró una casilla válida en el movimiento.' };
    }
  }

  // Buscar coronación
  let promotion = null;
  for (const [word, piece] of Object.entries(PROMOTION_MAP)) {
    if (input.includes(`corona ${word}`) || input.includes(`coronar ${word}`) || input.includes(`promocion ${word}`)) {
      promotion = piece;
      break;
    }
  }

  // Si hay 2 casillas, puede ser desambiguación o coordenadas
  if (squares.length >= 2) {
    // "Torre a1 a d1" → from=a1, to=d1
    return { type: 'coordinates', from: squares[0], to: squares[1], promotion };
  }

  // Una sola casilla destino
  const targetSquare = squares[squares.length - 1];

  // Buscar columna de desambiguación (ej: "Torre a d1" → "Rad1")
  // Usamos el input limpio para evitar falsos positivos con el nombre de la pieza
  let disambiguation = '';
  const disambigMatch = inputForSquares.match(/^([a-h])\s+[a-h][1-8]/);
  if (disambigMatch && foundPiece) {
    disambiguation = disambigMatch[1];
  }

  // Construir SAN
  let san = pieceSAN;
  san += disambiguation;
  if (isCapture) san += 'x';
  san += targetSquare;
  if (promotion) san += `=${promotion.toUpperCase()}`;

  return { type: 'san', san };
}

/**
 * Convierte un movimiento SAN del motor a una descripción en español.
 *
 * @param {string} san - Movimiento en SAN (ej: "Nf3")
 * @param {object} moveObj - Objeto de movimiento de chess.js
 * @returns {string} Descripción en español
 */
function moveToSpanish(san, moveObj) {
  if (san === 'O-O') return 'Enroque corto';
  if (san === 'O-O-O') return 'Enroque largo';

  const SAN_TO_SPANISH = {
    K: 'Rey',
    Q: 'Dama',
    R: 'Torre',
    B: 'Alfil',
    N: 'Caballo',
  };

  let description = '';

  // Nombre de la pieza
  const pieceName = SAN_TO_SPANISH[moveObj.piece?.toUpperCase()] || 'Peón';
  description += pieceName;

  // Captura
  if (moveObj.captured) {
    const capturedName = SAN_TO_SPANISH[moveObj.captured?.toUpperCase()] || 'peón';
    description += ` captura ${capturedName} en`;
  } else {
    description += ' a';
  }

  // Casilla destino - deletrear para claridad por voz
  const col = moveObj.to[0];
  const row = moveObj.to[1];
  description += ` ${col} ${row}`;

  // Coronación
  if (moveObj.promotion) {
    const promName = SAN_TO_SPANISH[moveObj.promotion?.toUpperCase()] || 'Dama';
    description += `, coronando a ${promName}`;
  }

  // Jaque
  if (san.includes('+')) {
    description += '. ¡Jaque!';
  } else if (san.includes('#')) {
    description += '. ¡Jaque mate!';
  }

  // Captura al paso
  if (moveObj.flags?.includes('e')) {
    description += ' al paso';
  }

  return description;
}

/**
 * Genera una descripción verbal del estado del tablero
 */
function describeBoardState(chess) {
  const turn = chess.turn() === 'w' ? 'blancas' : 'negras';
  let state = `Turno de las ${turn}. `;

  if (chess.isCheck()) {
    state += '¡Estás en jaque! ';
  }

  if (chess.isCheckmate()) {
    state += '¡Jaque mate! ';
  } else if (chess.isStalemate()) {
    state += 'Tablas por ahogado. ';
  } else if (chess.isDraw()) {
    state += 'La partida es tablas. ';
  }

  return state;
}

module.exports = {
  parseSpanishMove,
  moveToSpanish,
  describeBoardState,
  normalize,
  PIECE_MAP,
};
