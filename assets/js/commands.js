/**
 * commands.js
 * Dictionnaire de toutes les commandes de diagnostic par OS et par service.
 * Utilise par wizard.js pour afficher les commandes adaptees a l'utilisateur.
 */

'use strict';

/**
 * Retourne les clients disponibles selon le service et l'OS choisis.
 * @param {string} service - 'ssh' | 'vnc' | 'web'
 * @param {string} os      - 'windows' | 'macos' | 'linux'
 * @returns {Array<{value:string, label:string}>}
 */
function getClients(service, os) {
  const clients = {
    ssh: {
      windows: [
        { value: 'openssh',   label: 'OpenSSH (PowerShell/CMD)' },
        { value: 'wsl',       label: 'SSH via WSL' },
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
        { value: 'chrome',  label: 'Google Chrome' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'edge',    label: 'Microsoft Edge' },
        { value: 'other',   label: 'Autre navigateur' }
      ],
      macos: [
        { value: 'chrome',  label: 'Google Chrome' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'safari',  label: 'Safari' },
        { value: 'other',   label: 'Autre navigateur' }
      ],
      linux: [
        { value: 'chrome',  label: 'Google Chrome / Chromium' },
        { value: 'firefox', label: 'Mozilla Firefox' },
        { value: 'other',   label: 'Autre navigateur' }
      ]
    }
  };
  return (clients[service] && clients[service][os]) || [];
}

/**
 * Retourne les commandes DNS selon l'OS.
 * @param {string} os
 * @param {string} fqdn
 * @returns {{ cmd: string, hint: string }}
 */
function getDNSCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd:  'nslookup ' + target,
        hint: 'Dans PowerShell ou l\'invite de commandes (cmd.exe). Note l\'adresse IP obtenue.'
      };
    case 'macos':
    case 'linux':
    default:
      return {
        cmd:  'dig +short ' + target + ' && dig +short AAAA ' + target,
        hint: 'Dans un terminal. Si dig n\'est pas disponible, utilisez : host ' + target
      };
  }
}

/**
 * Retourne la commande ping selon l'OS.
 * @param {string} os
 * @param {string} fqdn
 * @returns {{ cmd: string, hint: string }}
 */
function getPingCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd:  'ping -n 5 ' + target,
        hint: 'Si vous obtenez "Delai d\'attente depasse" sur toutes les lignes, le serveur est injoignable ou bloque le ping. Notez les temps de reponse.'
      };
    case 'macos':
    case 'linux':
    default:
      return {
        cmd:  'ping -c 5 ' + target,
        hint: 'Notez les temps de reponse (ms) et si des paquets sont perdus (packet loss). Un taux > 0% est anormal.'
      };
  }
}

/**
 * Retourne la commande traceroute selon l'OS.
 * @param {string} os
 * @param {string} fqdn
 * @returns {{ cmd: string, hint: string }}
 */
function getTraceCmd(os, fqdn) {
  const target = fqdn || 'NOM_DU_SERVICE';
  switch (os) {
    case 'windows':
      return {
        cmd:  'tracert ' + target,
        hint: 'Cela peut prendre 1 a 2 minutes. Notez a quel saut les "*" apparaissent - cela indique ou la connexion est bloquee.'
      };
    case 'macos':
      return {
        cmd:  'traceroute ' + target,
        hint: 'Si mtr est installe (via Homebrew), preferez : mtr -rw --report-cycles 5 ' + target
      };
    case 'linux':
    default:
      return {
        cmd:  'traceroute ' + target + ' || mtr -rw --report-cycles 5 ' + target,
        hint: 'mtr est preferable car il combine ping et traceroute. Installez-le si necessaire : sudo apt install mtr / sudo dnf install mtr'
      };
  }
}

/**
 * Retourne la commande de test de port/service selon l'OS et le service.
 * @param {string} os
 * @param {string} service
 * @param {string} fqdn
 * @param {string} port
 * @returns {{ cmd: string, cmdExtra: string|null, hint: string, intro: string }}
 */
function getServiceCmd(os, service, fqdn, port) {
  const target = fqdn || 'NOM_DU_SERVICE';

  // Ports par defaut
  const defaultPorts = { ssh: '22', vnc: '5901', web: '443' };
  const p = port || defaultPorts[service] || '80';

  if (service === 'ssh') {
    const intro = 'Nous allons tester la connexion TCP au port SSH, puis tenter une connexion SSH verbose pour obtenir le maximum d\'informations.';
    switch (os) {
      case 'windows':
        return {
          intro,
          cmd:      'Test-NetConnection -ComputerName ' + target + ' -Port ' + p,
          cmdExtra: 'ssh -vv -p ' + p + ' utilisateur@' + target,
          hint:     'Test-NetConnection est disponible dans PowerShell. Si "TcpTestSucceeded : False", le port est bloque. Pour ssh -vv, remplacez "utilisateur" par votre identifiant.'
        };
      case 'macos':
      case 'linux':
      default:
        return {
          intro,
          cmd:      'nc -zv ' + target + ' ' + p,
          cmdExtra: 'ssh -vv -p ' + p + ' utilisateur@' + target,
          hint:     'Si nc retourne "Connection refused" : le service n\'ecoute pas ou un pare-feu bloque. "Connection timed out" indique un filtrage reseau. Remplacez "utilisateur" par votre identifiant.'
        };
    }
  }

  if (service === 'vnc') {
    const intro = 'VNC utilise generalement le port 5900+N (ex: 5901 pour le display :1). Nous testons la connectivite TCP.';
    switch (os) {
      case 'windows':
        return {
          intro,
          cmd:      'Test-NetConnection -ComputerName ' + target + ' -Port ' + p,
          cmdExtra: null,
          hint:     'Sous PowerShell. Si "TcpTestSucceeded : True", le port est joignable. Si False, le pare-feu ou le service VNC bloque la connexion. Le port par defaut TurboVNC est 5901 (display :1).'
        };
      case 'macos':
      case 'linux':
      default:
        return {
          intro,
          cmd:      'nc -zv ' + target + ' ' + p,
          cmdExtra: null,
          hint:     'Si vous utilisez TurboVNC over TLS, le port habituel est 5901 ou 5800. Testez aussi : openssl s_client -connect ' + target + ':' + p + ' -brief'
        };
    }
  }

  if (service === 'web') {
    const intro = 'Nous allons tester la connexion HTTP/HTTPS avec curl pour obtenir des details sur la reponse du serveur.';
    const httpPort = p === '443' ? 'https://' : 'http://';
    switch (os) {
      case 'windows':
        return {
          intro,
          cmd:      'curl -v --max-time 10 ' + httpPort + target + '/',
          cmdExtra: null,
          hint:     'curl est disponible nativement sur Windows 10/11. Notez le code HTTP retourne (200=OK, 302=redirection, 403=interdit, 504=timeout serveur, etc.) et les eventuels messages d\'erreur TLS.'
        };
      case 'macos':
      case 'linux':
      default:
        return {
          intro,
          cmd:      'curl -v --max-time 10 ' + httpPort + target + '/',
          cmdExtra: null,
          hint:     'Notez le code HTTP et les details TLS. Si vous utilisez un proxy, ajoutez : -x http://PROXY:PORT. Pour tester sans verif TLS (diagnostic seulement) : curl -vk ' + httpPort + target + '/'
        };
    }
  }

  // Fallback generique
  return {
    intro: 'Test de connectivite TCP au service.',
    cmd:   (os === 'windows')
             ? 'Test-NetConnection -ComputerName ' + target + ' -Port ' + p
             : 'nc -zv ' + target + ' ' + p,
    cmdExtra: null,
    hint: 'Verificaion que le port ' + p + ' est accessible.'
  };
}

// Exposition globale
window.DiagCommands = {
  getClients,
  getDNSCmd,
  getPingCmd,
  getTraceCmd,
  getServiceCmd
};
