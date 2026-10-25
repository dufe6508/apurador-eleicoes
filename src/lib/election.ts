export const STATES = [
  ['ac', 'Acre'], ['al', 'Alagoas'], ['ap', 'Amapá'], ['am', 'Amazonas'],
  ['ba', 'Bahia'], ['ce', 'Ceará'], ['df', 'Distrito Federal'], ['es', 'Espírito Santo'],
  ['go', 'Goiás'], ['ma', 'Maranhão'], ['mt', 'Mato Grosso'], ['ms', 'Mato Grosso do Sul'],
  ['mg', 'Minas Gerais'], ['pa', 'Pará'], ['pb', 'Paraíba'], ['pr', 'Paraná'],
  ['pe', 'Pernambuco'], ['pi', 'Piauí'], ['rj', 'Rio de Janeiro'], ['rn', 'Rio Grande do Norte'],
  ['rs', 'Rio Grande do Sul'], ['ro', 'Rondônia'], ['rr', 'Roraima'], ['sc', 'Santa Catarina'],
  ['sp', 'São Paulo'], ['se', 'Sergipe'], ['to', 'Tocantins'],
] as const;

export type Uf = (typeof STATES)[number][0];
export type Turn = 1 | 2;

export interface Candidate {
  number: string;
  name: string;
  party: string;
  votes: number;
  percent: number;
  status: string;
}

export interface Result {
  region: string;
  generatedAt: string | null;
  sectionsTotal: number;
  sectionsCounted: number;
  sectionsPercent: number;
  validVotes: number;
  totalVotes: number;
  candidates: Candidate[];
}

export interface ElectionResponse {
  turn: Turn;
  fetchedAt: string;
  national: Result | null;
  states: Record<string, Result | null>;
  unavailable: string[];
}

const TSE_BASE = 'https://resultados.tse.jus.br/oficial/ele2026';

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const str = (value: unknown): string => typeof value === 'string' ? value : '';
const number = (value: unknown): number => {
  const result = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
};

export function parseTseResult(raw: unknown, region: string): Result | null {
  const data = record(raw);
  const cargos = list(data.carg);
  if (str(data.cdabr) !== region || !cargos.length) return null;
  const office = record(cargos[0]);
  if (str(office.cd) !== '1') return null;

  const candidates = list(office.agr).flatMap((group) =>
    list(record(group).par).flatMap((party) => {
      const p = record(party);
      return list(p.cand).map((item) => {
        const c = record(item);
        return {
          number: str(c.n),
          name: str(c.nmu) || str(c.nm),
          party: str(p.sg),
          votes: number(c.vap),
          percent: number(c.pvap),
          status: str(c.st),
        };
      });
    }),
  ).filter((candidate) => candidate.number && candidate.name)
    .sort((a, b) => b.votes - a.votes || a.number.localeCompare(b.number));

  const sections = record(data.s);
  const votes = record(data.v);
  const date = str(data.dg);
  const time = str(data.hg);
  return {
    region,
    generatedAt: date ? `${date}${time ? ` ${time}` : ''}` : null,
    sectionsTotal: number(sections.ts),
    sectionsCounted: number(sections.st),
    sectionsPercent: number(sections.pst),
    validVotes: number(votes.vv),
    totalVotes: number(votes.tv),
    candidates,
  };
}

export async function fetchTseResult(turn: Turn, region: string): Promise<Result | null> {
  const election = turn === 1 ? '6257' : '6258';
  const file = `${region}-c0001-e00${election}-u.json`;
  const url = `${TSE_BASE}/${election}/dados/${region}/${file}`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(12000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return parseTseResult(await response.json(), region);
  } catch {
    return null;
  }
}
