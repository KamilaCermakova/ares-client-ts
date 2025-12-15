/* =========================================================
   Modul ARES – obecně použitelná verze (bez Tabidoo závislostí)
   ---------------------------------------------------------
   - Poskytuje funkci getAresInfo(ic), která načte detail subjektu z ARES BE REST API.
   - Nepoužívá žádné "doo.*" funkce ani notifikace; místo toho vrací data nebo vyhazuje výjimky.
   - Funguje v prohlížeči i v Node.js (Node 18+ s vestavěným fetch; pro starší Node lze přidat 'node-fetch').
   - Obsahuje defensivní validace a formátování adresy jak v původním kódu.
   ========================================================= */

/* -----------------------------
   1) Veřejné typy (exportované)
   ----------------------------- */
// Hlavní návratový typ zjednodušené vizitky firmy/OSVČ
export interface AresInfo {
  obchodniJmeno: string;
  ic: string;
  fakturacniAdresaUliceACislo: string;
  fakturacniAdresaMesto: string;
  fakturacniAdresaPSC: string;
  dic?: string;
  jmenoAPrijmeni?: string;
  legalForm: string;
  nameRegion: string;
}

/* ----------------------------------------
   2) Interní typy – dle ARES odpovědi (CZ)
   ---------------------------------------- */
// Pozn.: zachováno dle vašeho původního modelu pro kompatibilitu
interface CompanyInfo {
  ico: string;
  obchodniJmeno: string;
  sidlo: Address;
  pravniForma: string;
  financniUrad: string;
  datumVzniku: string;
  datumAktualizace: string;
  dic: string;
  icoId: string;
  adresaDorucovaci: Record<string, unknown>;
  seznamRegistraci: Registrations;
  primarniZdroj: string;
  czNace: string[];
}

interface Address {
  kodStatu: string;
  nazevStatu: string;
  kodKraje: number;
  nazevKraje: string;
  kodOkresu: number;
  nazevOkresu: string;
  kodObce: number;
  nazevObce: string;
  kodMestskeCastiObvodu: number;
  kodUlice: number;
  nazevMestskeCastiObvodu: string;
  nazevUlice: string;
  cisloDomovni: number;
  kodCastiObce: number;
  cisloOrientacni: number;
  cisloOrientacniPismeno: string;
  nazevCastiObce: string;
  kodAdresnihoMista: number;
  psc: number;
  textovaAdresa: string;
}

interface Registrations {
  stavZdrojeVr: string;
  stavZdrojeRes: string;
  stavZdrojeRzp: string;
  stavZdrojeNrpzs: string;
  stavZdrojeRpsh: string;
  stavZdrojeRcns: string;
  stavZdrojeSzr: string;
  stavZdrojeDph: string;
  stavZdrojeSd: string;
  stavZdrojeIr: string;
  stavZdrojeCeu: string;
  stavZdrojeRs: string;
  stavZdrojeRed: string;
}

/* -------------------------------------------------------
   3) Konfigurace a pomocné typy pro univerzální použití
   ------------------------------------------------------- */
// Nastavení volitelných callbacků pro hlášení průběhu a chyb
export type AresLogger = (msg: string, level?: 'info' | 'success' | 'warning' | 'error') => void;

export interface AresClientOptions {
  baseUrl?: string;            // pro případ budoucích změn endpointu
  requestTimeoutMs?: number;   // timeout pro HTTP požadavek
  logger?: AresLogger;         // volitelný callback pro logování (nahrazuje doo.toast/info)
}

/* ----------------------------------------------------------
   4) Mapování právních forem (zachováno a rozšířitelné)
   ---------------------------------------------------------- */
// Pozn.: klíče jsou kódy z ARES; hodnoty jsou čitelné popisy.
// Lze snadno upravovat/rozšiřovat dle potřeby.
const PRAVNI_FORMA_MAP: Record<string, string> = {
  '000': 'Zatím neurčeno',
  '101': 'Fyzická osoba podnikající dle živnostenského zákona',
  '105': 'Fyzická osoba podnikající dle jiných zákonů než živnostenského a zákona o zemědělství',
  '107': 'Zemědělský podnikatel - fyzická osoba',
  '111': 'Veřejná obchodní společnost',
  '112': 'Společnost s ručením omezeným',
  '113': 'Společnost komanditní',
  '115': 'Společný podnik',
  '116': 'Zájmové sdružení',
  '117': 'Nadace',
  '118': 'Nadační fond',
  '121': 'Akciová společnost',
  '141': 'Obecně prospěšná společnost',
  '145': 'Společenství vlastníků jednotek',
  '151': 'Komoditní burza',
  '161': 'Ústav',
  '205': 'Družstvo',
  '301': 'Státní podnik',
  '313': 'Česká národní banka',
  '325': 'Organizační složka státu',
  '326': 'Stálý rozhodčí soud',
  '331': 'Příspěvková organizace',
  '332': 'Státní příspěvková organizace ze zákona',
  '352': 'Státní organizace Správa železnic',
  '353': 'Rada pro veřejný dohled nad auditem',
  '361': 'Veřejnoprávní instituce (ČT, ČRo, ČTK)',
  '381': 'Fond (ze zákona)',
  '391': 'Zdravotní pojišťovna',
  '421': 'Odštěpný závod zahraniční právnické osoby',
  '422': 'Organizační složka zahraničního nadačního fondu',
  '423': 'Organizační složka zahraniční nadace',
  '424': 'Zahraniční fyzická osoba',
  '425': 'Odštěpný závod zahraniční fyzické osoby',
  '426': 'Zastoupení zahraniční banky',
  '501': 'Odštěpný závod nebo jiná organizační složka podniku zapisující se do OR',
  '521': 'Samostatná drobná provozovna obecního úřadu',
  '541': 'Podílový, penzijní fond',
  '601': 'Vysoká škola (veřejná, státní)',
  '641': 'Školská právnická osoba',
  '661': 'Veřejná výzkumná instituce',
  '706': 'Spolek',
  '707': 'Odborová organizace',
  '708': 'Organizace zaměstnavatelů',
  '711': 'Politická strana, politické hnutí',
  '715': 'Podnik/hospodářské zařízení politické strany',
  '721': 'Církve a náboženské společnosti',
  '722': 'Evidované církevní právnické osoby',
  '723': 'Svazy církví a náboženských společností',
  '733': 'Org. jednotka odborové organizace a org. zaměstnavatelů',
  '734': 'Org. jednotka zvláštní organizace pro zastoupení ČR v MNO',
  '736': 'Pobočný spolek',
  '741': 'Stavovská organizace – profesní komora',
  '745': 'Komora (vyjma profesních komor)',
  '751': 'Zájmové sdružení právnických osob',
  '761': 'Honební společenstvo',
  '771': 'Dobrovolný svazek obcí',
  '801': 'Obec nebo MČ hl. m. Prahy',
  '804': 'Kraj a hl. m. Praha',
  '906': 'Zahraniční spolek',
  '907': 'Mezinárodní odborová organizace',
  '908': 'Mezinárodní organizace zaměstnavatelů',
  '911': 'Zahraniční kulturní/informační středisko, agentura',
  '921': 'Mezinárodní nevládní organizace',
  '922': 'Org. jednotka mezinárodní nevládní organizace',
  '931': 'Evropské hospodářské zájmové sdružení',
  '932': 'Evropská společnost',
  '933': 'Evropská družstevní společnost',
  '936': 'Zahraniční pobočný spolek',
  '941': 'Evropské seskupení pro územní spolupráci',
  '950': 'Subjekt právním řádem výslovně neupravený',
  '951': 'Mezinárodní vojenská organizace (na základě mezin. smlouvy)',
  '952': 'Konsorcium evropské výzkumné infrastruktury',
  '960': 'PO zřízená zvláštním zákonem zapisovaná do veřejného rejstříku'
};

// Kódy právních forem, které v původní logice znamenají „fyzická osoba“
const FYZICKE_OSOBY = ['100', '101', '102', '103', '104', '105', '106', '107', '108'];

/* ---------------------------------------------------------
   5) Pomocné utility – fetch s timeoutem a validacemi
   --------------------------------------------------------- */
// Jednoduchý helper na timeout pro fetch (Promise.race)
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Bezpečné přečtení JSON (pro případ prázdného těla)
async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

/* ----------------------------------------------
   6) Veřejná továrna klienta a hlavní funkce
   ---------------------------------------------- */
export function createAresClient(options: AresClientOptions = {}) {
  // Výchozí nastavení – lze přepsat v parametrech
  const {
    baseUrl = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/',
    requestTimeoutMs = 15000,
    logger
  } = options;

  // Malý wrapper pro "logování" (nahrazuje doo.toast/info apod.)
  const log: AresLogger = (msg, level = 'info') => {
    if (typeof logger === 'function') logger(msg, level);
  };

  // -------------------------
  // Hlavní veřejná funkce API
  // -------------------------
  async function getAresInfo(ic: string): Promise<AresInfo | undefined> {
    // 1) Základní kontrola vstupu
    const cleanedIc = (ic || '').toString().trim();
    if (!cleanedIc) {
      throw new Error('IČ nelze načíst – nebylo zadáno.');
    }

    log('Načítám informace o subjektu z ARES…', 'info');

    try {
      // 2) HTTP GET na ARES endpoint (standardní fetch – žádné doo.functions.request) 
      const url = `${baseUrl}${encodeURIComponent(cleanedIc)}`;
      const response = await fetchWithTimeout(url, { method: 'GET' }, requestTimeoutMs);

      // 3) Vyhodnocení HTTP stavu a převod na JSON
      if (!response.ok) {
        // 404 = nenalezeno; ostatní kódy = různé chyby s tělem
        let popisChyby = `HTTP ${response.status}`;
        try {
          const errBody = await safeJson<any>(response);
          // ARES někdy vrací informativní "popis"; pokud není, necháme status
          popisChyby = errBody?.errorData?.popis || errBody?.message || popisChyby;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(`Nebylo možné načíst data z ARES. ${popisChyby}`);
      }

      const data = (await safeJson<CompanyInfo>(response)) as CompanyInfo;

      // 4) Validace minimálních polí (analogicky k původní logice if (response?.ico) {...})
      if (!data || !data.ico) {
        log('Nevalidní odpověď ARES – zkontrolujte zadané IČ.', 'warning');
        return undefined;
      }

      // 5) Transformace do AresInfo (zachováno z původní logiky)
      const result = handleResponseData(data);

      log('Data z ARES byla úspěšně načtena.', 'success');
      return result;

    } catch (err: any) {
      // 6) Chyby – vyhazujeme jako výjimku, aby si volající rozhodl o UX (toast, modal atd.)
      //    Původní kód volal doo.alert.showError/doo.toast (Tabidoo-specifické). Zde čisté throw.
      //    (V projektu si to napojíte na vlastní notifikace.)
      const description = err?.message || 'Neznámá chyba při komunikaci s ARES.';
      log(`Chyba: ${description}`, 'error');
      throw err;
    }
  }

  // Vrátíme pouze to, co chcete publikovat (např. do portfolia jako čisté API)
  return { getAresInfo };
}

/* ------------------------------------------------------
   7) Čistá transformace odpovědi na AresInfo (pure fn)
   ------------------------------------------------------ */
function handleResponseData(response: CompanyInfo): AresInfo {
  // Vytažení dat a bezpečné složení adresy
  const nameRegion = response.sidlo?.nazevKraje ?? '';
  const obchodniJmeno = response.obchodniJmeno ?? '';
  const uliceNeboCast = response.sidlo?.nazevUlice ?? response.sidlo?.nazevCastiObce ?? '';
  const cisloDomovni = response.sidlo?.cisloDomovni ?? '';
  const cisloOrientacni = response.sidlo?.cisloOrientacni;
  const cisloOrientacniPismeno = cisloOrientacni ? (response.sidlo?.cisloOrientacniPismeno ?? '') : '';

  // Formátování "Ulice 123/45A" – stejné chování jako v původním kódu
  const fakturacniAdresaUliceACislo = `${uliceNeboCast} ${cisloDomovni}${cisloOrientacni ? '/' + cisloOrientacni : ''}${cisloOrientacni && cisloOrientacniPismeno ? cisloOrientacniPismeno : ''}`.trim();

  // Mapování právní formy na čitelné označení
  const legalForm = PRAVNI_FORMA_MAP[response.pravniForma] || response.pravniForma || '';

  const aresInfo: AresInfo = {
    obchodniJmeno,
    ic: response.ico,
    fakturacniAdresaUliceACislo,
    fakturacniAdresaMesto: response.sidlo?.nazevObce ?? '',
    fakturacniAdresaPSC: (response.sidlo?.psc ?? '').toString(),
    legalForm,
    nameRegion
  };

  if (response.dic) {
    aresInfo.dic = response.dic;
  }
  if (FYZICKE_OSOBY.includes(response.pravniForma)) {
    aresInfo.jmenoAPrijmeni = response.obchodniJmeno;
  }
  return aresInfo;
}

/* ---------------------------------------
   8) Krátká ukázka použití (volitelné)
   ---------------------------------------
   (Pro Node 18+)
   import { createAresClient } from './ares';

   const ares = createAresClient({
     logger: (msg, level) => console.log(`[${level}] ${msg}`)
   });

   (async () => {
     const info = await ares.getAresInfo('27074358');
     console.log(info);
   })();
*/