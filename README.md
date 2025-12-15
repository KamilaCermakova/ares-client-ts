# ARES client (TypeScript)

Malý TypeScript klient pro ARES (ČR), který načte data subjektu dle IČ a vrátí je v jednoduchém formátu `AresInfo`.

## Funkce
- `getAresInfo(ic)` – stáhne data z ARES a ztransformuje je na `AresInfo`
- formátování adresy do jednoho řádku
- mapování právních forem na čitelné názvy
- timeout a základní ošetření chyb

## Požadavky
- Node.js 18+

## Rychlé spuštění dema
```bash
npm i
npm run demo
```

## Příklad použití
```ts
import { createAresClient } from './src/ares';

(async () => {
  const client = createAresClient();
  const info = await client.getAresInfo("27074358");
  console.log(info);
})();
```