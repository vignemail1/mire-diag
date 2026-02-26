/**
 * wizard.js
 * Logique du wizard de diagnostic multi-etapes.
 */
'use strict';

(function () {
  const state = {
    currentStep: 0,
    totalSteps: 6,
    service: null,
    os: null,
    client: null,
    fqdn: '',
    port: '',
    proxy: null,
    proxyDetail: '',
    errorMsg: ''
  };

  const STEP_COUNT = 6;

  function $(id) { return document.getElementById(id); }
  function setText(id, txt) { const el = $(id); if (el) el.textContent = txt; }
  function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; }

  function goStep(n) {
    if (n < 0 || n >= STEP_COUNT) return;
    if (state.currentStep === 0 && n > 0) {
      if (!state.service) { alert('Veuillez choisir un type de service.'); return; }
      if (!state.os) { alert('Veuillez choisir votre systeme.'); return; }
      if (!$('fqdn').value.trim()) { alert('Veuillez entrer l\'adresse du service.'); return; }
    }
    saveCurrentStep();
    if (n > 0) updateCommands();
    if (n === 5 && window.DiagReport) window.DiagReport.generate(state);

    const current = document.querySelector('.step.active');
    if (current) current.classList.remove('active');
    const next = $('step-' + n);
    if (next) next.classList.add('active');
    state.currentStep = n;
    updateProgressBar();
    const wizard = $('wizard');
    if (wizard) wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveCurrentStep() {
    state.fqdn = ($('fqdn') || {}).value || state.fqdn;
    state.port = ($('port') || {}).value || state.port;
    state.proxyDetail = ($('proxy-detail')|| {}).value || state.proxyDetail;
    state.errorMsg = ($('error-msg') || {}).value || state.errorMsg;
  }

  function updateProgressBar() {
    const bar = $('progress-bar');
    if (!bar) return;
    const pct = Math.round((state.currentStep / (STEP_COUNT - 1)) * 100);
    bar.style.width = pct + '%';
  }

  function restart() {
    state.currentStep = 0;
    state.service = null; state.os = null; state.client = null;
    state.fqdn = ''; state.port = ''; state.proxy = null;
    state.proxyDetail = ''; state.errorMsg = '';
    ['res-dns','res-dns6','res-ping','res-ping6','res-trace','res-trace6','res-svc','error-msg','proxy-detail'].forEach(id => {
      if ($(id)) $(id).value = '';
    });
    ['fqdn','port'].forEach(id => { if ($(id)) $(id).value = ''; });
    document.querySelectorAll('.choice-btn.selected').forEach(b => b.classList.remove('selected'));
    goStep(0);
  }

  function updateCommands() {
    const os = state.os || 'linux';
    const service = state.service || 'ssh';
    const fqdn = state.fqdn || $('fqdn').value.trim();
    const port = state.port || $('port').value.trim();
    const DC = window.DiagCommands;
    if (!DC) return;

    const hasIPv6 = !!(window.mirageDiag && window.mirageDiag.ipv6);
    document.querySelectorAll('.ipv6-only').forEach(el => el.style.display = hasIPv6 ? '' : 'none');

    const dns = DC.getDNSCmd(os, fqdn);
    setText('cmd-dns', dns.cmd); setText('cmd-dns6', dns.cmd6); setText('hint-dns', dns.hint);

    const ping = DC.getPingCmd(os, fqdn);
    setText('cmd-ping', ping.cmd); setText('cmd-ping6', ping.cmd6); setText('hint-ping', ping.hint);

    const trace = DC.getTraceCmd(os, fqdn);
    setText('cmd-trace', trace.cmd); setText('cmd-trace6', trace.cmd6); setText('hint-trace', trace.hint);

    const svc = DC.getServiceCmd(os, service, fqdn, port);
    setText('cmd-svc', svc.cmd); setText('hint-svc', svc.hint);
    setText('test-service-intro', svc.intro || '');

    const extraBlock = $('cmd-block-extra');
    if (svc.cmdExtra) {
      setText('cmd-svc-extra', svc.cmdExtra);
      if (extraBlock) extraBlock.style.display = '';
    } else {
      if (extraBlock) extraBlock.style.display = 'none';
    }
    
    // Aide VNC
    const vncHelp = $('vnc-help');
    if (vncHelp) vncHelp.style.display = (service === 'vnc') ? '' : 'none';
  }

  function setupChoiceGroup(groupId, stateKey, onSelect) {
    const group = $(groupId);
    if (!group) return;
    group.addEventListener('click', function (e) {
      const btn = e.target.closest('.choice-btn');
      if (!btn) return;
      group.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state[stateKey] = btn.dataset.value;
      if (onSelect) onSelect(btn.dataset.value);
    });
  }

  function updateClientGroup() {
    const service = state.service; const os = state.os;
    const group = $('grp-client'); const container = $('client-group');
    if (!service || !os || !group) return;
    const DC = window.DiagCommands; if (!DC) return;
    const clients = DC.getClients(service, os);
    if (!clients || clients.length === 0) {
      if (container) container.style.display = 'none'; return;
    }
    const labels = { ssh: 'Client SSH utilise :', vnc: 'Client VNC utilise :', web: 'Navigateur utilise :' };
    setText('client-label', labels[service] || 'Client utilise :');
    group.innerHTML = clients.map(c => '<button class="choice-btn" data-value="' + c.value + '">' + c.label + '</button>').join('');
    if (container) container.style.display = '';
    setupChoiceGroup('grp-client', 'client', null);
  }

  window.copyCmd = function (codeId, copiedId) {
    const codeEl = $(codeId); if (!codeEl) return;
    const text = codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => showCopied($(copiedId)));
  };

  function showCopied(el) {
    if (!el) return; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  function init() {
    setupChoiceGroup('grp-service', 'service', () => { updateClientGroup(); });
    setupChoiceGroup('grp-os', 'os', () => { updateClientGroup(); });
    setupChoiceGroup('grp-proxy', 'proxy', null);
    const btnCopy = $('btn-copy-report');
    if (btnCopy) btnCopy.addEventListener('click', () => {
      const ta = $('report-output');
      navigator.clipboard.writeText(ta.value).then(() => showCopied($('copied-report')));
    });
    updateProgressBar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.wizard = { goStep, restart, getState: () => state };
})();
