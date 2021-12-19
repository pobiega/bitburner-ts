export interface Server {
    host: string;
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
    minSecurityLevel: number;
    maxRam: number;
    hasRootAccess: boolean;
    files: string[];
    availableCycles: number;
}

export interface ActionTimes {
    hack: number;
    grow: number;
    weaken: number;
    growDelay: number;
    hackDelay: number;
    additionalWeakenDelay: number;
}

export interface CycleCount {
    weaken: number;
    grow: number;
    additionalWeakens: number;
    total: number;
}

export interface HWGWBatch {
    hackCycles: number;
    weakenForHack: number;
    growCycles: number;
    weakenForGrow: number;
    totalCycles: number;
};