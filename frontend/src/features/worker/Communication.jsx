import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import GlassPanel from '../../components/GlassPanel';

export default function Communication({ card, incidentId, language = 'en', traceWindow, traceVersion, mode = 'status' }) {
  const { client, currentRole, demoUserId, apiConfig } = useStore();
  const [lang, setLang] = useState(language);
  const [stored, setStored] = useState({});
  const [approvalId, setApprovalId] = useState(''), [dealerId, setDealerId] = useState('');
  const request = useRef(null), audioUrl = useRef(null), player = useRef(null);
  const key = JSON.stringify([mode, card, incidentId, lang, traceWindow, traceVersion, currentRole, demoUserId, approvalId, dealerId]);
  const state = stored.key === key ? stored : {};
  const clearAudio = () => {
    player.current?.pause();
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  };
  useEffect(() => { setLang(language); }, [language]);
  useEffect(() => {
    request.current?.abort(); clearAudio();
    return () => { request.current?.abort(); clearAudio(); };
  }, [client, key]);
  async function run(action) {
    request.current?.abort(); clearAudio();
    const controller = new AbortController(); request.current = controller;
    setStored({ key, loading: true });
    try {
      const options = { signal: controller.signal };
      let data;
      if (action === 'readback') data = await client.readback({ language: lang, reviewed: true, ...(card ? { card } : { incidentId }) }, options);
      else if (action === 'explanation') data = await client.getTraceExplanation(incidentId, traceWindow, lang, options);
      else if (action === 'dealer') data = await client.createDealerDraft(incidentId, { language: lang, approvalId, dealerId }, options);
      else data = await client.getStatusText(incidentId, lang, options);
      if (controller.signal.aborted) return;
      if (action === 'explanation' && (data.traceVersion !== traceVersion || data.windowHours !== traceWindow))
        throw new Error('The stored trace changed. Refresh records before requesting its explanation.');
      let url;
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio), char => char.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: data.mimeType })); audioUrl.current = url;
      }
      setStored({ key, data, url });
    } catch (error) { if (!controller.signal.aborted) setStored({ key, error: error.message }); }
  }
  return <GlassPanel variant="strong" style={{ padding: '22px', marginBottom: '20px' }}>
    <h3>{mode === 'readback' ? 'Review and listen to the card' : 'Multilingual incident updates'}</h3>
    <label>Update language <select aria-label="Update language" value={lang} onChange={event => setLang(event.target.value)}>
      <option value="kn">ಕನ್ನಡ</option><option value="hi">हिन्दी</option><option value="en">English</option>
    </select></label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
      {mode === 'readback' && <button className="secondary-action" disabled={state.loading} onClick={() => run('readback')}>I reviewed this card — read aloud</button>}
      {mode !== 'readback' && <button className="secondary-action" disabled={state.loading} onClick={() => run('status')}>Refresh status in my language</button>}
      {mode !== 'readback' && apiConfig.aiEnabled && ['Worker', 'Manager'].includes(currentRole) && <button className="secondary-action" disabled={state.loading} onClick={() => run('readback')}>Read saved card aloud</button>}
      {mode !== 'readback' && traceVersion && ['Manager', 'Quality', 'Verifier'].includes(currentRole) && <button className="secondary-action" disabled={state.loading} onClick={() => run('explanation')}>Explain this trace</button>}
    </div>
    {mode !== 'readback' && currentRole === 'Quality' && <details style={{ marginTop: '12px' }}>
      <summary>Approval-bound dealer notice draft</summary>
      <p>Requires an approved Quality notification and matching shipped batches. The draft is stored with application audit history and is never sent automatically.</p>
      <label>Approval ID <input aria-label="Dealer draft approval ID" maxLength={120} value={approvalId} onChange={event => setApprovalId(event.target.value)} /></label>
      <label>Dealer ID <input aria-label="Dealer draft dealer ID" maxLength={120} value={dealerId} onChange={event => setDealerId(event.target.value)} /></label>
      <button className="secondary-action" disabled={state.loading || !approvalId.trim() || !dealerId.trim()} onClick={() => run('dealer')}>Create dealer draft</button>
    </details>}
    {state.loading && <p role="status">Loading communication…</p>}
    {state.error && <p role="alert">{state.error}</p>}
    {state.data && <div data-testid="communication-result">
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} lang={lang}>{state.data.text}</p>
      {state.url && <audio ref={player} controls src={state.url} aria-label="Reviewed card readback" />}
      <p>Source: {state.data.sourceIds?.join(', ') || 'Current editable card'} · {state.data.modelVersion}</p>
      {state.data.asOf && <p>Read from stored records at {state.data.asOf}. Refresh for changes.</p>}
      {state.data.traceId && <p>Trace {state.data.traceId} · version {state.data.traceVersion} · {state.data.windowHours}h · snapshot {state.data.snapshotTime}</p>}
      {state.data.tierMeaning && Object.entries(state.data.tierMeaning).map(([tier, meaning]) => <p key={tier}>{tier}: {meaning}</p>)}
      {state.data.gaps?.map((gap, index) => <p key={index}>Unknown evidence: {JSON.stringify(gap)}</p>)}
      {state.data.docId && <p>Stored draft {state.data.docId} · Not sent</p>}
    </div>}
  </GlassPanel>;
}
