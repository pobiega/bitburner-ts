import { NS } from "../types/index.js";
import { explore } from "./controller.js";

const DEBUG = {
    contractFound: true
};

type Solver = (data: any) => any;

const solvers = {
    "Algorithmic Stock Trader III": algoStockTrader3
} as Record<string, Solver>;

export async function main(ns: NS) {
    const servers = await explore(ns);

    for (const server of Object.values(servers)) {
        for (const file of server.files) {
            if (file.endsWith(".cct")) {
                if (DEBUG.contractFound)
                    ns.tprint(`WARN: Contract ${file} located on ${server.host}.`);

                const contract = getContractDetails(ns, file, server.host);
                const solver = solvers[contract.contractType];

                if (solver !== undefined) {
                    const answer = solver(contract.data);

                    if (answer !== undefined) {
                        const reward = ns.codingcontract.attempt(answer, file, server.host, { returnReward: true });

                        ns.tprint(`INFO: ${file} on ${server.host} solved! Reward: ${reward}`);
                    } else {
                        ns.tprint(`WARN: Contract ${file} on ${server.host} with type "${contract.contractType}" could not be solved.`);
                    }
                } else {
                    ns.tprint(`WARN: No solver for ${contract.contractType}, skipping...`);
                }
            }
        }
    }
}

function getContractDetails(ns: NS, filename: string, host: string) {
    const contractType = ns.codingcontract.getContractType(filename, host);
    const data = ns.codingcontract.getData(filename, host);
    const triesRemaining = ns.codingcontract.getNumTriesRemaining(filename, host);

    return {
        host,
        filename,
        contractType,
        data,
        triesRemaining
    };
}

function algoStockTrader3(numbers: number[]) {
    let hold1: number = Number.MIN_SAFE_INTEGER;
    let hold2: number = Number.MIN_SAFE_INTEGER;
    let release1 = 0;
    let release2 = 0;

    for (const price of numbers) {
        release2 = Math.max(release2, hold2 + price);
        hold2 = Math.max(hold2, release1 - price);
        release1 = Math.max(release1, hold1 + price);
        hold1 = Math.max(hold1, price * -1);
    }

    return release2;
}