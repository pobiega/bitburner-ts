import { NodeStats, NS } from "../types/index.js";

/** @param {NS} ns */
export async function main(ns: NS) {
    const actions = [
        [ns.hacknet.getLevelUpgradeCost, ns.hacknet.upgradeLevel],
        [ns.hacknet.getRamUpgradeCost, ns.hacknet.upgradeRam],
        [ns.hacknet.getCoreUpgradeCost, ns.hacknet.upgradeCore],
    ] as const;

    while (true) {
        const nodeCount = ns.hacknet.numNodes();
        const maxNodes = ns.hacknet.maxNumNodes();

        let money = ns.getServerMoneyAvailable("home");
        let actionsTaken = 0;

        for (let i = 0; i < nodeCount; i++) {
            for (const [getCost, upgrade] of actions) {
                if (buyIfPossible(ns, i, getCost, upgrade))
                    actionsTaken++;
            }
        }

        if (actionsTaken > 0) {
            ns.tprint(`Bought ${actionsTaken} hacknet upgrades.`);
        }

        await ns.sleep(2000);
    }

}

const buyIfPossible = (ns: NS, index: number, getCost: (index: number, n: number) => number, upgrade: (index: number, n: number) => void) => {
    const money = ns.getServerMoneyAvailable("home");

    const cost = getCost(index, 1);
    if (money > cost) {
        upgrade(index, 1);
        return true;
    }
    return false;
}