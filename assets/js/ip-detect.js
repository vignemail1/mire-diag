/**
 * ip-detect.js
 * Detecte les adresses IPv4 et IPv6 publiques de l'utilisateur
 * et les affiche dans le bandeau en haut de page.
 * Tout se passe cote client - aucune donnee n'est collectee.
 */

(function () {
  'use strict';

  // --- Configuration des endpoints ---
  // On utilise deux sous-domaines distincts pour forcer IPv4 ou IPv6
  const ENDPOINTS = {
    v4: [
      'https://api4.ipify.org?format=json',
      'https://ipv4.jsonip.com'
    ],
    v6: [
      'https://api6.ipify.org?format=json',
      'https://ipv6.jsonip.com'
    ]
  };

  const TIMEOUT_MS = 4000;

  // --- Utilitaires ---

  /**
   * Effectue un fetch avec un timeout.
   * @param {string} url
   * @param {number} timeoutMs
   * @returns {Promise<string>} - le texte brut de la reponse
   */
  async function fetchWithTimeout(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Extrait l'adresse IP d'une reponse JSON ou texte.
   * Supporte les formats : {"ip":"x.x.x.x"} ou texte brut "x.x.x.x"
   */
  function parseIP(raw) {
    const text = raw.trim();
    try {
      const obj = JSON.parse(text);
      return obj.ip || obj.IPv4 || obj.IPv6 || null;
    } catch (e) {
      // format texte brut
      return text || null;
    }
  }

  /**
   * Essaie plusieurs endpoints en serie et retourne le premier qui repond.
   * @param {string[]} urls
   * @returns {Promise<string|null>}
   */
  async function detectFromEndpoints(urls) {
    for (const url of urls) {
      try {
        const raw = await fetchWithTimeout(url, TIMEOUT_MS);
        const ip = parseIP(raw);
        if (ip) return ip;
      } catch (_) {
        // essai suivant
      }
    }
    return null;
  }

  /**
   * Affiche l'IP dans le span correspondant et configure le bouton Copier.
   * @param {string} valId  - id du span de valeur
   * @param {string} copyId - id du bouton copier
   * @param {string} copiedId - id du span de confirmation
   * @param {string|null} ip
   */
  function displayIP(valId, copyId, copiedId, ip) {
    const valEl    = document.getElementById(valId);
    const copyBtn  = document.getElementById(copyId);
    const copiedEl = document.getElementById(copiedId);

    if (!valEl) return;

    valEl.classList.remove('loading');

    if (!ip) {
      valEl.textContent = 'Non disponible';
      valEl.classList.add('unavailable');
      if (copyBtn) copyBtn.disabled = true;
      return;
    }

    valEl.textContent = ip;

    // Stocker dans l'objet global pour usage dans le rapport
    if (!window.mirageDiag) window.mirageDiag = {};
    if (valId === 'ipv4-val') window.mirageDiag.ipv4 = ip;
    if (valId === 'ipv6-val') window.mirageDiag.ipv6 = ip;

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(ip).then(function () {
          if (copiedEl) {
            copiedEl.classList.add('show');
            setTimeout(() => copiedEl.classList.remove('show'), 1800);
          }
        }).catch(function () {
          // Fallback pour navigateurs sans clipboard API
          const ta = document.createElement('textarea');
          ta.value = ip;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (copiedEl) {
            copiedEl.classList.add('show');
            setTimeout(() => copiedEl.classList.remove('show'), 1800);
          }
        });
      });
    }
  }

  // --- Point d'entree ---

  async function init() {
    // Marquer les deux valeurs en chargement
    ['ipv4-val', 'ipv6-val'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('loading');
    });

    // Detection en parallele
    const [ipv4, ipv6] = await Promise.all([
      detectFromEndpoints(ENDPOINTS.v4),
      detectFromEndpoints(ENDPOINTS.v6)
    ]);

    displayIP('ipv4-val', 'copy-ipv4', 'copied-ipv4', ipv4);
    displayIP('ipv6-val', 'copy-ipv6', 'copied-ipv6', ipv6);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
