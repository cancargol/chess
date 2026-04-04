/**
 * Gestor de Stockfish.js para AWS Lambda.
 * Usa la versión WASM de Stockfish que se ejecuta dentro del runtime de Node.js.
 */

let stockfishEngine = null;
let engineReady = false;

/**
 * Inicializa el motor Stockfish (se reutiliza entre invocaciones de Lambda).
 * @returns {Promise<object>} Instancia del motor
 */
async function initEngine() {
  if (stockfishEngine && engineReady) {
    return stockfishEngine;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Stockfish initialization timeout (10s)'));
    }, 10000);

    try {
      const Stockfish = require('stockfish');
      const engine = Stockfish();

      const messageHandler = (line) => {
        if (typeof line === 'string' && line.includes('uciok')) {
          engineReady = true;
          clearTimeout(timeout);
          resolve(engine);
        }
      };

      // stockfish.js puede usar onmessage o addEventListener
      if (typeof engine.onmessage === 'function' || engine.onmessage === null) {
        engine.onmessage = (event) => {
          const msg = typeof event === 'string' ? event : event?.data;
          messageHandler(msg);
        };
      } else if (typeof engine.addMessageListener === 'function') {
        engine.addMessageListener(messageHandler);
      } else if (typeof engine.on === 'function') {
        engine.on('message', messageHandler);
      }

      // Enviar comando UCI para inicializar
      sendCommand(engine, 'uci');
      stockfishEngine = engine;
    } catch (err) {
      clearTimeout(timeout);
      reject(new Error(`Failed to load Stockfish: ${err.message}`));
    }
  });
}

/**
 * Envía un comando al motor.
 */
function sendCommand(engine, command) {
  if (typeof engine.postMessage === 'function') {
    engine.postMessage(command);
  } else if (typeof engine.send === 'function') {
    engine.send(command);
  } else if (typeof engine.stdin?.write === 'function') {
    engine.stdin.write(command + '\n');
  }
}

/**
 * Calcula la mejor jugada del motor para una posición FEN dada.
 *
 * @param {string} fen - Posición actual en formato FEN
 * @param {number} skillLevel - Nivel de habilidad (0-20)
 * @param {number} depth - Profundidad de búsqueda
 * @param {number} [moveTimeMs=3000] - Tiempo máximo en ms
 * @returns {Promise<string>} Mejor jugada en formato UCI (ej: "e2e4")
 */
async function getBestMove(fen, skillLevel, depth, moveTimeMs = 3000) {
  const engine = await initEngine();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Forzar parada y usar lo que tenga
      sendCommand(engine, 'stop');
    }, moveTimeMs + 2000);

    let bestMove = null;

    const messageHandler = (line) => {
      const msg = typeof line === 'string' ? line : line?.data;
      if (typeof msg !== 'string') return;

      // Capturar bestmove
      const match = msg.match(/^bestmove\s+(\S+)/);
      if (match) {
        bestMove = match[1];
        clearTimeout(timeout);
        removeListener();
        resolve(bestMove);
      }
    };

    // Registrar listener temporal
    let removeListener;
    if (typeof engine.onmessage === 'function' || engine.onmessage !== undefined) {
      const originalHandler = engine.onmessage;
      engine.onmessage = (event) => {
        const msg = typeof event === 'string' ? event : event?.data;
        if (originalHandler) originalHandler(event);
        messageHandler(msg);
      };
      removeListener = () => { engine.onmessage = originalHandler; };
    } else if (typeof engine.addMessageListener === 'function') {
      engine.addMessageListener(messageHandler);
      removeListener = () => {
        if (typeof engine.removeMessageListener === 'function') {
          engine.removeMessageListener(messageHandler);
        }
      };
    } else if (typeof engine.on === 'function') {
      engine.on('message', messageHandler);
      removeListener = () => engine.removeListener('message', messageHandler);
    } else {
      removeListener = () => {};
    }

    // Configurar nivel de habilidad
    sendCommand(engine, 'isready');
    sendCommand(engine, `setoption name Skill Level value ${skillLevel}`);
    sendCommand(engine, 'isready');

    // Enviar posición y calcular
    sendCommand(engine, `position fen ${fen}`);
    sendCommand(engine, `go depth ${depth} movetime ${moveTimeMs}`);
  });
}

/**
 * Reinicia el motor (limpia estado para nueva partida).
 */
async function resetEngine() {
  if (stockfishEngine) {
    sendCommand(stockfishEngine, 'ucinewgame');
    sendCommand(stockfishEngine, 'isready');
  }
}

/**
 * Apaga el motor.
 */
function shutdownEngine() {
  if (stockfishEngine) {
    sendCommand(stockfishEngine, 'quit');
    stockfishEngine = null;
    engineReady = false;
  }
}

module.exports = {
  initEngine,
  getBestMove,
  resetEngine,
  shutdownEngine,
};
