/**
 * ip-detect.js
 * Detecte les adresses IPv4 et IPv6 publiques de l'utilisateur
 * et les affiche dans le bandeau en haut de page.
 * Tout se passe cote client - aucune donnee n'est collectee.
 */

(function () {
  'use strict';

  // --- Configuration des endpoints ---
  // Plusieurs sources par version IP pour maximiser la disponibilite.
  // Les sous-domaines api4./api6. ou ipv4./ipv6. forcent la version IP cote DNS.
  const ENDPOINTS = {
    v4: [
      'https://api4.ipify.org?format=json',
      'https://ipv4.jsonip.com',
      'https://ipv4.icanhazip.com',
      'https://ipv4.ident.me',
      'https://api4.my-ip.io/ip.json'
    ],
    v6: [
      'https://api6.ipify.org?format=json',
      'https://ipv6.jsonip.com',
      'https://ipv6.icanhazip.com',
      'https://ipv6.ident.me',
      'https://api6.my-ip.io/ip.json'
    ]
  };

  // Timeout par requete (ms)
  const TIMEOUT_MS = 3000;
  // Delai avant retry global (ms)
  const RETRY_DELAY_MS = 2000;
  // Nombre de tentatives globales
  const MAX_RETRIES = 2;

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
   * Valide qu'une chaine ressemble a une adresse IP (v4 ou v6).
   * Rejette les valeurs comme "undefined", chaînes vides, etc.
   * @param {string} str
   * @returns {boolean}
   */
  function isValidIP(str) {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    if (s.length === 0 || s === 'undefined' || s === 'null') return false;
    // IPv4 basique : 4 groupes de chiffres separes par des points
    const ipv4Re = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 : contient au moins deux points ou un double-colon
    const ipv6Re = /^[0-9a-fA-F:]{2,39}$|^::1$/;
    return ipv4Re.test(s) || s.includes(':');
  }

  /**
   * Extrait l'adresse IP d'une reponse JSON ou texte.
   * Supporte les formats : {"ip":"x.x.x.x"}, {"IPv4":"x"}, {"IPv6":"x"}
   * ou texte brut "x.x.x.x". Rejette les valeurs invalides.
   * @param {string} raw
   * @returns {string|null}
   */
  function parseIP(raw) {
    if (!raw) return null;
    const text = raw.trim();
    try {
      const obj = JSON.parse(text);
      // Cherche les champs communs dans l'ordre de preference
      const candidate = obj.ip || obj.IPv4 || obj.IPv6 || obj.ipAddress || null;
      if (candidate && isValidIP(String(candidate))) return String(candidate).trim();
      return null;
    } catch (_) {
      // Reponse en texte brut (ex: icanhazip, ident.me)
      return isValidIP(text) ? text : null;
    }
  }

  /**
   * Essaie plusieurs endpoints en serie et retourne le premier IP valide.
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
        // endpoint indisponible ou timeout, on essaie le suivant
      }
    }
    return null;
  }

  /**
   * Detecte l'IP avec des tentatives automatiques en cas d'echec global.
   * @param {string[]} urls
   * @param {number} retries
   * @returns {Promise<string|null>}
   */
  async function detectWithRetry(urls, retries) {
    for (let attempt = 0; attempt < retries; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
      const ip = await detectFromEndpoints(urls);
      if (ip) return ip;
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

    // Detection en parallele avec retry
    const [ipv4, ipv6] = await Promise.all([
      detectWithRetry(ENDPOINTS.v4, MAX_RETRIES),
      detectWithRetry(ENDPOINTS.v6, MAX_RETRIES)
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
