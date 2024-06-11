
import { Box } from "@chakra-ui/react";
import { PlayerResponseType, TriviaCategory, TriviaClue } from "jparty-shared";
import { useContext } from "react";

import CategoryBox from "./CategoryBox";
import SpotlightResponder from "./ResponderInfo";
import { LayoutContext } from "../common/Layout";

import "../../style/components/HostWager.css";

interface HostWagerProps {
    triviaCategory: TriviaCategory,
    triviaClue: TriviaClue,
    numSubmittedResponders?: number,
    numResponders?: number
}

export default function HostWager({ triviaCategory, triviaClue, numSubmittedResponders, numResponders }: HostWagerProps) {
    const context = useContext(LayoutContext);

    const spotlightResponder = context.spotlightResponderID ? context.sessionPlayers[context.spotlightResponderID] : undefined;

    return (
        <>
            <CategoryBox triviaCategory={triviaCategory} triviaClue={triviaClue} />
            <Box margin={"1em"} />

            <SpotlightResponder triviaClue={triviaClue} responder={spotlightResponder} responseType={PlayerResponseType.Wager}
                numSubmittedResponders={numSubmittedResponders} numResponders={numResponders} />
        </>
    );
}