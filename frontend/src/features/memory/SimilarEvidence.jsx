import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import GlassPanel from '../../components/GlassPanel';

export default function SimilarEvidence({ query, toolId, category, asOf, incidentId }) {
  const { client, currentRole, demoUserId } = useStore();
  const [storedState, setState] = useState({}), [allTools, setAllTools] = useState(false);
  const key = JSON.stringify([query, toolId, category, asOf, incidentId, allTools, currentRole, demoUserId]);
  const state = storedState.key === key ? storedState : {};
  const request = useRef(null);
  useEffect(() => {
    request.current?.abort(); setState({});
    return () => request.current?.abort();
  }, [client, query, toolId, category, asOf, incidentId, allTools]);
  async function search() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setState({ key, loading: true });
    try {
      const options = { signal: controller.signal };
      const data = incidentId
        ? await client.getSimilar(incidentId, { ...options, scope: allTools ? 'all-tools' : 'same-tool' })
        : await client.searchEvidence({ query, ...(!allTools && toolId ? { toolId } : {}), ...(category ? { category } : {}), ...(asOf ? { asOf } : {}) }, options);
      if (!controller.signal.aborted) setState({ key, data });
    } catch (error) { if (!controller.signal.aborted) setState({ key, error: error.message }); }
  }
  return <GlassPanel variant="strong" style={{ padding: '22px', marginBottom: '20px', overflowWrap: 'anywhere' }}>
    <h3>Similar incidents and SOP evidence</h3>
    <p>Past reports and recorded repair notes provide context. Needs technician verification; search does not decide duplicates or recommend repairs.</p>
    <label><input type="checkbox" checked={allTools} onChange={event => setAllTools(event.target.checked)} /> Include other tools</label>
    <div style={{ marginTop: '12px' }}><button className="secondary-action" onClick={search} disabled={state.loading || (!incidentId && !query?.trim())}>
      {state.loading ? 'Searching local evidence…' : 'Find similar records'}
    </button></div>
    {state.error && <p role="alert">{state.error}</p>}
    {state.loading && <p role="status">Loading the local index. Reporting remains available.</p>}
    {state.data && <div data-testid="similar-results">
      <p>{state.data.method === 'HYBRID' ? 'Local embeddings + keywords' : 'Keyword search'} · {state.data.indexedPassages} indexed passages</p>
      <p className="muted">{state.data.scoreMeaning}</p>
      {state.data.warnings.map(warning => <p className="resource-message" key={warning}>{warning}</p>)}
      {!state.data.matches.length && <p>No sufficiently relevant past records were found. Try a reviewed English translation or more specific symptoms. This does not establish that the issue is new or safe.</p>}
      {state.data.matches.map(match => <article key={match.chunkId} style={{ borderTop: '1px solid rgba(14,26,47,.15)', paddingTop: '12px', marginTop: '12px' }}>
        <h4>{match.title}</h4>
        <p><strong>Source: {match.sourceType} {match.sourceId}</strong>{match.incidentId && match.sourceType !== 'INCIDENT' ? ` · Incident ${match.incidentId}` : ''}{match.section ? ` · Section ${match.section}` : ''}</p>
        <blockquote style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{match.excerpt}</blockquote>
        <p>{match.label}</p>
        <details><summary>Citation and relevance details</summary>
          <p>Version: {match.sourceVersion}</p><p>Passage: {match.chunkId}</p>
          <p>Source characters: {match.span.start}–{match.span.end} ({match.span.unit})</p>
          <p>Keyword relevance: {match.lexicalScore}; semantic similarity: {match.semanticSimilarity ?? 'Unavailable'}. Scores are not probabilities.</p>
          <p>Embedding model: {state.data.embeddingModelVersion || 'Not used'}</p>
        </details>
      </article>)}
    </div>}
  </GlassPanel>;
}
