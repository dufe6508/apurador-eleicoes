'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import brazil from '@svg-maps/brazil';
import { ArrowUpRight, Clock3, RefreshCw, Vote } from 'lucide-react';
import { STATES, type Candidate, type ElectionResponse, type Result, type Turn } from '@/lib/election';

const stateName = new Map<string, string>(STATES.map(([code, name]) => [code, name]));
const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const formatPercent = (value: number) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
const candidateColor = (number: string) => number === '13' ? 'var(--candidate-a)' : number === '22' ? 'var(--candidate-b)' : 'var(--candidate-other)';

function CandidateRow({ candidate, leading, showBar }: { candidate: Candidate; leading: boolean; showBar: boolean }) {
  return <div className="candidate-row">
    <div className="candidate-topline">
      <span className="candidate-symbol" style={{ background: candidateColor(candidate.number) }}>{candidate.number}</span>
      <div className="candidate-identity"><strong>{candidate.name}</strong><span>{candidate.party} · Nº {candidate.number}</span></div>
      {leading && showBar && <span className="leading-tag">À frente</span>}
    </div>
    <div className="candidate-numbers"><strong>{formatPercent(candidate.percent)}</strong><span>{formatNumber(candidate.votes)} votos</span></div>
    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, candidate.percent)}%`, background: candidateColor(candidate.number) }} /></div>
  </div>;
}

function PresidentialRace({ result, turn }: { result: Result | null; turn: Turn }) {
  const flavio = result?.candidates.find((candidate) => candidate.number === '22');
  const lula = result?.candidates.find((candidate) => candidate.number === '13');
  const hasVotes = Boolean(result && result.sectionsCounted > 0 && ((flavio?.votes || 0) + (lula?.votes || 0) > 0));
  const flavioPercent = hasVotes ? flavio?.percent || 0 : 0;
  const lulaPercent = hasVotes ? lula?.percent || 0 : 0;

  return <section className="race-card" aria-labelledby="race-heading">
    <div className="race-heading"><div><span className="section-kicker">PRESIDÊNCIA DA REPÚBLICA · {turn}º TURNO</span><h2 id="race-heading">Disputa nacional</h2></div><span className="race-scope">BRASIL</span></div>
    <div className="race-contenders">
      <div className="race-person race-person-left"><Image src="/candidates/flavio-bolsonaro.jpg" alt="Foto de Flávio Bolsonaro" width={96} height={96} priority /><div className="race-person-info"><strong>Flávio Bolsonaro</strong><span>PL · 22</span><b>{hasVotes ? formatPercent(flavioPercent) : '—'}</b><small>{hasVotes ? `${formatNumber(flavio?.votes || 0)} votos` : 'Aguardando votos'}</small></div></div>
      <div className="race-person race-person-right"><div className="race-person-info"><strong>Lula</strong><span>PT · 13</span><b>{hasVotes ? formatPercent(lulaPercent) : '—'}</b><small>{hasVotes ? `${formatNumber(lula?.votes || 0)} votos` : 'Aguardando votos'}</small></div><Image src="/candidates/lula.jpg" alt="Foto de Lula" width={96} height={96} priority /></div>
    </div>
    <div className="race-bar-container"><div className="race-half-label">50%</div><div className="race-bar" role="img" aria-label={hasVotes ? `Flávio Bolsonaro ${formatPercent(flavioPercent)}; Lula ${formatPercent(lulaPercent)} dos votos válidos` : 'Aguardando os primeiros votos válidos'}><div className="race-fill-flavio" style={{ width: `${flavioPercent}%` }} /><div className="race-fill-lula" style={{ width: `${lulaPercent}%` }} /><i className="race-midpoint" /></div><div className="race-bar-labels"><span>FLÁVIO BOLSONARO</span><span>VOTOS VÁLIDOS</span><span>LULA</span></div></div>
  </section>;
}

function BrazilMap({ data, selected, onSelect }: { data: ElectionResponse | null; selected: string; onSelect: (value: string) => void }) {
  const locations = brazil.locations as { id: string; name: string; path: string }[];
  return <div className="map-wrap">
    <svg viewBox={brazil.viewBox} role="img" aria-label="Mapa interativo dos estados do Brasil" className="brazil-map">
      {locations.map((location) => {
        const uf = location.id.toLowerCase();
        const result = data?.states[uf];
        const hasVotes = Boolean(result && result.sectionsCounted > 0 && result.candidates[0]?.votes);
        const leader = hasVotes ? result!.candidates[0] : null;
        const fill = leader ? candidateColor(leader.number) : 'var(--map-empty)';
        return <path
          key={uf}
          d={location.path}
          className={`map-state ${selected === uf ? 'selected' : ''}`}
          style={{ fill }}
          tabIndex={0}
          role="button"
          aria-label={`${stateName.get(uf) || location.name}: ${leader ? `${leader.name} à frente, ${formatPercent(leader.percent)}` : 'sem votos apurados'}`}
          aria-pressed={selected === uf}
          onClick={() => onSelect(uf)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(uf); } }}
        ><title>{stateName.get(uf) || location.name}</title></path>;
      })}
    </svg>
  </div>;
}

export function Dashboard() {
  const [turn, setTurn] = useState<Turn>(2);
  const [selected, setSelected] = useState('br');
  const [data, setData] = useState<ElectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async (currentTurn: Turn, manual = false, signal?: AbortSignal) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetch(`/api/results?turn=${currentTurn}${manual ? `&r=${Date.now()}` : ''}`, { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível consultar os dados.');
      const payload = await response.json() as ElectionResponse;
      if (!payload || payload.turn !== currentTurn || !payload.states) throw new Error('Resposta incompleta do servidor.');
      setData(payload);
      setLastChecked(new Date());
      setError(payload.national ? '' : 'O resultado nacional está temporariamente indisponível no TSE.');
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar os resultados.');
    } finally {
      if (!signal?.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(turn, false, controller.signal);
    const timer = window.setInterval(() => void load(turn, true, controller.signal), 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [turn, load]);

  const result: Result | null = selected === 'br' ? data?.national ?? null : data?.states[selected] ?? null;
  const hasVotes = Boolean(result && result.sectionsCounted > 0 && result.candidates.some((candidate) => candidate.votes > 0));
  const name = selected === 'br' ? 'Brasil' : stateName.get(selected) || selected.toUpperCase();
  const prominentCandidates = turn === 2 ? result?.candidates.slice(0, 2) : result?.candidates.slice(0, 5);
  const updated = result?.generatedAt || 'Aguardando publicação';

  return <div className="site-shell">
    <header className="site-header">
      <div className="brand"><div className="brand-mark"><Vote size={23} strokeWidth={2.1} /></div><div><strong>PULSO<span>ELEITORAL</span></strong><small>ELEIÇÕES 2026</small></div></div>
      <div className="header-right"><a href="https://resultados.tse.jus.br/oficial/app/index.html" target="_blank" rel="noreferrer" className="header-link">Ver no TSE <ArrowUpRight size={15} /></a></div>
    </header>

    <main className="main-content">
      <div className="page-intro"><div><h1>O Brasil em <em>contagem.</em></h1><p>Resultados da eleição presidencial, estado por estado.</p></div><div className="date-block"><span>ELEIÇÃO GERAL</span><strong>{turn === 1 ? '04' : '25'} OUT <i>/</i> 2026</strong><small>Horário de Brasília</small></div></div>

      <PresidentialRace result={data?.national ?? null} turn={turn} />


      {error && <div className="error-banner" role="alert">{error} <button type="button" onClick={() => void load(turn, true)}>Tentar novamente</button></div>}

      <div className="dashboard-grid">
        <section className="map-card" aria-labelledby="map-heading"><div className="section-top"><div><span className="section-kicker">PANORAMA NACIONAL</span><h2 id="map-heading">Mapa da apuração</h2></div><span className="card-caption">CLIQUE EM UM ESTADO</span></div><BrazilMap data={data} selected={selected} onSelect={setSelected} /><div className="map-bottom"><div className="legend"><span><i className="legend-swatch candidate-a" /> Nº 13</span><span><i className="legend-swatch candidate-b" /> Nº 22</span><span><i className="legend-swatch empty" /> Sem votos apurados</span></div><button type="button" className="text-button" onClick={() => setSelected('br')}>Ver Brasil inteiro →</button></div></section>

        <section className="results-card" aria-labelledby="results-heading"><div className="section-top results-top"><div><span className="section-kicker">RESULTADO {selected === 'br' ? 'NACIONAL' : 'ESTADUAL'}</span><h2 id="results-heading">{name}</h2></div><span className="uf-badge">{selected.toUpperCase()}</span></div><div className="counting-progress"><div className="progress-heading"><span>SEÇÕES TOTALIZADAS</span><strong>{loading && !data ? '—' : formatPercent(result?.sectionsPercent || 0)}</strong></div><div className="progress-track"><div style={{ width: `${result?.sectionsPercent || 0}%` }} /></div><small>{result ? `${formatNumber(result.sectionsCounted)} de ${formatNumber(result.sectionsTotal)} seções` : 'Sem dados disponíveis'}</small></div><div className="results-divider" /><div className="candidates-title"><h3>Candidatos</h3><span>VOTOS VÁLIDOS</span></div>{loading && !data ? <div className="empty-state">Carregando resultados oficiais…</div> : !result ? <div className="empty-state">Dados indisponíveis para esta localidade. Tente atualizar em instantes.</div> : !hasVotes ? <div className="empty-state">Aguardando os primeiros votos apurados pelo TSE.<small>Os nomes abaixo aparecem após a publicação dos resultados.</small></div> : <div className="candidates-list">{prominentCandidates?.map((candidate, index) => <CandidateRow key={candidate.number} candidate={candidate} leading={index === 0} showBar={hasVotes} />)}</div>}<div className="results-footer"><div><span>VOTOS VÁLIDOS</span><strong>{result ? formatNumber(result.validVotes) : '—'}</strong></div><div><span>TOTAL DE VOTOS</span><strong>{result ? formatNumber(result.totalVotes) : '—'}</strong></div></div></section>
      </div>

      <section className="controls-panel" aria-label="Filtros da apuração"><div className="turn-control"><span className="control-label">TURNO</span><div className="segmented" role="group" aria-label="Selecione o turno"><button type="button" className={turn === 1 ? 'active' : ''} onClick={() => { setTurn(1); setData(null); }}>1º turno</button><button type="button" className={turn === 2 ? 'active' : ''} onClick={() => { setTurn(2); setData(null); }}>2º turno</button></div></div><div className="region-control"><label className="control-label" htmlFor="region">LOCALIDADE</label><div className="select-wrap"><select id="region" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="br">Brasil — resultado nacional</option>{STATES.map(([uf, label]) => <option key={uf} value={uf}>{label} — {uf.toUpperCase()}</option>)}</select></div></div><button type="button" className="refresh-button" onClick={() => void load(turn, true)} disabled={refreshing} aria-label="Atualizar resultados"><RefreshCw size={18} className={refreshing ? 'spinning' : ''} /><span>Atualizar</span></button></section>
      <div className="status-strip"><div><Clock3 size={16} /><span>Última geração no TSE: <strong>{updated}</strong></span></div><div>Consultado {lastChecked ? lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'} · Atualização automática a cada 60 segundos</div></div>
    </main>
  </div>;
}
