/**
 * commands.js
 * Dictionnaire de toutes les commandes de diagnostic par OS et par service.
 * Utilise par wizard.js pour afficher les commandes adaptees a l'utilisateur.
 */
'use strict';

/**
 * Retourne les clients disponibles selon le service et l'OS choisis.
 * @param {string} service - 'ssh' | 'vnc' | 'web'
 * @param {string} os - 'windows' | 'macos' | 'linux'
 * @returns {Array<{value:string, label:string}>}
 */
function getClients(service, os) {
  const clients = {
    ssh: {
      windows: [
        { value: 'openssh', label: 'OpenSSH (PowerShell/CMD)' },
        { value: 'wsl', label: 'SSH via WSL' },
        { value: 'mobaxterm', label: 'MobaXterm' }
      ],
      macos: [
        { value: 'openssh', label: 'SSH (Terminal)' }
      ],
      linux: [
        { value: 'openssh', label: 'SSH (Terminal)' }
      ]
    },
    vnc: {
      windows: [
        { value: 'turbovnc', label: 'TurboVNC' },
        { value: 'tigervnc', label: 'TigerVNC / autre client VNC' }
      ],
      macos: [
        { value: 'turbovnc', label: 'TurboVNC' },
        { value: 'tigervnc', label: 'TigerVNC / autre client VNC' }
      ],
      linux: [
        { value: 'turbovnc', label: 'TurboVNC' },
        { value: 'tigervnc', label: 'TigerVNC / autre client VNC' }
      ]
    },
    web: {
      windows: [
        { value: 'chrome', label: 'Google Chrome' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'edge', label: 'Microsoft Edge' },
        { value: 'other', label: 'Autre navigateur' }
      ],
      macos: [
        { value: 'chrome', label: 'Google Chrome' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'safari', label: 'Safari' },
        { value: 'other', label: 'Autre navigateur' }
      ],
      linux: [
        { value: 'chrome', label: 'Google Chrome / Chromium' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'other', label: 'Autre navigateur' }
      ]
    }
  };
  return (clients[service] && clients[service][os]) || [];
}

/**
 * Retourne les commandes DNS selon l'OS.
 * @param {string} os 
 * @param {string} fqdn 
 * @returns {{ cmd: string, cmd6: string, hint: string }}
 */
function getDNSCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd: 'nslookup ' + target,
        cmd6: 'nslookup -type=AAAA ' + target,
        hint: 'Dans PowerShell ou l\'invite de commandes (cmd.exe). Notez l\'adresse IP obtenue.'
      };
    case 'macos':
    case 'linux':
    default:
      return {
        cmd: 'dig +short ' + target,
        cmd6: 'dig +short AAAA ' + target,
        hint: 'Dans un terminal. Si dig n\'est pas disponible, utilisez : host ' + target
      };
  }
}

/**
 * Retourne la commande ping selon l'OS.
 * @param {string} os 
 * @param {string} fqdn 
 * @returns {{ cmd: string, cmd6: string, hint: string }}
 */
function getPingCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd: 'ping -n 5 ' + target,
        cmd6: 'ping -6 -n 5 ' + target,
        hint: 'Si vous obtenez "Delai d\'attente depasse", le serveur est injoignable ou bloque le ping.'
      };
    case 'macos':
    case 'linux':
    default:
      return {
        cmd: 'ping -c 5 ' + target,
        cmd6: 'ping6 -c 5 ' + target,
        hint: 'Notez les temps de reponse (ms) et si des paquets sont perdus.'
      };
  }
}

/**
 * Retourne la commande traceroute selon l'OS.
 * @param {string} os 
 * @param {string} fqdn 
 * @returns {{ cmd: string, cmd6: string, hint: string }}
 */
function getTraceCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd: 'tracert ' + target,
        cmd6: 'tracert -6 ' + target,
        hint: 'Cela peut prendre 1 a 2 minutes. Notez a quel saut les "*" apparaissent.'
      };
    case 'macos':
      return {
        cmd: 'traceroute ' + target,
        cmd6: 'traceroute -6 ' + target,
        hint: 'Si mtr est installe, preferez : mtr -rw --report-cycles 5 ' + target
      };
    case 'linux':
    default:
      return {
        cmd: 'traceroute ' + target,
        cmd6: 'traceroute6 ' + target,
        hint: 'mtr est preferable car il combine ping et traceroute.'
      };
  }
}

/**
 * Retourne la commande de test de port/service selon l'OS et le service.
 */
function getServiceCmd(os, service, fqdn, port) {
  const target = fqdn || 'NOM_DU_SERVICE';
  const defaultPorts = { ssh: '22', vnc: '5901', web: '443' };
  const p = port || defaultPorts[service] || '80';

  if (service === 'ssh') {
    const intro = 'Nous allons tester la connexion TCP au port SSH, puis tenter une connexion SSH verbose.';
    switch (os) {
      case 'windows':
        return {
          intro,
          cmd: 'Test-NetConnection -ComputerName ' + target + ' -Port ' + p,
          cmdExtra: 'ssh -vv -p ' + p + ' utilisateur@' + target,
          hint: 'Test-NetConnection est disponible dans PowerShell. Si "TcpTestSucceeded : False", le port est bloque.'
        };
      default:
        return {
          intro,
          cmd: 'nc -zv ' + target + ' ' + p,
          cmdExtra: 'ssh -vv -p ' + p + ' utilisateur@' + target,
          hint: 'Si nc retourne "Connection refused" : le service n\'ecoute pas.'
        };
    }
  }

  if (service === 'vnc') {
    const intro = 'VNC utilise le format hostname:X (X=session). Le port est 5900 + X (ex: session :1 = port 5901).';
    switch (os) {
      case 'windows':
        return {
          intro,
          cmd: 'Test-NetConnection -ComputerName ' + target + ' -Port ' + p,
          hint: 'Si vous avez hostname:1, remplissez Port: 5901. Si TcpTestSucceeded est False, verifiez le port.'
        };
      default:
        return {
          intro,
          cmd: 'nc -zv ' + target + ' ' + p,
          hint: 'Pour tester avec OpenSSL si TLS : openssl s_client -connect ' + target + ':' + p + ' -brief'
        };
    }
  }

  if (service === 'web') {
    const intro = 'Nous allons tester la connexion HTTP/HTTPS et verifier le certificat si applicable.';
    const httpPort = p === '443' ? 'https://' : 'http://';
    const curlCmd = 'curl -v --max-time 10 ' + httpPort + target + '/';
    
    let cmdExtra = null;
    if (p === '443') {
      if (os === 'windows') {
        cmdExtra = 'openssl s_client -connect ' + target + ':443 -servername ' + target + ' < nul 2>&1 | findstr /C:"subject=" /C:"notBefore" /C:"notAfter" /C:"DNS:"';
      } else {
        cmdExtra = 'echo | openssl s_client -connect ' + target + ':443 -servername ' + target + ' 2>/dev/null | openssl x509 -noout -subject -dates -ext subjectAltName';
      }
    }

    return {
      intro,
      cmd: curlCmd,
      cmdExtra: cmdExtra,
      hint: p === '443' ? 'La commande extra permet d\'afficher les infos du certificat (CN, SAN, dates).' : 'Notez le code HTTP retourne (200=OK, 403, 504...).'
    };
  }

  return {
    intro: 'Test de connectivite TCP.',
    cmd: (os === 'windows') ? 'Test-NetConnection -ComputerName ' + target + ' -Port ' + p : 'nc -zv ' + target + ' ' + p,
    hint: 'Verification du port ' + p
  };
}

// Exposition globale
window.DiagCommands = { getClients, getDNSCmd, getPingCmd, getTraceCmd, getServiceCmd };
