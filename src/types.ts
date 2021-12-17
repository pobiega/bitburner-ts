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
}