
import { Box, Heading } from "@chakra-ui/react";
import { SessionState, TriviaCategory, TriviaCategoryType, TriviaClue, TriviaClueBonus } from "jparty-shared";

import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/client-utils";

interface CategoryBoxProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue
}

export default function CategoryBox({ triviaCategory, triviaClue }: CategoryBoxProps) {
    const isWagerBonus = (triviaClue.bonus === TriviaClueBonus.Wager) || (triviaClue.bonus === TriviaClueBonus.AllWager);

    let clueValueString = "";
    if (!isWagerBonus) {
        clueValueString = `for ${formatDollarValue(triviaClue.value)}`;
    }

    return (
        <Box id={"category-box"} className={"box"} padding={"1em"} onClick={() => handleDebugCommand(DebugCommand.UpdateSessionState, SessionState.PromptClueSelection)}>
            <Heading size={"lg"} fontFamily={"clue"}>{triviaCategory.name.toUpperCase()} {clueValueString}</Heading>

            <Heading size={"sm"} fontFamily={"clue"}>
                type: {TriviaCategoryType[triviaCategory.settings.type]}{"\t-\t"}
                year: {triviaClue.year}
            </Heading>
        </Box>
    )
}