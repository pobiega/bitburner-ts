import { NS } from "../types/index.js";

export async function main(ns: NS) {
    let firstRun = true;

    const allServers = await explore(ns);
    const hackingNodes = getHackingNodes(ns, allServers);

    let capacity = getHackingCapacity(ns, hackingNodes);

    if (firstRun) {
        ns.tprint(`Servers: ${Object.keys(allServers).length}; Hacking nodes: ${hackingNodes.length}; Capacity: ${capacity}`);
    }

    const targets = getTargets(ns, allServers);
    const analysisResults = analyzeTargets(ns, targets);



    firstRun = false;
}

const settings = {
    earlyGame: {
        threshhold: 10000,
        timeCap: 5 * 60 * 1000,
    },
    batchDelay: 175,
    targetServerCount: 10,
    harvestPercent: 0.5,
    homeRamReserved: 64,
    changes: {
        hack: 0.002,
        grow: 0.004,
        weaken: 0.05,
    },
    attackScripts: ["hack.js", "grow.js", "weaken.js"],
    expFarmTarget: "joesguns"
};

export interface ServerNode {
    host: string;
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
    minSecurityLevel: number;
    maxRam: number;
    files: string[];
    hasRootAccess: boolean;
}

export interface HackingNode {
    host: string;
    maxRam: number;
    ramCapacity: number;
    threadCapacity: number;
}

export interface TargetNode {
    host: string;
    growth: number;
    maxMoney: number;
    minSecurityLevel: number;
    money: number;
    security: number;
    estimatedTargetValue: number;
}

export function getRootAccess(ns: NS, server: ServerNode) {
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
}

export async function explore(ns: NS) {
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
        };

        if (host !== "home") {
            await ns.scp(settings.attackScripts, "home", host);
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

    servers["home"].maxRam = Math.max(0, servers["home"].maxRam - settings.homeRamReserved);

    return servers;
}

enum Action {
    HWGW,
    Prepare,
    Farm
}

function getHackingNodes(ns: NS, allServers: Record<string, ServerNode>): HackingNode[] {
    const hackingNodes = Object.values(allServers).filter((server) => {
        if (!server.hasRootAccess) {
            server.hasRootAccess = getRootAccess(ns, server);
        }

        return server.hasRootAccess;
    }).map((server) => {
        const capacity = server.maxRam - ns.getServerUsedRam(server.host);

        return {
            host: server.host,
            maxRam: server.maxRam,
            ramCapacity: capacity,
            threadCapacity: Math.floor(capacity / 1.75),
        } as HackingNode;
    });

    return hackingNodes;
}

function getTargets(ns: NS, allServers: Record<string, ServerNode>) {
    const playerHackingLevel = ns.getHackingLevel();

    return Object.values(allServers).filter((server) => {
        if (server.maxMoney === 0) return false;
        if (server.host === "n00dles" || server.host === "home") return false;
        if (server.hackingLevel > playerHackingLevel) return false;
        return true;
    });
}

function estimateTargetValue(ns: NS, server: ServerNode): number {
    return (server.maxMoney * server.growth) / ns.getWeakenTime(server.host);
}

function analyzeTargets(ns: NS, targets: ServerNode[], estimationFunction = estimateTargetValue) {
    const hwgwReady = [] as TargetNode[];
    const prepare = [] as TargetNode[];

    targets.forEach((server) => {
        const money = ns.getServerMoneyAvailable(server.host);
        const security = ns.getServerSecurityLevel(server.host);

        const targetNode = {
            host: server.host,
            growth: server.growth,
            maxMoney: server.maxMoney,
            minSecurityLevel: server.minSecurityLevel,
            money: money,
            security: security,
            estimatedTargetValue: estimationFunction(ns, server),
        };

        if (money === server.maxMoney && security === server.minSecurityLevel) {
            hwgwReady.push(targetNode);
        }
        else {
            prepare.push(targetNode);
        }
    });

    return {
        hwgwReady: hwgwReady.sort((a, b) => b.estimatedTargetValue - a.estimatedTargetValue),
        prepare: prepare.sort((a, b) => b.estimatedTargetValue - a.estimatedTargetValue),
    };
}

function getHackingCapacity(ns: NS, hackingNodes: HackingNode[]) {
    hackingNodes.forEach((node) => {
        node.ramCapacity = node.maxRam - ns.getServerUsedRam(node.host);
        node.threadCapacity = Math.floor(node.ramCapacity / 1.75);
    });

    return hackingNodes.reduce((acc, node) => acc + node.threadCapacity, 0);
}

