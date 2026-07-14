
interface FormattedDollarValueProps {
    value: number
    signOffsetY?: string
}

export default function FormattedDollarValue({ value, signOffsetY = "-0%" }: FormattedDollarValueProps) {
    return (
        <>
            {value < 0 && "-"}<span className={"dollar-sign"} style={{ transform: `translateY(${signOffsetY})` }}>$</span>{Math.abs(value)}
        </>
    );
}
