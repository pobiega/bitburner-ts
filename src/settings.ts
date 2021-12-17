const settings = {
    privateServerPrefix: 'pserv-',
    homeRamReserved: 32,
    homeRamBigMode: 64,
    minSecurityLevelOffset: 2,
    maxMoneyMultiplayer: 0.9,
    minSecurityWeight: 100,
    mapRefreshInterval: 24 * 60 * 60 * 1000,
    maxWeakenTime: 30 * 60,
    keys: {
        serverMap: 'BB_SERVER_MAP',
        hackTarget: 'BB_HACK_TARGET',
        action: 'BB_ACTION',
    },
    changes: {
        hack: 0.002,
        grow: 0.004,
        weaken: 0.05,
    },
    scripts: {
        "crawler": "crawler.js",
        "core": "core.js",
        "hack": "hack.js",
        "grow": "grow.js",
        "weaken": "weaken.js",
    },
    hackScripts: ["hack.js", "weaken.js", "grow.js"],
};

export default settings;