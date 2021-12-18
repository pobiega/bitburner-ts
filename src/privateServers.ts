import { NS } from "../types/index.js";
// import settings from 'settings';

const settings = {
    privateServerPrefix: 'pserv',
};

export interface PrivateServer {
    ram: number;
    cost: number;
};

const getServerSteps = (ns: NS) => {
    const steps = [] as PrivateServer[];

    for (let i = 1; i <= 20; i++) {
        const ram = Math.pow(2, i);
        steps.push({
            ram,
            cost: ns.getPurchasedServerCost(ram)
        });
    }

    return steps;
};

export async function main(ns: NS) {
    const limit = ns.getPurchasedServerLimit();
    const steps = getServerSteps(ns);

    let hostnames = ns.getPurchasedServers();

    let servers = hostnames.map(hostname => ({
        hostname,
        ram: ns.getServerMaxRam(hostname),
    }));

    const action = ns.args[0];

    if (!action) {
        ns.tprint("Usage: ...");
        return;
    }

    const plan = () => {
        let money = ns.getServerMoneyAvailable("home");
        let numberOfServersToBuy = limit - servers.length;

        const affordableSteps = steps.filter(step => step.cost <= money).sort((a, b) => b.cost - a.cost);

        const countPerStep = affordableSteps.map(step => {
            const count = Math.min(Math.floor(money / step.cost), numberOfServersToBuy);
            return {
                count,
                ram: step.ram,
                totalRam: step.ram * count,
                totalCost: step.cost * count,
            };
        }).sort((a, b) => b.totalRam - a.totalRam);

        return countPerStep;
    };

    const buy = (ram: string | number) => {
        if (typeof ram === 'string') {
            ram = parseInt(ram);
        }

        const step = steps.find(step => step.ram === ram);

        if (!step) {
            ns.tprint(`Unknown RAM: ${ram}`);
            return;
        }

        let money = ns.getServerMoneyAvailable("home");
        let serversToBuy = Math.min(limit, Math.floor(money / step.cost));

        for (let i = 0; i < serversToBuy; i++) {
            ns.purchaseServer(settings.privateServerPrefix, step.ram);
        }

        return {
            count: serversToBuy,
            total: step.cost * serversToBuy,
        };
    };

    switch (action) {
        case "list":
            servers.forEach(server => {
                ns.tprint(`${server.hostname}\t\t - ${server.ram.toString().padStart(4)} GB`);
            });
            break;
        case "analyze":
            ns.tprint(`Available RAM sizes:`);
            steps.forEach(step => {
                ns.tprint(`${step.ram.toString().padStart(4)} GB\t - ${ns.nFormat(step.cost, "$0.000a").padStart(4)}`);
            });
        case "plan": {
            const result = plan();

            ns.tprint("Options:")
            for (const r of result) {
                ns.tprint(`\t - ${r.count} x ${r.ram.toString().padStart(4)} GB (${r.totalRam} GB total) - ${ns.nFormat(r.totalCost, "$0.000a").padStart(4)}`);
            }
            break;
        }
        case "buy": {
            const ram = ns.args[1];

            if (typeof (ram) === 'boolean') {
                return;
            }

            const result = buy(ram);
            if (!result) {
                ns.tprint(`Couldn't buy servers.`);
                return;
            }
            ns.tprint(`Bought ${result?.count} server${result.count > 1 ? "s" : ""} for ${ns.nFormat(result.total, "$0.000a")}`);
            break;
        }
    }
};