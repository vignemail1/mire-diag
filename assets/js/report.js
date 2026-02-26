/**
 * report.js
 * Genere le texte du rapport de diagnostic a partir de l'etat du wizard.
 * Le rapport est affiche dans le textarea #report-output a l'etape finale.
 */

'use strict';

(function () {

  /**
   * Formatte une section du rapport.
   * @param {string} title
   * @param {string} content
   * @returns {string}
   */
  function section(title, content) {
    const sep = '='.repeat(60);
    const val = (content && content.trim()) ? content.trim() : '(non renseigne)';
    return sep + '\n' + title + '\n' + sep + '\n' + val + '\n';
  }

  /**
   * Recupere la valeur d'un textarea ou input par son id.
   * @param {string} id
   * @returns {string}
   */
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /**
   * Mappe les valeurs internes vers des labels lisibles.
   */
  const SERVICE_LABELS = { ssh: 'SSH', vnc: 'VNC', web: 'Site web' };
  const OS_LABELS      = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };
  const PROXY_LABELS   = { non: 'Non', vpn: 'VPN', proxy: 'Proxy', 'les deux': 'VPN + Proxy' };

  const CLIENT_LABELS = {
    openssh:   'OpenSSH',
    wsl:       'SSH via WSL (Windows Subsystem for Linux)',
    mobaxterm: 'MobaXterm',
    turbovnc:  'TurboVNC',
    tigervnc:  'TigerVNC / autre client VNC compatible',
    chrome:    'Google Chrome',
    firefox:   'Mozilla Firefox',
    edge:      'Microsoft Edge',
    safari:    'Safari',
    other:     'Autre'
  };

  /**
   * Genere le rapport complet et le place dans #report-output.
   * @param {Object} state - etat du wizard (voir wizard.js)
   */
  function generate(state) {
    const ipv4 = (window.mirageDiag && window.mirageDiag.ipv4) || 'Non detectee';
    const ipv6 = (window.mirageDiag && window.mirageDiag.ipv6) || 'Non disponible';

    const service     = SERVICE_LABELS[state.service] || state.service || 'Non specifie';
    const os          = OS_LABELS[state.os]            || state.os      || 'Non specifie';
    const client      = CLIENT_LABELS[state.client]    || state.client  || 'Non specifie';
    const fqdn        = state.fqdn        || val('fqdn')         || 'Non specifie';
    const port        = state.port        || val('port')         || 'Par defaut';
    const proxy       = PROXY_LABELS[state.proxy]      || state.proxy   || 'Non specifie';
    const proxyDetail = state.proxyDetail || val('proxy-detail') || '';
    const errorMsg    = state.errorMsg    || val('error-msg')    || '';

    // Resultats des tests
    const resDns   = val('res-dns');
    const resPing  = val('res-ping');
    const resTrace = val('res-trace');
    const resSvc   = val('res-svc');

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // --- Construction du rapport ---
    let lines = [];

    lines.push('RAPPORT DE DIAGNOSTIC DE CONNEXION');
    lines.push('Genere le : ' + dateStr);
    lines.push('');

    // 1. Informations generales
    lines.push(section(
      '1. INFORMATIONS GENERALES',
      [
        'Type de connexion : ' + service,
        'Systeme d\'exploitation : ' + os,
        'Client utilise : ' + client,
        'Adresse du service : ' + fqdn,
        'Port : ' + port,
        'VPN / Proxy : ' + proxy + (proxyDetail ? ' (' + proxyDetail + ')' : '')
      ].join('\n')
    ));

    // 2. Adresses IP
    lines.push(section(
      '2. ADRESSES IP DE L\'UTILISATEUR',
      [
        'IPv4 publique : ' + ipv4,
        'IPv6 publique : ' + ipv6
      ].join('\n')
    ));

    // 3. Message d'erreur
    lines.push(section(
      '3. MESSAGE D\'ERREUR AFFICHE',
      errorMsg
    ));

    // 4. Resolution DNS
    lines.push(section(
      '4. RESULTAT RESOLUTION DNS',
      resDns
    ));

    // 5. Ping
    lines.push(section(
      '5. RESULTAT PING',
      resPing
    ));

    // 6. Traceroute
    lines.push(section(
      '6. RESULTAT TRACEROUTE',
      resTrace
    ));

    // 7. Test de connexion au service
    lines.push(section(
      '7. RESULTAT TEST DE CONNEXION AU SERVICE (' + service.toUpperCase() + ')',
      resSvc
    ));

    // Pied de rapport
    lines.push('');
    lines.push('--- Fin du rapport ---');
    lines.push('Note : ce rapport a ete genere automatiquement. Aucune donnee n\'a ete envoyee.');

    const reportText = lines.join('\n');

    const ta = document.getElementById('report-output');
    if (ta) {
      ta.value = reportText;
      ta.rows  = Math.max(22, reportText.split('\n').length + 2);
    }
  }

  // Exposition globale
  window.DiagReport = { generate };

})();
