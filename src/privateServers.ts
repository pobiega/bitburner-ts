import { NS } from "../types/index.js";
// import settings from 'settings';

export interface PrivateServer {
    ram: number;
    cost: number;
};

const getServerSteps = (ns: NS) => {
    const steps = [] as PrivateServer[];

    for (let i = 1; i <= 20; i++) {
        const ram = Math.pow(2,i);
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

    switch (action) {
        case "list":
            servers.forEach(server => {
                ns.tprint(`${server.hostname}\t\t - ${server.ram.toString().padStart(4)} GB`);
            });
            break;
        case "analyze":
            ns.tprint(`Available RAM sizes: ${ramSizes.join(", ")}`);
    }

    // while (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram) && i < limit) {
    //     let hostname = ns.purchaseServer(`${settings.privateServerPrefix}${i++}`, ram);

    //     await ns.asleep(500);
    // }
};