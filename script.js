(() => {
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const saved = localStorage.getItem('AKSI_BACKEND');
  const initial = qs.get('api') || saved || '';
  $('backend').value = initial;
  const base = () => $('backend').value.trim();
  const save = () => { localStorage.setItem('AKSI_BACKEND', base()); alert('Сохранено'); };
  $('save').addEventListener('click', save);

  async function call(method, path, body, asText=false) {
    const url = base().replace(//$/, '') + path;
    const opt = { method, headers: {} };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(url, opt);
    if (!r.ok) throw new Error(method+' '+path+' → '+r.status);
    return asText ? r.text() : r.json();
  }
  const set = (id, v) => { $(id).textContent = typeof v === 'string' ? v : JSON.stringify(v); };

  $('btnHealth').onclick = async () => { try { set('outHealth', await call('GET','/health')); } catch(e){ set('outHealth', e.message); } };
  $('btnVersion').onclick = async () => { try { set('outVersion', await call('GET','/version')); } catch(e){ set('outVersion', e.message); } };
  $('btnEcho').onclick = async () => { try { const p = JSON.parse($('echoPayload').value); set('outEcho', await call('POST','/echo', p)); } catch(e){ set('outEcho', e.message); } };
  $('btnProof').onclick = async () => { try { set('outProof', await call('GET','/aksi/proof')); } catch(e){ set('outProof', e.message); } };
  $('btnProofStable').onclick = async () => { try { set('outProofStable', await call('POST','/aksi/proof/stable', {})); } catch(e){ set('outProofStable', e.message); } };
  $('btnLogAppend').onclick = async () => { try { const p = JSON.parse($('logPayload').value); set('outLogAppend', await call('POST','/aksi/logs/append', p)); } catch(e){ set('outLogAppend', e.message); } };
  $('btnLogs').onclick = async () => { try { set('outLogs', await call('GET','/aksi/logs')); } catch(e){ set('outLogs', e.message); } };
  $('btnLogsExport').onclick = async () => { try { set('outLogsExport', await call('GET','/aksi/logs/export', null, true)); } catch(e){ set('outLogsExport', e.message); } };
})();