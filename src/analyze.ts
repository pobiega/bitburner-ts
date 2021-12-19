import { NS } from "../types/index.js";


export async function main(ns: NS) {
    const args = ns.flags([["help", false]]);
    const serverArg = ns.args[0];
    if (args.help || !serverArg) {
        ns.tprint("This script does a more detailed analysis of a server.");
        ns.tprint(`Usage: run ${ns.getScriptName()} SERVER`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} n00dles`);
        return;
    }

    const server = serverArg.toString();

    const ram = ns.getServerUsedRam(server);
    const maxRam = ns.getServerMaxRam(server);
    const money = ns.getServerMoneyAvailable(server);
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    const sec = ns.getServerSecurityLevel(server);
    const rooted = ns.hasRootAccess(server);
    const moneyRatio = maxMoney / money;
    const serverHackLevel = ns.getServerRequiredHackingLevel(server);
    const playerHackLevel = ns.getHackingLevel();

    ns.tprint(`
${server}:
    Rooted     : ${rooted}
    RAM        : ${ram} / ${maxRam} (${(ram / maxRam) * 100}%)
    $          : ${ns.nFormat(money, "$0.000a")} / ${ns.nFormat(maxMoney, "$0.000a")} (${(money / maxMoney * 100).toFixed(2)}%)
    security   : ${minSec.toFixed(2)} / ${sec.toFixed(2)}
    growth     : ${ns.getServerGrowth(server)}
    weaken     : ${Math.ceil((sec - minSec) * 20)} threads
    hack time  : ${ns.tFormat(ns.getHackTime(server))}
    grow time  : ${ns.tFormat(ns.getGrowTime(server))}
    weaken time: ${ns.tFormat(ns.getWeakenTime(server))}
    grow x2    : ${Math.ceil(ns.growthAnalyze(server, 2)).toFixed(2)} threads
    grow 100%  : ${moneyRatio > 0 ? Math.ceil(ns.growthAnalyze(server, moneyRatio)) : 'N/A'} threads
    hack 10%   : ${Math.ceil(.10 / ns.hackAnalyze(server)).toFixed(2)} threads
    hack 25%   : ${Math.ceil(.25 / ns.hackAnalyze(server)).toFixed(2)} threads
    hack 50%   : ${Math.ceil(.50 / ns.hackAnalyze(server)).toFixed(2)} threads
    hackChance : ${(ns.hackAnalyzeChance(server) * 100).toFixed(2)}%
    hackLvl    : ${playerHackLevel} / ${serverHackLevel}
`);
}

export function autocomplete(data: any, args: any) {
    return [...data.servers];
}