/**
 * commands.js
 * Dictionnaire de toutes les commandes de diagnostic par OS et par service.
 * Utilisé par wizard.js pour afficher les commandes adaptées à l'utilisateur.
 */
'use strict';

/**
 * Retourne les clients disponibles selon le service et l'OS choisis.
 * @param {string} service - 'ssh' | 'vnc' | 'web' | 'web-https'
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
            windows: [{ value: 'browser', label: 'Navigateur Web' }],
            macos: [{ value: 'browser', label: 'Navigateur Web' }],
            linux: [{ value: 'browser', label: 'Navigateur Web' }]
        },
        'web-https': {
            windows: [{ value: 'browser', label: 'Navigateur Web' }],
            macos: [{ value: 'browser', label: 'Navigateur Web' }],
            linux: [{ value: 'browser', label: 'Navigateur Web' }]
        }
    };

    return clients[service]?.[os] || [];
}

/**
 * Retourne la commande de résolution DNS.
 */
function getDNSCmd(fqdn, os, type) {
    if (type === 'AAAA') {
        return 'nslookup -type=AAAA ' + fqdn;
    }
    return 'nslookup ' + fqdn;
}

/**
 * Retourne la commande de ping.
 */
function getPingCmd(fqdn, os, ipv6) {
    if (ipv6) {
        if (os === 'windows') return 'ping -6 ' + fqdn;
        return 'ping -6 -c 4 ' + fqdn;
    }
    if (os === 'windows') return 'ping ' + fqdn;
    return 'ping -c 4 ' + fqdn;
}

/**
 * Retourne la commande de traceroute.
 */
function getTraceCmd(fqdn, os, ipv6) {
    if (ipv6) {
        if (os === 'windows') return 'tracert -6 ' + fqdn;
        if (os === 'macos') return 'traceroute -6 ' + fqdn;
        return 'mtr -6 -rw -z -b ' + fqdn;
    }
    if (os === 'windows') return 'tracert ' + fqdn;
    if (os === 'macos') return 'traceroute ' + fqdn;
    return 'mtr -rw -z -b ' + fqdn;
}

/**
 * Retourne les commandes de test de service.
 * @returns {{ main: string, extra: string|null }}
 */
function getServiceCmd(fqdn, port, service, os, client) {
    const p = port || (service === 'ssh' ? '22' : (service === 'vnc' ? '5901' : (service === 'web-https' ? '443' : '80')));

    const commands = {
        main: 'nc -zv ' + fqdn + ' ' + p,
        extra: null
    };

    if (service === 'ssh' && client === 'openssh') {
        commands.extra = 'ssh -vvv ' + fqdn + (port ? ' -p ' + port : '');
    } else if (service === 'web-https') {
        commands.extra = 'openssl s_client -connect ' + fqdn + ':' + p + ' -servername ' + fqdn + ' </dev/null 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:|Not After|Not Before"';
    }

    return commands;
}
