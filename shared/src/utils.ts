
export function getRandomNum(maxValue: number) {
    return Math.floor(Math.random() * maxValue);
}

export function getRandomChoice<Type>(a: Type[]) {
    if (!a.length) {
        throw new Error("getRandomChoice: empty input");
    }

    return a[Math.floor(Math.random() * a.length)];
}

export function getWeightedRandomNum(distribution: Object) {
    return parseInt(getWeightedRandomKey(distribution));
}

export function getWeightedRandomKey(distribution: Object) {
    const totalWeight = Object.values(distribution).reduce((a: any, b: any) => a + b, 0);

    let sum = 0;
    const r = Math.random();

    for (const [key, weight] of Object.entries(distribution)) {
        sum += (weight / totalWeight);

        if (r <= sum) {
            return key;
        }
    }

    throw new Error("getWeightedRandomKey: no valid output");
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

export function getTimeStamp() {
    const pad = (n: any, s = 2) => (`${new Array(s).fill(0)}${n}`).slice(-s);
    const d = new Date();

    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(d.getMilliseconds())}`;
}