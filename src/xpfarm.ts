import { NS } from "../types/index.js";

import { Server } from 'types';

const settings = {
    homeRamReserved: 64,
    expFarmTarget: "joesguns",
    attackScripts: ["hack.js", "grow.js", "weaken.js"],
};

export async function main(ns: NS) {
    const servers = {} as Record<string, Server>;

    const explore = async () => {

        const getRootAccess = (server: Server) => {
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
                await ns.scp(settings.attackScripts, "home", host);
            }

            if (!servers[host].hasRootAccess) {
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

    const executeAttackAction = (action: string, attacker: string, target: string, threads: number, delay: number, debug: boolean = false) => {
        const retval = ns.exec(action, attacker, threads, target, threads, delay, debug);
        if (retval === 0) {
            throw new Error(`Failed to execute ${action} on ${attacker} with ${threads} threads!`);
        }
    };

    while (true) {
        const expFarmTime = ns.getWeakenTime(settings.expFarmTarget);
        const sleepInterval = expFarmTime + 30;

        await explore();

        let hackingNodes = Object.values(servers).filter(s => s.hasRootAccess);

        hackingNodes.forEach(node => {
            const availableRam = node.maxRam - ns.getServerUsedRam(node.host);
            node.availableCycles = Math.floor(availableRam / 1.75);
        });

        hackingNodes = hackingNodes.filter(node => node.availableCycles > 0);

        const totalCycles = hackingNodes.reduce((sum, node) => sum + node.availableCycles, 0);

        for (const node of hackingNodes) {
            executeAttackAction("weaken.js", node.host, settings.expFarmTarget, node.availableCycles, 0);
        }

        ns.tprint(`Exp farming with ${totalCycles} cycles on ${hackingNodes.length} nodes.`);

        await ns.asleep(sleepInterval);
    }
};