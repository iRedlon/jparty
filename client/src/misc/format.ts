
export function formatDollarValue(value: number) {
    let sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(value)}`;
}