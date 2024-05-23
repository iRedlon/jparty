
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, Input, InputGroup, InputLeftAddon, Text } from "@chakra-ui/react";
import { PlayerResponseType, SessionState, TriviaCategory, TriviaCategoryType, TriviaClue, TriviaClueDifficulty } from "jparty-shared";
import { useContext } from "react";

interface HostWagerProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function HostWager({ triviaCategory, triviaClue, numSubmittedResponders, numResponders }: HostWagerProps) {
    const context = useContext(LayoutContext);

    const spotlightResponder = context.spotlightResponderID && context.sessionPlayers[context.spotlightResponderID];

    return (
        <Box padding={"1em"} backgroundColor={"white"} outline={"black solid 3px"} boxShadow={"10px 10px black"} fontSize={"3em"}>
            <Heading size={"md"}>wagering on...</Heading>

            <Heading size={"lg"}>"{triviaCategory.name}" from {triviaClue.year}</Heading>

            {
                context.debugMode && (
                    <Heading size={"sm"}>
                        type: {TriviaCategoryType[triviaCategory.settings.type]}{"\t-\t"}
                        difficulty: {TriviaClueDifficulty[triviaClue.difficulty]}
                    </Heading>
                )
            }

            {
                !triviaClue.isTossupClue() && (context.sessionState === SessionState.WagerResponse) && (
                    <Text justifyContent={"center"}>
                        {numSubmittedResponders}/{numResponders} wagers submitted
                    </Text>
                )
            }

            {
                spotlightResponder && (
                    <InputGroup size={"lg"} justifyContent={"center"} margin={"0.5em"}>
                        <InputLeftAddon>{spotlightResponder.name}</InputLeftAddon>
                        <Input isReadOnly={true} value={formatDollarValue(spotlightResponder.responses[PlayerResponseType.Wager])} />
                    </InputGroup>
                )
            }

            {
                spotlightResponder && (
                    <Heading size={"md"}>
                        {spotlightResponder.name} may wager between {formatDollarValue(spotlightResponder.minWager)} and {formatDollarValue(spotlightResponder.maxWager)}
                    </Heading>
                )
            }
        </Box>
    );
}