import { NextRequest, NextResponse } from 'next/server';
import { fetchTseResult, STATES, type ElectionResponse, type Turn } from '@/lib/election';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestedTurn = request.nextUrl.searchParams.get('turn');
  if (requestedTurn !== '1' && requestedTurn !== '2') {
    return NextResponse.json({ error: 'Turno inválido. Use 1 ou 2.' }, { status: 400 });
  }
  const turn = Number(requestedTurn) as Turn;
  const regions = ['br', ...STATES.map(([uf]) => uf)];
  const results = await Promise.all(regions.map((region) => fetchTseResult(turn, region)));
  const states: ElectionResponse['states'] = {};
  STATES.forEach(([uf], index) => { states[uf] = results[index + 1]; });
  const payload: ElectionResponse = {
    turn,
    fetchedAt: new Date().toISOString(),
    national: results[0],
    states,
    unavailable: regions.filter((_, index) => results[index] === null),
  };
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' },
  });
}
