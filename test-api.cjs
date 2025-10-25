// Script pour tester l'API DofusDB
const https = require('https');

const options = {
  hostname: 'api.dofusdb.fr',
  path: '/monsters?id=101',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://dofusdb.fr/',
    'Origin': 'https://dofusdb.fr'
  }
};

console.log('Testing endpoint: https://api.dofusdb.fr/monsters?id=101\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}\n`);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));

      // Chercher la famille
      if (parsed.data && parsed.data.length > 0) {
        const monster = parsed.data[0];
        console.log('\n=== ANALYSE ===');
        console.log('Champs disponibles:', Object.keys(monster));

        // Chercher les champs liés à la famille
        const familyFields = Object.keys(monster).filter(key =>
          key.toLowerCase().includes('race') ||
          key.toLowerCase().includes('family') ||
          key.toLowerCase().includes('breed')
        );

        if (familyFields.length > 0) {
          console.log('\n🎯 FAMILLE TROUVÉE dans ces champs:');
          familyFields.forEach(field => {
            console.log(`  - ${field}: ${JSON.stringify(monster[field])}`);
          });
        }
      }
    } catch (e) {
      console.log(data);
      console.error('Erreur de parsing:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Erreur: ${e.message}`);
});

req.end();
