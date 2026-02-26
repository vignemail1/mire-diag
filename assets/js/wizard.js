/**
 * wizard.js
 * Logique du wizard de diagnostic multi-etapes.
 * Gere la navigation, la mise a jour dynamique des commandes,
 * et la memorisation des reponses de l'utilisateur.
 */

'use strict';

(function () {

  // --- Etat global du wizard ---
  const state = {
    currentStep: 0,
    totalSteps:  6,
    service:  null,
    os:       null,
    client:   null,
    fqdn:     '',
    port:     '',
    proxy:    null,
    proxyDetail: '',
    errorMsg: ''
  };

  const STEP_COUNT = 6;

  // --- Utilitaires DOM ---

  function $(id) { return document.getElementById(id); }

  function setText(id, txt) {
    const el = $(id);
    if (el) el.textContent = txt;
  }

  function setHTML(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  // --- Navigation entre etapes ---

  function goStep(n) {
    if (n < 0 || n >= STEP_COUNT) return;

    // Valider l'etape 0 avant de continuer
    if (state.currentStep === 0 && n > 0) {
      if (!state.service) { alert('Veuillez choisir un type de service.'); return; }
      if (!state.os)      { alert('Veuillez choisir votre systeme.'); return; }
      if (!$('fqdn').value.trim()) { alert('Veuillez entrer l\'adresse du service.'); return; }
    }

    // Sauvegarder les champs de l'etape courante
    saveCurrentStep();

    // Mettre a jour les commandes si on avance
    if (n > 0) updateCommands();

    // Generer le rapport si on arrive a l'etape finale
    if (n === 5) {
      if (window.DiagReport) window.DiagReport.generate(state);
    }

    // Transition
    const current = document.querySelector('.step.active');
    if (current) current.classList.remove('active');

    const next = $('step-' + n);
    if (next) next.classList.add('active');

    state.currentStep = n;
    updateProgressBar();

    // Scroll vers le haut du wizard
    const wizard = $('wizard');
    if (wizard) wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveCurrentStep() {
    state.fqdn        = ($('fqdn')        || {}).value || state.fqdn;
    state.port        = ($('port')        || {}).value || state.port;
    state.proxyDetail = ($('proxy-detail')|| {}).value || state.proxyDetail;
    state.errorMsg    = ($('error-msg')   || {}).value || state.errorMsg;
  }

  function updateProgressBar() {
    const bar = $('progress-bar');
    if (!bar) return;
    const pct = Math.round((state.currentStep / (STEP_COUNT - 1)) * 100);
    bar.style.width = pct + '%';
  }

  function restart() {
    // Remise a zero de l'etat
    state.currentStep = 0;
    state.service = null;
    state.os      = null;
    state.client  = null;
    state.fqdn    = '';
    state.port    = '';
    state.proxy   = null;
    state.proxyDetail = '';
    state.errorMsg    = '';

    // Vider les textareas de resultats
    ['res-dns','res-ping','res-trace','res-svc','error-msg','proxy-detail'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    ['fqdn','port'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });

    // Deselectionner les boutons choix
    document.querySelectorAll('.choice-btn.selected')
            .forEach(b => b.classList.remove('selected'));

    goStep(0);
  }

  // --- Mise a jour dynamique des commandes ---

  function updateCommands() {
    const os      = state.os      || 'linux';
    const service = state.service || 'ssh';
    const fqdn    = state.fqdn    || $('fqdn').value.trim();
    const port    = state.port    || $('port').value.trim();

    const DC = window.DiagCommands;
    if (!DC) return;

    // DNS
    const dns = DC.getDNSCmd(os, fqdn);
    setText('cmd-dns', dns.cmd);
    setText('hint-dns', dns.hint);

    // Ping
    const ping = DC.getPingCmd(os, fqdn);
    setText('cmd-ping', ping.cmd);
    setText('hint-ping', ping.hint);

    // Traceroute
    const trace = DC.getTraceCmd(os, fqdn);
    setText('cmd-trace', trace.cmd);
    setText('hint-trace', trace.hint);

    // Test de service
    const svc = DC.getServiceCmd(os, service, fqdn, port);
    setText('cmd-svc', svc.cmd);
    setText('hint-svc', svc.hint);
    setText('test-service-intro', svc.intro || '');

    const extraBlock = $('cmd-block-extra');
    if (svc.cmdExtra) {
      setText('cmd-svc-extra', svc.cmdExtra);
      if (extraBlock) extraBlock.style.display = '';
    } else {
      if (extraBlock) extraBlock.style.display = 'none';
    }
  }

  // --- Gestion des boutons de choix ---

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
    const service = state.service;
    const os      = state.os;
    const group   = $('grp-client');
    const container = $('client-group');

    if (!service || !os || !group) return;

    const DC = window.DiagCommands;
    if (!DC) return;

    const clients = DC.getClients(service, os);
    if (!clients || clients.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    // Labels par service
    const labels = {
      ssh: 'Client SSH utilise :',
      vnc: 'Client VNC utilise :',
      web: 'Navigateur utilise :'
    };
    setText('client-label', labels[service] || 'Client utilise :');

    group.innerHTML = clients.map(c =>
      '<button class="choice-btn" data-value="' + c.value + '">' + c.label + '</button>'
    ).join('');

    if (container) container.style.display = '';

    // Reattacher les listeners
    setupChoiceGroup('grp-client', 'client', null);
  }

  // --- Fonction globale copyCmd (pour les boutons HTML inline) ---

  window.copyCmd = function (codeId, copiedId) {
    const codeEl   = $(codeId);
    const copiedEl = $(copiedId);
    if (!codeEl) return;
    const text = codeEl.textContent;
    navigator.clipboard.writeText(text).then(function () {
      showCopied(copiedEl);
    }).catch(function () {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopied(copiedEl);
    });
  };

  function showCopied(el) {
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }

  // --- Bouton copier le rapport ---

  function setupCopyReport() {
    const btn = $('btn-copy-report');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const ta = $('report-output');
      if (!ta) return;
      navigator.clipboard.writeText(ta.value).then(function () {
        showCopied($('copied-report'));
      }).catch(function () {
        ta.select();
        document.execCommand('copy');
        showCopied($('copied-report'));
      });
    });
  }

  // --- Initialisation ---

  function init() {
    // Groupes de choix principaux
    setupChoiceGroup('grp-service', 'service', function () {
      updateClientGroup();
    });
    setupChoiceGroup('grp-os', 'os', function () {
      updateClientGroup();
    });
    setupChoiceGroup('grp-proxy', 'proxy', null);

    setupCopyReport();
    updateProgressBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposition globale pour les boutons onclick HTML
  window.wizard = {
    goStep,
    restart,
    getState: () => state
  };

})();
