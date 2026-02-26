/**
 * report.js
 * Génère le texte du rapport de diagnostic à partir de l'état du wizard.
 * Le rapport est affiché dans le textarea #report-output à l'étape finale.
 */
'use strict';

(function () {

    /**
     * Formatte une section du rapport.
     */
    function section(title, content) {
        var sep = '='.repeat(60);
        var val = (content && content.trim()) ? content.trim() : '(non renseigné)';
        return sep + '\n' + title + '\n' + sep + '\n' + val + '\n';
    }

    /**
     * Récupère la valeur d'un textarea ou input par son id.
     */
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    /**
     * Récupère le textContent d'un élément par son id.
     */
    function txt(id) {
        var el = document.getElementById(id);
        return el ? el.textContent.trim() : '';
    }

    var SERVICE_LABELS = { ssh: 'SSH', vnc: 'VNC', web: 'Site web', 'web-https': 'Site web HTTPS' };
    var OS_LABELS     = { windows: 'Windows', macos: 'macOS', linux: 'Linux' };
    var PROXY_LABELS  = { non: 'Non', vpn: 'VPN', proxy: 'Proxy', 'les deux': 'VPN + Proxy' };

    /**
     * Génère le rapport complet à partir des valeurs saisies.
     */
    window.generateReport = function () {
        // Récupérer les valeurs des boutons sélectionnés
        function selectedVal(groupId) {
            var sel = document.querySelector('#' + groupId + ' .choice-btn.selected');
            return sel ? sel.getAttribute('data-value') : '';
        }

        var s      = selectedVal('grp-service');
        var os     = selectedVal('grp-os');
        var client = selectedVal('grp-client');
        var proxy  = selectedVal('grp-proxy');

        var report = '';

        report += section('INFORMATIONS GÉNÉRALES',
            'Date      : ' + new Date().toLocaleString() + '\n' +
            'Service   : ' + (SERVICE_LABELS[s] || s) + '\n' +
            'OS        : ' + (OS_LABELS[os] || os) + '\n' +
            'Client    : ' + (client || '(non renseigné)') + '\n' +
            'Cible     : ' + val('fqdn') + (val('port') ? ':' + val('port') : '') + '\n' +
            'VPN/Proxy : ' + (PROXY_LABELS[proxy] || proxy || 'Non') + (val('proxy-detail') ? ' (' + val('proxy-detail') + ')' : '')
        );

        report += '\n' + section('ADRESSES IP PUBLIQUES',
            'IPv4 : ' + txt('ipv4-val') + '\n' +
            'IPv6 : ' + txt('ipv6-val')
        );

        report += '\n' + section("MESSAGE D'ERREUR", val('error-msg'));

        report += '\n' + section('RÉSOLUTION DNS (IPv4)', val('res-dns'));

        if (val('res-dns6')) {
            report += '\n' + section('RÉSOLUTION DNS (IPv6)', val('res-dns6'));
        }

        report += '\n' + section('CONNECTIVITÉ RÉSEAU - Ping IPv4', val('res-ping'));

        if (val('res-ping6')) {
            report += '\n' + section('CONNECTIVITÉ RÉSEAU - Ping IPv6', val('res-ping6'));
        }

        report += '\n' + section('CHEMIN RÉSEAU - Traceroute IPv4', val('res-trace'));

        if (val('res-trace6')) {
            report += '\n' + section('CHEMIN RÉSEAU - Traceroute IPv6', val('res-trace6'));
        }

        report += '\n' + section('TEST DE CONNEXION AU SERVICE', val('res-svc'));

        if (val('res-svc-extra')) {
            var extraTitle = (s === 'web-https') ? 'CERTIFICAT SSL/TLS' : 'DÉTAILS CONNEXION (VERBOSE)';
            report += '\n' + section(extraTitle, val('res-svc-extra'));
        }

        document.getElementById('report-output').value = report.trim();
    };

    /**
     * Copie le rapport dans le presse-papier.
     */
    window.copyReport = function () {
        var output = document.getElementById('report-output');
        output.select();
        document.execCommand('copy');

        var btn      = document.getElementById('btn-copy-report');
        var feedback = document.getElementById('copied-report');

        btn.disabled = true;
        if (feedback) { feedback.style.opacity = '1'; }

        setTimeout(function () {
            btn.disabled = false;
            if (feedback) { feedback.style.opacity = '0'; }
        }, 2000);
    };

})();
