/**
 * commands.js
 * Dictionnaire de toutes les commandes de diagnostic par OS et par service.
 * Utilisé par wizard.js pour afficher les commandes adaptées à l'utilisateur.
 */
'use strict';

/**
 * Retourne les clients disponibles selon le service et l'OS choisis.
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
        },
        tcp: {
            windows: [{ value: 'generic', label: 'Client TCP générique' }],
            macos: [{ value: 'generic', label: 'Client TCP générique' }],
            linux: [{ value: 'generic', label: 'Client TCP générique' }]
        },
        udp: {
            windows: [{ value: 'generic', label: 'Client UDP générique' }],
            macos: [{ value: 'generic', label: 'Client UDP générique' }],
            linux: [{ value: 'generic', label: 'Client UDP générique' }]
        }
    };

    return clients[service]?.[os] || [];
}

/**
 * Retourne la commande de résolution DNS.
 */
function getDNSCmd(fqdn, os, type) {
    const isAAAA = (type === 'AAAA');
    const typeStr = isAAAA ? 'AAAA' : 'A';
    const typeFlag = isAAAA ? ' -type=AAAA' : '';

    if (os === 'windows') {
        return 'nslookup' + typeFlag + ' ' + fqdn;
    }

    // Pour Linux/macOS, on propose dig, host puis nslookup
    const dig = 'dig ' + (isAAAA ? 'AAAA ' : '') + fqdn;
    const host = 'host -t ' + typeStr + ' ' + fqdn;
    const nslookup = 'nslookup' + typeFlag + ' ' + fqdn;

    return dig + '\n' + host + '\n' + nslookup;
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
 * @returns {{ main: string, hint: string|null }}
 */
function getTraceCmd(fqdn, os, ipv6) {
    let main = '';
    let hint = null;

    if (ipv6) {
        if (os === 'windows') {
            main = 'tracert -6 ' + fqdn;
        } else if (os === 'macos') {
            main = 'traceroute -6 ' + fqdn;
            hint = 'mtr -6 -rw -z -b ' + fqdn;
        } else {
            main = 'mtr -6 -rw -z -b ' + fqdn;
            hint = 'traceroute -6 ' + fqdn;
        }
    } else {
        if (os === 'windows') {
            main = 'tracert ' + fqdn;
        } else if (os === 'macos') {
            main = 'traceroute ' + fqdn;
            hint = 'mtr -rw -z -b ' + fqdn;
        } else {
            main = 'mtr -rw -z -b ' + fqdn;
            hint = 'traceroute ' + fqdn;
        }
    }

    return { main: main, hint: hint };
}

/**
 * Retourne les commandes de test de service.
 * @returns {{ main: string, extra: string|null, extraHint: string|null }}
 */
function getServiceCmd(fqdn, port, service, os, client) {
    let defaultPort = '80';
    if (service === 'ssh') defaultPort = '22';
    if (service === 'tcp') defaultPort = '80';
    if (service === 'vnc') defaultPort = '5901';
    if (service === 'web-https') defaultPort = '443';
    if (service === 'udp') defaultPort = '123';

    const p = port || defaultPort;

    const commands = {
        main: '',
        extra: null,
        extraHint: null
    };

    if (service === 'udp') {
        commands.main = 'nc -z -v -u ' + fqdn + ' ' + p;
    } else {
        commands.main = 'nc -z -v ' + fqdn + ' ' + p;
    }

    if (service === 'ssh' && client === 'openssh') {
        commands.extra = 'ssh -vvv ' + fqdn + (port ? ' -p ' + port : '');
    } else if (service === 'web-https') {
        commands.extra = 'openssl s_client -connect ' + fqdn + ':' + p + ' -servername ' + fqdn + ' </dev/null 2>/dev/null | openssl x509 -noout -subject -dates -ext subjectAltName';
        commands.extraHint = 'Ancienne méthode (avec grep) :\nopenssl s_client -connect ' + fqdn + ':' + p + ' -servername ' + fqdn + ' </dev/null 2>/dev/null | openssl x509 -noout -text | grep -E "Subject:|DNS:|Not After|Not Before"';
    }

    return commands;
}
