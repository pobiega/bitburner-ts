import { NS } from "../types/index.js";
import { explore } from "./common.js";

const settings = {
    extraSleepTime: 100,
    homeRamReserved: 16,
    expFarmTarget: "joesguns",
    attackScripts: ["hack.js", "grow.js", "weaken.js"],
};

export async function main(ns: NS) {
    const executeAttackAction = (action: string, attacker: string, target: string, threads: number, delay: number, debug: boolean = false) => {
        const retval = ns.exec(action, attacker, threads, target, threads, delay, debug);
        if (retval === 0) {
            throw new Error(`Failed to execute ${action} on ${attacker} with ${threads} threads!`);
        }
    };

    while (true) {
        const expFarmTime = ns.getWeakenTime(settings.expFarmTarget);
        const sleepInterval = expFarmTime + settings.extraSleepTime;

        const servers = await explore(ns);

        let hackingNodes = Object.values(servers).filter(s => s.hasRootAccess);

        hackingNodes.forEach(node => {
            const availableRam = node.maxRam - ns.getServerUsedRam(node.host);

            node.availableCycles = Math.floor(availableRam / 1.75);

            if (node.host == "home") {
                node.availableCycles -= Math.max(Math.ceil(settings.homeRamReserved / 1.75), 0);
            }
        });

        hackingNodes = hackingNodes.filter(node => node.availableCycles > 0);

        const totalCycles = hackingNodes.reduce((sum, node) => sum + node.availableCycles, 0);

        for (const node of hackingNodes) {
            executeAttackAction("weaken.js", node.host, settings.expFarmTarget, node.availableCycles, 0);
        }

        ns.tprint(`Exp farming with ${totalCycles} cycles on ${hackingNodes.length} nodes. Waking up in ${ns.tFormat(sleepInterval)}.`);

        await ns.asleep(sleepInterval);
    }
};