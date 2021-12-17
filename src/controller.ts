import { NS } from "../types/index.js";
import { Server } from 'types';
import settings from 'settings';

export async function main(ns: NS) {
    const servers = {} as Record<string, Server>;

    const explore = () => {
        const queue = ["home"];

        while (queue.length > 0) {
            const host = queue.shift();

            if (host === undefined) {
                throw new Error("Queue ran out while exploring.");
            }

            servers[host] = {
                host: host,
                ports: ns.getServerNumPortsRequired(host),
                hackingLevel: ns.getServerRequiredHackingLevel(host),
                maxMoney: ns.getServerMaxMoney(host),
                growth: ns.getServerGrowth(host),
                minSecurityLevel: ns.getServerMinSecurityLevel(host),
                maxRam: ns.getServerMaxRam(host),
                hasRootAccess: ns.hasRootAccess(host),
                files: ns.ls(host),
            };

            if (servers[host].hasRootAccess) {
                servers[host].hasRootAccess = getRootAccess(servers[host]);
            }

            const neighbors = ns.scan(host);

            for (const hostname of neighbors) {
                if (!servers[hostname]) {
                    queue.push(hostname);
                }
            }
        }
    };

    const getRootAccess = (server: Server) => {
        const portAccessTools = {
            "BruteSSH.exe": ns.brutessh,
            "FTPCrack.exe": ns.ftpcrack,
            "RelaySMTP.exe": ns.relaysmtp,
            "HTTPWorm.exe": ns.httpworm,
        };

        let openPorts = 0;

        for (const [name, func] of Object.entries(portAccessTools)) {
            if (ns.fileExists(name)) {
                func(server.host);
                openPorts++;
            }
        }

        if (openPorts >= server.ports) {
            ns.nuke(server.host);
            return true;
        }
        return false;
    };

    const locateTargets = () => {
    };

    const attack = () => { };

    const prepare = () => { };

    while (true) {
        explore();
    }
}
