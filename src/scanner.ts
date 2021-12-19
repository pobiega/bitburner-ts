import { NS } from "../types/index.js";
import { explore, estimateServerWorth } from "./controller.js";
import { ServerNode } from "./types.js";

export async function main(ns: NS) {
    const servers = await explore(ns);

    let filter = (server: ServerNode): boolean => server.maxMoney > 0;

    const findWeirdServers = ns.args[0] !== undefined;

    if(findWeirdServers){
        filter = (server) => server.maxMoney < 1;
    }

    for (const server of Object.values(servers)) {

        if(!filter(server)){
            continue;
        }

        ns.tprintf("%20s: %9s / %9s | %5s / %5s | %5d |%10s",
            server.host,
            ns.nFormat(ns.getServerMoneyAvailable(server.host), "$0.000a"),
            ns.nFormat(server.maxMoney, "$0.000a"),
            ns.getServerSecurityLevel(server.host).toFixed(2),
            server.minSecurityLevel.toFixed(2),
            server.growth.toFixed(0),
            estimateServerWorth(ns, server).toFixed(2)
        );
    }
}