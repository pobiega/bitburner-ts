import { NS } from "../types/index.js";
import { ActionTimes, CycleCount, Server } from 'types';

const DEBUG = {
    attackActions: false,
    dryrun: false,
}

const settings = {
    harvestPercent: 0.5,
    homeRamReserved: 64,
    changes: {
        hack: 0.002,
        grow: 0.004,
        weaken: 0.05,
    },
    attackScripts: ["hack.js", "grow.js", "weaken.js"],
};

const msToString = (ms = 0) => {
    if (ms <= 0) {
        return '00:00:00';
    }

    if (!ms) {
        ms = new Date().getTime();
    }
    return new Date(ms).toLocaleTimeString('en-GB');
}

const weakenCyclesForGrow = (growCycles: number) => {
    return Math.max(0, Math.ceil(growCycles * (settings.changes.grow / settings.changes.weaken)));
};

const weakenCyclesForHack = (hackCycles: number) => {
    return Math.max(0, Math.ceil(hackCycles * (settings.changes.hack / settings.changes.weaken)));
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

        servers["home"].maxRam = Math.max(0, servers["home"].maxRam - settings.homeRamReserved);

        ns.tprint(`Found ${Object.keys(servers).length} servers, ${Object.values(servers).filter(s => s.hasRootAccess).length} with root access`);
    };

    const locateTargets = () => {
        const hackingLevel = ns.getHackingLevel();

        const potentialTargets = [];

        for (const [hostname, server] of Object.entries(servers)) {
            if (server.hackingLevel > hackingLevel) {
                continue;
            }

            if (hostname === "home") {
                continue;
            }

            const money = ns.getServerMoneyAvailable(server.host);

            if (server.maxMoney < 1000000 || money < 1000) {
                continue;
            }

            const estimatedWorth = server.maxMoney / (200 + (server.minSecurityLevel * server.hackingLevel));
            potentialTargets.push({ estimatedWorth, hostname });
        }

        potentialTargets.sort((a, b) => b.estimatedWorth - a.estimatedWorth);

        return potentialTargets;
    };

    const attack = (targets: Server[]) => {

        const executeAttackAction = (action: string, attacker: string, target: string, threads: number, delay: number) => {

            if (!DEBUG.dryrun) {
                const retval = ns.exec(action, attacker, threads, target, threads.toString(), delay.toString());
                if (retval === 0) {
                    throw new Error(`Failed to execute ${action} on ${attacker} with ${threads} threads!`);
                }
            }
        };

        const getActionTimes = (host: string): ActionTimes => {
            const hackTime = ns.getHackTime(host);
            const weakenTime = ns.getWeakenTime(host);
            const growTime = ns.getGrowTime(host);

            return {
                hack: hackTime,
                weaken: weakenTime,
                grow: growTime,
                growDelay: Math.max(0, weakenTime - growTime) + 30,
                additionalWeakenDelay: Math.max(0, weakenTime) + 60,
            }
        };

        const calculatePrepare = (cycles: number, target: Server): CycleCount => {
            let cyclesAvailable = cycles;

            const secLevel = ns.getServerSecurityLevel(target.host);
            const money = ns.getServerMoneyAvailable(target.host);

            const weakenCount = Math.ceil((secLevel - target.minSecurityLevel) / settings.changes.weaken);
            const growCount = Math.ceil(ns.growthAnalyze(target.host, target.maxMoney / money));
            const additionalWeakenCount = weakenCyclesForGrow(growCount);

            ns.tprint(`${target.host} needs ${weakenCount} weaken cycles, ${growCount} grow cycles and ${additionalWeakenCount} additional weaken cycles.`);

            const weakensToPerform = Math.min(weakenCount, cyclesAvailable);
            cyclesAvailable -= weakensToPerform;

            const growToPerform = Math.min(growCount, cyclesAvailable);
            cyclesAvailable -= growToPerform;

            const additionalWeakensToPerform = Math.min(additionalWeakenCount, cyclesAvailable);

            const total = weakensToPerform + growToPerform + additionalWeakensToPerform;

            return {
                total,
                weaken: weakensToPerform,
                grow: growToPerform,
                additionalWeakens: additionalWeakensToPerform,
            };
        };

        const hackThreadsNeededToSteal = (target: Server, percent: number): number => {
            const oneThread = ns.hackAnalyze(target.host);

            return Math.ceil(percent / oneThread);
        };

        let hackingNodes = Object.values(servers).filter(s => s.hasRootAccess);

        // update available cycles
        hackingNodes.forEach(node => {
            const availableRam = node.maxRam - ns.getServerUsedRam(node.host);
            node.availableCycles = Math.floor(availableRam / 1.75)
        });

        const totalCycles = hackingNodes.reduce((total, server) => total + Math.floor(server.maxRam / 1.75), 0);
        ns.tprint(`Total cycles available for use: ${totalCycles}`);

        let cycles = totalCycles;

        let longestWait = 0;

        const debugAttackActionFormat = "DEBUG: attacker %s; target %s; action %s, count %d; need %d; left: node %d; total %d;";

        for (const target of targets) {

            if (cycles <= 0) {
                break;
            }

            const cyclesNeeded = calculatePrepare(cycles, target);
            const actionTimes = getActionTimes(target.host);

            ns.tprint(`${target.host} weaken time is ${ns.tFormat(actionTimes.weaken)}`);

            hackingNodes = hackingNodes.filter(node => node.availableCycles > 0);

            if (hackingNodes.length === 0) {
                break;
            }

            let harvestThreads = 0;

            if (cyclesNeeded.total == 0) {
                harvestThreads = hackThreadsNeededToSteal(target, settings.harvestPercent);
                const addWeaken = weakenCyclesForHack(harvestThreads);
                cyclesNeeded.additionalWeakens += addWeaken;
                cyclesNeeded.total += addWeaken;
                ns.tprint(`${target.host} will be harvested with ${harvestThreads} threads.`);
            }

            for (const node of hackingNodes) {
                if (cycles <= 0) {
                    break;
                }

                if (harvestThreads > 0 && node.availableCycles > 0) {
                    const count = Math.min(harvestThreads, node.availableCycles);
                    executeAttackAction("hack.js", node.host, target.host, count, 0);
                    cycles -= count;
                    node.availableCycles -= count;
                    harvestThreads -= count;

                    longestWait = Math.max(longestWait, actionTimes.hack);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "hack", count, harvestThreads, node.availableCycles, cycles);
                }

                if (cyclesNeeded.weaken > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.weaken, node.availableCycles);
                    executeAttackAction("weaken.js", node.host, target.host, count, 0);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.weaken -= count;

                    longestWait = Math.max(longestWait, actionTimes.weaken);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "weaken", count, cyclesNeeded.weaken, node.availableCycles, cycles);
                }

                if (cyclesNeeded.grow > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.grow, node.availableCycles);
                    executeAttackAction("grow.js", node.host, target.host, count, actionTimes.growDelay);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.grow -= count;

                    longestWait = Math.max(longestWait, actionTimes.growDelay + actionTimes.grow);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "grow", count, cyclesNeeded.grow, node.availableCycles, cycles);
                }

                if (cyclesNeeded.additionalWeakens > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.additionalWeakens, node.availableCycles);
                    executeAttackAction("weaken.js", node.host, target.host, count, actionTimes.additionalWeakenDelay);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.additionalWeakens -= count;

                    longestWait = Math.max(longestWait, actionTimes.additionalWeakenDelay + actionTimes.weaken);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "+weaken", count, cyclesNeeded.additionalWeakens, node.availableCycles, cycles);
                }
            }

            ns.tprint(`${cycles} remaining cycles after using ${cyclesNeeded.total} cycles for ${target.host}.`);
        }

        ns.tprint(`Longest wait: ${ns.tFormat(longestWait)}.`);
        return { longestWait };
    };

    while (true) {
        await explore();
        const targets = locateTargets().map(({ hostname }) => servers[hostname]);
        const waits = attack(targets);

        ns.tprint(`Sleeping; Waking up at ${msToString(new Date().getTime() + waits.longestWait)}.`);

        if (DEBUG.dryrun) {
            ns.tprint("Dryrun mode enabled, exiting.");
            return;
        }
        await ns.asleep(waits.longestWait);
    }
}
