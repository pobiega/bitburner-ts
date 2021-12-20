import { NS } from "../types/index.js";

const settings = {
    shorts: false,
    long: {
        enabled: true,
        buyForecast: 0.6,
        dumpForecast: 0.51
    }
};

export async function main(ns: NS) {
    const symbols = ns.stock.getSymbols();

    ns.tail();
    ns.disableLog('ALL');

    while (true) {

        let stocks = symbols.map(symbol => getStockData(ns, symbol));

        naiveDumpingStrategy(ns, stocks);

        naiveBuyingStrategy(ns, stocks);

        stocks = symbols.map(symbol => getStockData(ns, symbol));

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

    let currentCash = ns.getServerMoneyAvailable("home");

    // ns.print(`Ticks: ${ticks++}`);
    for (const stock of trending) {
        const availableShares = stock.maxShares - stock.longShares;

        if (availableShares == 0) {
            continue;
        }

        const cost = ns.stock.getPurchaseCost(stock.symbol, availableShares, PositionType.Long);

        if (cost < currentCash) {
            ns.stock.buy(stock.symbol, stock.maxShares);
        } else {
            // TODO: maybe buy partial instead?
            ns.tprint(`Not enough cash to buy ${availableShares} ${stock.symbol} - would need ${ns.nFormat(cost, "0.0a")}`);
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
            ns.sprintf("%6s: %3s %5s %5s %10s %5s",
                stock.symbol,
                stock.forecast.toFixed(2),
                ns.nFormat(stock.askPrice, "0.0a"),
                ns.nFormat(stock.bidPrice, "0.0a"),
                stock.longShares.toString(),
                ns.nFormat(stock.longAvgPrice, "0.0a"))
        );
    }
}

function naiveDumpingStrategy(ns: NS, stocks: StockData[]) {
    const trending = stocks.filter(stock => stock.longShares > 0 && stock.forecast <= settings.long.dumpForecast);

    for (const stock of trending) {
        const sharePrice = ns.stock.sell(stock.symbol, stock.longShares);
        ns.tprint(`DUMPED ${stock.longShares} ${stock.symbol} for ${ns.nFormat(sharePrice * stock.longShares, "0.0a")}`);
    }
}