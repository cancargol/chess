const { parseSpanishMove } = require('./alexa-skill/lambda/utils/spanish-notation');

const testCases = [
  'dama f3',
  'reina f3',
  'torre e2',
  'alfil d4',
  'caballo b3',
  'torre a d1', // Desambiguación real
];

console.log('--- TEST ANTES DE LA MEJORA ---');
testCases.forEach(input => {
  const result = parseSpanishMove(input);
  console.log(`Input: "${input}" -> SAN: "${result.san || result.error}" (Type: ${result.type})`);
});
