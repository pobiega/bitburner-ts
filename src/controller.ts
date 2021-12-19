import { NS } from "../types/index.js";
import { ActionTimes, CycleCount, HWGWBatch, ServerNode } from 'types';

const DEBUG = {
    batcher: true,
    targetFinder: false,
    attackActions: false,
    expFarm: false,
    dryrun: false,
}

const settings = {
    hwgwSafetyFactor: 1.03,
    earlyGame: {
        threshhold: 10000,
        timeCap: 2 * 60 * 1000,
    },
    timeCap: 10 * 60 * 1000,
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

export function msToString(ms = 0) {
    if (ms <= 0) {
        return '00:00:00';
    }

    if (!ms) {
        ms = new Date().getTime();
    }
    return new Date(ms).toLocaleTimeString('en-GB');
}

export function estimateServerWorth(ns: NS, server: ServerNode) {
    const weakenTime = ns.getWeakenTime(server.host);
    return (server.maxMoney * server.growth) / weakenTime;
}

function weakenCyclesForGrow(growCycles: number, multiplier: number = 1) {
    return Math.max(0, Math.ceil(growCycles * (settings.changes.grow / settings.changes.weaken) * multiplier));
}

function weakenCyclesForHack(hackCycles: number, multiplier: number = 1) {
    return Math.max(0, Math.ceil(hackCycles * (settings.changes.hack / settings.changes.weaken) * multiplier));
}

export const explore = async (ns: NS) => {
    const servers = {} as Record<string, ServerNode>;

    const getRootAccess = (server: ServerNode) => {
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

    servers["home"].maxRam = Math.max(0, servers["home"].maxRam - settings.homeRamReserved);

    return servers;
};

export const calculateAvailableCycles = (ns: NS, nodes: ServerNode[]) => {
    let total = 0;
    for (const node of nodes) {
        if (node.hasRootAccess) {
            const availableRam = node.maxRam - ns.getServerUsedRam(node.host);
            node.availableCycles = Math.floor(availableRam / 1.75)
            total += node.availableCycles;
        }
    }

    return total;
};

async function expFarm(ns: NS, hackingNodes: ServerNode[], stopTime: number) {
    while (new Date().getTime() < stopTime) {
        const expFarmTime = ns.getWeakenTime(settings.expFarmTarget);
        const sleepInterval = expFarmTime + 100;
        const totalCycles = calculateAvailableCycles(ns, hackingNodes);

        const activeNodes = hackingNodes.filter(node => node.availableCycles > 0);

        if (!DEBUG.dryrun) {
            for (const node of activeNodes) {
                executeAttackAction(ns, "weaken.js", node.host, settings.expFarmTarget, node.availableCycles, 0);
            }
        }

        if (DEBUG.expFarm) {
            ns.tprint(`Exp farming with ${totalCycles} cycles on ${activeNodes.length} nodes.`);
        }

        await ns.asleep(sleepInterval);
    }
}

export function executeAttackAction(ns: NS, action: string, attacker: string, target: string, threads: number, delay: number) {

    if (!DEBUG.dryrun) {
        const retval = ns.exec(action, attacker, threads, target, threads, delay, uuid());
        if (retval === 0) {
            const serverRam = ns.getServerMaxRam(attacker) - ns.getServerUsedRam(attacker);
            const threadsThatFit = Math.floor(serverRam / 1.75);
            throw new Error(`Failed to execute ${action} on ${attacker} with ${threads} threads, node has space for ${threadsThatFit} threads!`);
        }
    }
}

const locateTargets = (ns: NS, servers: Record<string, ServerNode>, capacity: number) => {
    const isEarlyGame = capacity < settings.earlyGame.threshhold;

    if (isEarlyGame) {
        ns.tprint(`Early game detected, capping max weaken time to ${ns.tFormat(settings.earlyGame.timeCap)}.`);
    }

    const hackingLevel = ns.getHackingLevel();

    const potentialTargets = [];

    for (const [hostname, server] of Object.entries(servers)) {
        if (server.hackingLevel > hackingLevel || !server.hasRootAccess) {
            continue;
        }

        if (hostname === "home" || hostname === "n00dles") {
            continue;
        }

        const money = ns.getServerMoneyAvailable(server.host);

        if (server.maxMoney < 1000000 || money < 1000) {
            continue;
        }

        const weakenTime = ns.getWeakenTime(server.host);


        if (isEarlyGame && weakenTime > settings.earlyGame.timeCap) {
            continue;
        }
        else if (weakenTime > settings.timeCap) {
            continue;
        }

        const estimatedWorth = estimateServerWorth(ns, server);
        potentialTargets.push({ estimatedWorth, hostname });
    }

    potentialTargets.sort((a, b) => b.estimatedWorth - a.estimatedWorth);

    const topServers = potentialTargets.slice(0, Math.min(settings.targetServerCount, potentialTargets.length));

    if (DEBUG.targetFinder) {
        ns.tprint(`Top ${topServers.length} targets:`);
        for (const target of topServers) {
            ns.tprint(`${target.hostname} - (${target.estimatedWorth})`);
        }

        ns.exit();
    }

    return topServers;
};

export const hackThreadsNeededToSteal = (ns: NS, target: string, percent: number): number => {
    return Math.ceil(percent / ns.hackAnalyze(target));
};

export async function main(ns: NS) {
    const attack = (hackingNodes: ServerNode[], targets: ServerNode[]) => {

        const getActionTimes = (target: string): ActionTimes => {
            const hackTime = ns.getHackTime(target);
            const weakenTime = ns.getWeakenTime(target);
            const growTime = ns.getGrowTime(target);

            const growDelay = Math.max(0, weakenTime - growTime) + 15;
            const hackDelay = Math.max(0, weakenTime - hackTime) + 15;

            return {
                hack: hackTime,
                weaken: weakenTime,
                grow: growTime,
                growDelay: growDelay,
                hackDelay: hackDelay,
                additionalWeakenDelay: 1000,
            }
        };

        const calculatePrepare = (cycles: number, target: ServerNode): CycleCount => {
            let cyclesAvailable = cycles;

            const secLevel = ns.getServerSecurityLevel(target.host);
            const money = ns.getServerMoneyAvailable(target.host);

            const weakenCount = Math.ceil((secLevel - target.minSecurityLevel) / settings.changes.weaken);
            const growCount = Math.ceil(ns.growthAnalyze(target.host, target.maxMoney / money));
            const additionalWeakenCount = weakenCyclesForGrow(growCount);

            //ns.tprint(`${target.host} needs ${weakenCount} weaken cycles, ${growCount} grow cycles and ${additionalWeakenCount} additional weaken cycles.`);

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

        // update available cycles
        const totalCycles = calculateAvailableCycles(ns, hackingNodes);
        ns.tprint(`Total cycles available for use: ${totalCycles}`);

        let cycles = totalCycles;

        let longestWait = 0;

        const debugAttackActionFormat = "DEBUG: attacker %s; target %s; action %s, count %d; need %d; left: node %d; total %d;";

        const batchTargets = [];

        for (const target of targets) {
            const cyclesNeeded = calculatePrepare(cycles, target);

            if (cyclesNeeded.total === 0) {
                // this target is fully prepared. We should initiate a H W G W cycle.
                batchTargets.push({ batch: createHWGWBatch(ns, target), target });
            }
        }

        if (batchTargets.length > 1) {
            const cyclesPerTarget = Math.floor((cycles * .75) / batchTargets.length);
            ns.tprint(`${batchTargets.length} targets ready for H W G W, ${cyclesPerTarget} cycles per batch target.`);

            // a batching we go
            for (const { batch, target } of batchTargets) {
                const actionTimes = getActionTimes(target.host);
                let delay = 0;
                // cap number of batches to 400.
                const batchesForThisTarget = Math.min(Math.floor(cyclesPerTarget / batch.totalCycles), 400);
                if (DEBUG.batcher) {
                    ns.tprint(`${target.host}: Batch size is ${batch.totalCycles}; ${batchesForThisTarget} batches.`);
                }
                let batchCount = 0;
                for (let i = 0; i < batchesForThisTarget; i++) {

                    if (cycles < batch.totalCycles) {
                        break;
                    }

                    // execute the batch.

                    runBatch(ns, target.host, hackingNodes, batch, delay, actionTimes, i);
                    delay = i * settings.batchDelay;
                    // cycles = calculateAvailableCycles(ns, hackingNodes);
                    cycles -= batch.totalCycles;
                    batchCount = i;
                }

                longestWait = Math.max(longestWait, delay + actionTimes.weaken);

                ns.tprint(`Executed ${batchCount + 1} batches for ${target.host} - ${cycles} cycles left. Last batch finishes in ${ns.tFormat(delay + actionTimes.weaken)}.`);
            }
        }

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

            // we need to grow and weaken
            for (const node of hackingNodes) {
                if (cycles <= 0) {
                    break;
                }

                if (cyclesNeeded.weaken > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.weaken, node.availableCycles);
                    executeAttackAction(ns, "weaken.js", node.host, target.host, count, 0);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.weaken -= count;

                    longestWait = Math.max(longestWait, actionTimes.weaken);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "weaken", count, cyclesNeeded.weaken, node.availableCycles, cycles);
                }

                if (cyclesNeeded.grow > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.grow, node.availableCycles);
                    executeAttackAction(ns, "grow.js", node.host, target.host, count, actionTimes.growDelay);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.grow -= count;

                    longestWait = Math.max(longestWait, actionTimes.growDelay + actionTimes.grow);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "grow", count, cyclesNeeded.grow, node.availableCycles, cycles);
                }

                if (cyclesNeeded.additionalWeakens > 0 && node.availableCycles > 0) {
                    const count = Math.min(cyclesNeeded.additionalWeakens, node.availableCycles);
                    executeAttackAction(ns, "weaken.js", node.host, target.host, count, actionTimes.additionalWeakenDelay);
                    cycles -= count;
                    node.availableCycles -= count;
                    cyclesNeeded.additionalWeakens -= count;

                    longestWait = Math.max(longestWait, actionTimes.additionalWeakenDelay + actionTimes.weaken);

                    if (DEBUG.attackActions) ns.tprintf(debugAttackActionFormat, node.host, target.host, "+weaken", count, cyclesNeeded.additionalWeakens, node.availableCycles, cycles);
                }
            }
        }

        ns.tprint(`Longest wait: ${ns.tFormat(longestWait)}. Remaining cycles: ${cycles}.`);
        return { longestWait, remainingCycles: cycles };
    };

    ns.tprint("Starting controller.");

    while (true) {
        const servers = await explore(ns);
        const hackingNodes = getHackingNodes(servers);
        const capacity = calculateAvailableCycles(ns, hackingNodes);
        const targets = locateTargets(ns, servers, capacity).map(({ hostname }) => servers[hostname]);

        const attackResults = attack(hackingNodes, targets);

        const attackResetAt = new Date().getTime() + attackResults.longestWait;
        ns.tprint(`Next attack run at ${msToString(attackResetAt)}.`);

        if (DEBUG.dryrun) {
            ns.tprint("Dryrun mode enabled, exiting.");
            return;
        }

        const postruncapacity = calculateAvailableCycles(ns, hackingNodes);

        ns.tprint(`Post-attack capacity: ${postruncapacity}.`);

        await expFarm(ns, hackingNodes, attackResetAt);
    }
}

export function getHackingNodes(servers: Record<string, ServerNode>) {
    return Object.values(servers).filter(s => s.hasRootAccess);
}

function createHWGWBatch(ns: NS, target: ServerNode): HWGWBatch {
    const hackCycles = hackThreadsNeededToSteal(ns, target.host, settings.harvestPercent);
    const growCycles = Math.ceil(ns.growthAnalyze(target.host, 1 / (1 - settings.harvestPercent)) * settings.hwgwSafetyFactor);
    const weakenForHack = weakenCyclesForHack(hackCycles, settings.hwgwSafetyFactor);
    const weakenForGrow = weakenCyclesForGrow(growCycles, settings.hwgwSafetyFactor);

    return {
        hackCycles: hackCycles,
        weakenForHack,
        growCycles,
        weakenForGrow,
        totalCycles: hackCycles + weakenForHack + growCycles + weakenForGrow,
    };
}

function runBatch(ns: NS, target: string, hackingNodes: ServerNode[], batch: HWGWBatch, delay: number, actionTimes: ActionTimes, batchId: number) {
    let { hackCycles, growCycles, weakenForHack, weakenForGrow } = batch;

    // first run hacks
    for (const node of hackingNodes) {
        if (hackCycles <= 0) {
            break;
        }

        const count = Math.min(hackCycles, node.availableCycles);
        if (count > 0) {
            executeAttackAction(ns, "hack.js", node.host, target, count, delay + actionTimes.hackDelay);
            hackCycles -= count;
            node.availableCycles -= count;
        }
    }

    // start the weakens
    for (const node of hackingNodes) {
        if (weakenForHack <= 0) {
            break;
        }

        const count = Math.min(weakenForHack, node.availableCycles);
        if (count > 0) {
            executeAttackAction(ns, "weaken.js", node.host, target, count, delay);
            weakenForHack -= count;
            node.availableCycles -= count;
        }
    }

    // start the grows
    for (const node of hackingNodes) {
        if (growCycles <= 0) {
            break;
        }

        const count = Math.min(growCycles, node.availableCycles);
        if (count > 0) {
            executeAttackAction(ns, "grow.js", node.host, target, count, delay + actionTimes.growDelay);
            growCycles -= count;
            node.availableCycles -= count;
        };

    }

    // start the last weakens
    for (const node of hackingNodes) {
        if (weakenForGrow <= 0) {
            break;
        }

        const count = Math.min(weakenForGrow, node.availableCycles);
        if (count > 0) {
            executeAttackAction(ns, "weaken.js", node.host, target, count, delay + 20);
            weakenForGrow -= count;
            node.availableCycles -= count;
        }
    }
}

let uuidCounter = 0;

function uuid(): string | number | boolean {
    return uuidCounter++;
}
