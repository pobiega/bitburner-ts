// import settings from 'settings';
export async function main(ns) {
    const limit = ns.getPurchasedServerLimit();
    const ramLimit = ns.getPurchasedServerMaxRam();
    const ramSizes = [];
    let ramCalc = ramLimit;
    while (ramCalc >= 2) {
        ramSizes.push(ramCalc);
        ramCalc = Math.floor(ramCalc / 2);
    }
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
}
;
