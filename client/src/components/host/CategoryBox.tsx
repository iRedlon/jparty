
import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading } from "@chakra-ui/react";
import { SessionState, TriviaCategory, TriviaCategoryType, TriviaClue, TriviaClueBonus } from "jparty-shared";
import { useContext } from "react";

interface CategoryBoxProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue,
    wager?: number,
    minWager?: number,
    maxWager?: number
}

export default function CategoryBox({ triviaCategory, triviaClue, wager, minWager, maxWager }: CategoryBoxProps) {
    const context = useContext(LayoutContext);

    const isWagerBonus = triviaClue.bonus === TriviaClueBonus.Wager;
    const isAllWagerBonus = triviaClue.bonus === TriviaClueBonus.AllWager;
    const showWagerLimits = isWagerBonus && (context.sessionState === SessionState.WagerResponse);

    let clueValueString = "";

    if (showWagerLimits && (minWager !== undefined) && (maxWager !== undefined)) {
        clueValueString = `for $(${minWager} - ${maxWager})`;
    }
    else if (!isAllWagerBonus) {
        let clueValue = (isWagerBonus && wager !== undefined) ? wager : triviaClue.value;
        clueValueString = `for ${formatDollarValue(clueValue)}`;
    }

    return (
        <Box id={"category-box"} className={"box"} padding={"1em"} onClick={() => handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.ClueSelection)}>
            <Heading size={"lg"} fontFamily={"clue"}>{triviaCategory.name.toUpperCase()} {clueValueString}</Heading>

            <Heading size={"sm"} fontFamily={"clue"}>
                type: {TriviaCategoryType[triviaCategory.settings.type]}{"\t-\t"}
                year: {triviaClue.year}
            </Heading>
        </Box>
    )
}