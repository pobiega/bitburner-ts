import { NS } from "../types/index.js";

export async function main(ns: NS) {

    const allRootedServers = Object.entries(getAllHostnames(ns))
        .filter(([hostname, hasRootAccess]) => hasRootAccess && hostname !== "home")
        .map(([hostname, hasRootAccess]) => hostname);

    allRootedServers.forEach((hostname) => ns.killall(hostname));
    ns.killall("home");
}

function getAllHostnames(ns: NS) {
    const results = {} as Record<string, boolean>;

    const queue = ["home"];

    while (queue.length > 0) {
        const host = queue.shift()!;
        results[host] = ns.hasRootAccess(host);

        const neighbors = ns.scan(host);

        for (const hostname of neighbors) {
            if (!results[hostname]) {
                queue.push(hostname);
            }
        }
    }

    return results;
}