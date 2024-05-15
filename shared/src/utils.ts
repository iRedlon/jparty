
export function getRandomNum(maxValue: number) {
    return Math.floor(Math.random() * maxValue);
}

export function getRandomChoice<Type>(a: Type[]) {
    if (!a.length) {
        throw new Error("getRandomChoice: empty input");
    }

    return a[Math.floor(Math.random() * a.length)];
}

// i.e. distribution = { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25 }
export function getWeightedRandomNum(distribution: Record<number, number>) {
    let sum = 0;
    const r = Math.random();

    for (const [value, probability] of Object.entries(distribution)) {
        sum += probability;

        if (r <= sum) {
            return parseInt(value);
        }
    }

    return 0;
}

export function getEnumKeys(e: Object) {
    return Object.keys(e).filter(k => !isNaN(parseInt(k)));
}

export function getEnumSize(e: Object) {
    return getEnumKeys(e).length;
}

export function getDateStamp() {
    const pad = (n: any, s = 2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();

    return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getTimestamp() {
    const pad = (n: any, s = 2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();

    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(d.getMilliseconds())}`;
}