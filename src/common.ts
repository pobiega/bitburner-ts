import { NS } from "../types/index";
import { ServerNode } from "./types";

const settings = {
    extraSleepTime: 100,
    homeRamReserved: 32,
    expFarmTarget: "joesguns",
    attackScripts: ["hack.js", "grow.js", "weaken.js"],
};

export const explore = async (ns: NS) => {
    const servers = {} as Record<string, ServerNode>;

    const queue = ["home"];

    while (queue.length > 0) {
        const host = queue.shift()!;

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
            availableCycles: 0,
        };

        if (host !== "home") {
            await ns.scp(settings.attackScripts, host, "home");
        }

        if (!servers[host].hasRootAccess) {
            servers[host].hasRootAccess = getRootAccess(ns, servers[host]);
        }

        const neighbors = ns.scan(host);

        for (const hostname of neighbors) {
            if (!servers[hostname]) {
                queue.push(hostname);
            }
        }
    }

    return servers;
};

const getRootAccess = (ns: NS, server: ServerNode) => {
    const portAccessTools = {
        "BruteSSH.exe": ns.brutessh,
        "FTPCrack.exe": ns.ftpcrack,
        "RelaySMTP.exe": ns.relaysmtp,
        "HTTPWorm.exe": ns.httpworm,
        "SQLInject.exe": ns.sqlinject,
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