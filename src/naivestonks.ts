import { NS } from "../types/index.js";

const settings = {
    reserveCash: 1000000, // 1 million
    shorts: false,
    long: {
        enabled: true,
        buyForecast: 0.55,
        dumpForecast: 0.50
    }
};

const DEBUG = false;

export async function main(ns: NS) {
    const symbols = ns.stock.getSymbols();

    const dumpMode = ns.args[0] == "dump";

    if(dumpMode) {
        ns.tprint("INFO: Dumping all stocks...");
        let stocks = symbols.map(symbol => getStockData(ns, symbol));
        dumpAllStocks(ns, stocks);
        return;
    }

    ns.tail();
    ns.disableLog('ALL');

    while (true) {

        let stocks = symbols.map(symbol => getStockData(ns, symbol));

        naiveDumpingStrategy(ns, stocks);
        naiveBuyingStrategy(ns, stocks);

        stocks = symbols.map(symbol => getStockData(ns, symbol)).sort((a, b) => b.forecast - a.forecast);

        printStockOverview(ns, stocks);

        await ns.asleep(6 * 1000);
    }
}

enum PositionType {
    Long = "Long",
    Short = "Short"
}

interface StockData {
    symbol: string;
    forecast: number;
    askPrice: number;
    bidPrice: number;
    volatility: number;
    maxShares: number;
    longShares: number
    longAvgPrice: number;
};

function naiveBuyingStrategy(ns: NS, stocks: StockData[]) {
    const trending = stocks.filter(stock => stock.forecast > settings.long.buyForecast);

    for (const stock of trending) {
        const currentCash = ns.getServerMoneyAvailable("home") - settings.reserveCash;
        const availableShares = stock.maxShares - stock.longShares;

        if (availableShares == 0) {
            continue;
        }

        const cost = ns.stock.getPurchaseCost(stock.symbol, availableShares, PositionType.Long);

        if (cost < currentCash) {
            const sharePrice = ns.stock.buy(stock.symbol, availableShares);
            if (!sharePrice) {
                ns.tprint(`ERROR: Failed to buy ${ns.nFormat(availableShares, "0.0a")} ${stock.symbol} shares. Calculated cost was ${ns.nFormat(cost, "$0.0a")}, you have ${ns.nFormat(currentCash, "$0.0a")}`);
            }
        } else {
            if (DEBUG)
                ns.tprint(`ERROR: Not enough cash to buy ${ns.nFormat(availableShares, "0.0a")} ${stock.symbol} - would need ${ns.nFormat(cost, "$0.0a")}`);
        }
    }
}

function getStockData(ns: NS, symbol: string) {
    const forecast = ns.stock.getForecast(symbol);
    const askPrice = ns.stock.getAskPrice(symbol);
    const bidPrice = ns.stock.getBidPrice(symbol);
    const volatility = ns.stock.getVolatility(symbol);
    const maxShares = ns.stock.getMaxShares(symbol);
    const [longShares, longAvgPrice] = ns.stock.getPosition(symbol);

    return {
        symbol,
        forecast,
        askPrice,
        bidPrice,
        volatility,
        maxShares,
        longShares,
        longAvgPrice
    };
}

function printStockOverview(ns: NS, stocks: StockData[]) {
    ns.clearLog();
    for (const stock of stocks) {
        ns.print(
            ns.sprintf("%6s: %4s %7s %7s",
                stock.symbol,
                stock.forecast.toFixed(2),
                ns.nFormat(stock.longShares, "0.0a"),
                ns.nFormat(stock.longAvgPrice, "$0.0a"))
        );
    }
}

function naiveDumpingStrategy(ns: NS, stocks: StockData[]) {
    const trending = stocks.filter(stock => stock.longShares > 0 && stock.forecast <= settings.long.dumpForecast);

    for (const stock of trending) {
        const sharePrice = ns.stock.sell(stock.symbol, stock.longShares);
        const sellTotal = sharePrice * stock.longShares;
        const totalBuyAvg = stock.longAvgPrice * stock.longShares;
        const profit = sellTotal - totalBuyAvg;
        ns.tprint(`INFO: Dumped ${ns.nFormat(stock.longShares, "0.0a")} ${stock.symbol}, making a profit of ${ns.nFormat(profit, "$0.0a")}`);
    }
}

function dumpAllStocks(ns: NS, stocks: StockData[]) {
    const held = stocks.filter(stock => stock.longShares > 0);

    for (const stock of held) {
        const sharePrice = ns.stock.sell(stock.symbol, stock.longShares);
        const sellTotal = sharePrice * stock.longShares;
        const totalBuyAvg = stock.longAvgPrice * stock.longShares;
        const profit = sellTotal - totalBuyAvg;
        ns.tprint(`INFO: Dumped ${ns.nFormat(stock.longShares, "0.0a")} ${stock.symbol}, making a profit of ${ns.nFormat(profit, "$0.0a")}`);
    }
}
