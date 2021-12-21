import { NS } from "../types/index.js";
import { explore } from "./controller.js";

const DEBUG = {
    contractFound: false
};

type Solver = (data: any) => any;

const solvers = {
    "Algorithmic Stock Trader I": algoStockTrader1,
    "Algorithmic Stock Trader III": algoStockTrader3,
    //"Spiralize Matrix": spiralizeMatrix,
    "Minimum Path Sum in a Triangle": minPathSumTriangle,
    "Unique Paths in a Grid II": uniquePathsInGrid2,
    "Find All Valid Math Expressions": validMathExpressions
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
                        ns.tprint(`ERROR: Contract ${file} on ${server.host} with type "${contract.contractType}" could not be solved.`);
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

function algoStockTrader1(data: number[]) {
    let maxCur = 0;
    let maxSoFar = 0;
    for (let i = 1; i < data.length; ++i) {
      maxCur = Math.max(0, (maxCur += data[i] - data[i - 1]));
      maxSoFar = Math.max(maxCur, maxSoFar);
    }

    return maxSoFar.toString();
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

function spiralizeMatrix(data: any) {
    return 0;
}

function minPathSumTriangle(data: number[][]) {
    const n: number = data.length;
    const dp: number[] = data[n - 1].slice();
    for (let i = n - 2; i > -1; --i) {
        for (let j = 0; j < data[i].length; ++j) {
            dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j];
        }
    }

    return dp[0];
}

function uniquePathsInGrid2(data: number[][]) {
    const obstacleGrid: number[][] = [];
    obstacleGrid.length = data.length;
    for (let i = 0; i < obstacleGrid.length; ++i) {
        obstacleGrid[i] = data[i].slice();
    }

    for (let i = 0; i < obstacleGrid.length; i++) {
        for (let j = 0; j < obstacleGrid[0].length; j++) {
            if (obstacleGrid[i][j] == 1) {
                obstacleGrid[i][j] = 0;
            } else if (i == 0 && j == 0) {
                obstacleGrid[0][0] = 1;
            } else {
                obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0);
            }
        }
    }

    return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1];
}


function validMathExpressions(data: any[]) {

    const num: string = data[0];
    const target: number = data[1];

    function helper(
        res: string[],
        path: string,
        num: string,
        target: number,
        pos: number,
        evaluated: number,
        multed: number,
    ): void {
        if (pos === num.length) {
            if (target === evaluated) {
                res.push(path);
            }
            return;
        }

        for (let i = pos; i < num.length; ++i) {
            if (i != pos && num[pos] == "0") {
                break;
            }
            const cur = parseInt(num.substring(pos, i + 1));

            if (pos === 0) {
                helper(res, path + cur, num, target, i + 1, cur, cur);
            } else {
                helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
                helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
                helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
            }
        }
    }

    if (num == null || num.length == 0) {
        return "";
    }

    const result: string[] = [];
    helper(result, "", num, target, 0, 0, 0);

    return result.join(",");
}
