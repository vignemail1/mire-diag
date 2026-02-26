/**
 * wizard.js
 * Logique du wizard de diagnostic multi-étapes.
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

    /**
     * Change d'étape dans le wizard.
     */
    window.wizard = {
        goStep: function (n) {
            if (n < 0 || n >= STEP_COUNT) return;

            // Validation simple étape 1
            if (state.currentStep === 0 && n > 0) {
                if (!state.service) { alert('Veuillez choisir un type de service.'); return; }
                if (!state.os) { alert('Veuillez choisir votre système.'); return; }
                if (!$('fqdn').value.trim()) { alert('Veuillez entrer l\'adresse du service.'); return; }
            }

            // Mise à jour de l'état avant de changer
            this.saveCurrentStep();

            // Masquer étape actuelle, afficher nouvelle
            $(`step-${state.currentStep}`).classList.remove('active');
            $(`step-${n}`).classList.add('active');
            state.currentStep = n;

            // Barre de progression
            $('progress-bar').style.width = `${(n / (STEP_COUNT - 1)) * 100}%`;

            // Actions spécifiques
            if (n > 0) this.updateCommands();
            if (n === 5) window.generateReport();

            // Scroll top
            window.scrollTo(0, 0);
        },

        saveCurrentStep: function () {
            if (state.currentStep === 0) {
                state.fqdn = $('fqdn').value.trim();
                state.port = $('port').value.trim();
                state.proxyDetail = $('proxy-detail').value.trim();
                state.errorMsg = $('error-msg').value.trim();
            }
        },

        updateCommands: function () {
            const f = state.fqdn;
            const os = state.os;
            const s = state.service;
            const c = state.client;
            const p = state.port;

            // DNS
            setText('cmd-dns', getDNSCmd(f, os, 'A'));
            setText('cmd-dns6', getDNSCmd(f, os, 'AAAA'));

            // Ping
            setText('cmd-ping', getPingCmd(f, os, false));
            setText('cmd-ping6', getPingCmd(f, os, true));

            // Trace
            setText('cmd-trace', getTraceCmd(f, os, false));
            setText('cmd-trace6', getTraceCmd(f, os, true));

            // Service
            const svc = getServiceCmd(f, p, s, os, c);
            setText('cmd-svc', svc.main);
            
            if (svc.extra) {
                setText('cmd-svc-extra', svc.extra);
                $('extra-test-block').style.display = 'block';
                $('res-svc-extra').style.display = 'block';
            } else {
                $('extra-test-block').style.display = 'none';
                $('res-svc-extra').style.display = 'none';
            }

            // IPv6 display logic
            const hasIPv6 = document.getElementById('ipv6-val').textContent.includes(':');
            const ipv6Elements = document.querySelectorAll('.ipv6-only');
            ipv6Elements.forEach(el => {
                el.style.display = hasIPv6 ? 'block' : 'none';
            });
        },

        restart: function () {
            if (!confirm('Recommencer le diagnostic ? Toutes les données saisies seront perdues.')) return;
            location.reload();
        }
    };

    /**
     * Gestion des clics sur les boutons de choix.
     */
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('choice-btn')) {
            const group = e.target.parentElement.id;
            const val = e.target.getAttribute('data-value');

            // Sélection visuelle
            e.target.parentElement.querySelectorAll('.choice-btn').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');

            // Mise à jour état
            if (group === 'grp-service') {
                state.service = val;
                this.updateClientChoices();
                // Aide VNC
                $('vnc-help').style.display = val === 'vnc' ? 'block' : 'none';
            } else if (group === 'grp-os') {
                state.os = val;
                this.updateClientChoices();
            } else if (group === 'grp-client') {
                state.client = val;
            } else if (group === 'grp-proxy') {
                state.proxy = val;
            }
        }
    }.bind(window.wizard));

    /**
     * Met à jour les boutons de choix du client.
     */
    window.wizard.updateClientChoices = function () {
        if (!state.service || !state.os) return;

        const clients = getClients(state.service, state.os);
        const container = $('grp-client');
        container.innerHTML = '';

        if (clients.length > 0) {
            $('client-group').style.display = 'block';
            clients.forEach((c, idx) => {
                const btn = document.createElement('button');
                btn.className = 'choice-btn' + (idx === 0 ? ' selected' : '');
                btn.setAttribute('data-value', c.value);
                btn.textContent = c.label;
                container.appendChild(btn);
                if (idx === 0) state.client = c.value;
            });
        } else {
            $('client-group').style.display = 'none';
            state.client = null;
        }
    };

    /**
     * Fonction globale de copie.
     */
    window.copyCmd = function (codeId, feedbackId) {
        const text = $(codeId).textContent;
        const dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);

        const feedback = $(feedbackId);
        feedback.classList.add('show');
        setTimeout(() => feedback.classList.remove('show'), 2000);
    };

})();
