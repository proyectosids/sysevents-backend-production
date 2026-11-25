"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPublicEgressIp = detectPublicEgressIp;
const net_1 = require("net");
const IP_DISCOVERY_ENDPOINTS = [
    { url: 'https://api.ipify.org?format=json', parse: (value) => String(value?.ip ?? '') },
    { url: 'https://ifconfig.me/ip', parse: (value) => String(value ?? '') },
];
async function detectPublicEgressIp() {
    let lastError;
    for (const endpoint of IP_DISCOVERY_ENDPOINTS) {
        try {
            const response = await fetch(endpoint.url, {
                headers: { Accept: 'application/json, text/plain;q=0.9' },
                signal: AbortSignal.timeout(5_000),
            });
            if (!response.ok)
                throw new Error(`IP discovery returned ${response.status}`);
            const contentType = response.headers.get('content-type') ?? '';
            const payload = contentType.includes('application/json') ? await response.json() : await response.text();
            const ip = endpoint.parse(payload).trim();
            const version = (0, net_1.isIP)(ip);
            if (!version)
                throw new Error('IP discovery returned an invalid address');
            return { ip, version, observedBy: new URL(endpoint.url).hostname };
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Public egress IP could not be detected');
}
//# sourceMappingURL=egress-ip.service.js.map