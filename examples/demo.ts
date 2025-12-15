import { createAresClient } from '../src/ares';

(async () => {
  const client = createAresClient();
  const info = await client.getAresInfo('27074358');
  console.log(info);
})();