import { createAresClient } from '../src/ares';

(async () => {
  const client = createAresClient({
    logger: (msg, level = 'info') => console.log(`[${level}] ${msg}`)
  });

  const ico = process.argv[2] ?? '27074358'; // volitelně: npm run demo -- 27074358
  const info = await client.getAresInfo(ico);

  console.log(JSON.stringify(info, null, 2));
})();