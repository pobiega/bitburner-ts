import { NS } from "../types/index.js";
import { explore } from "./controller.js";

export async function main(ns: NS) {
    const servers = await explore(ns);

    for (const server of Object.values(servers)) {
        for (const file of server.files) {
            if (file.endsWith(".cct")) {
                ns.tprint(`WARN: Contract ${file} located on ${server.host}.`);
            }
        }
    }
}