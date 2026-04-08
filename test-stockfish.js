
const Stockfish = require('./alexa-skill/lambda/node_modules/stockfish');
try {
    const engine = Stockfish();
    console.log('Engine created successfully');
    engine.onmessage = function(msg) {
        console.log('Stockfish says:', msg);
        if (msg.includes('uciok')) {
            console.log('UCI OK! success.');
            process.exit(0);
        }
    };
    engine.postMessage('uci');
    setTimeout(() => {
        console.log('Timeout waiting for uciok');
        process.exit(1);
    }, 5000);
} catch (e) {
    console.error('Failed to create engine:', e);
    process.exit(1);
}
