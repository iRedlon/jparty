
import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/format";
import { socket } from "../../misc/socket";

import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";
import { getSortedSessionPlayerIDs, PlayerSocket, SocketID, TriviaClueDecision } from "jparty-shared";
import { useContext } from "react";

export default function PlayerScoreboard() {
    const context = useContext(LayoutContext);

    // responderID is the socket ID of the player whose decision we want to reverse
    const emitVoteToReverseDecision = (responderID: SocketID) => {
        socket.emit(PlayerSocket.VoteToReverseDecision, responderID);
    }

    const getNumRequiredVoters = () => {
        const numPlayers = Object.keys(context.sessionPlayers).length;
        const halfNumPlayers = numPlayers / 2;

        return Math.max(Math.floor(halfNumPlayers), Math.floor(halfNumPlayers + 1));;
    }

    // displays the most recent clue decision of the given player including a button that this client can use to vote to reverse that decision
    const getClueDecisionInfo = (playerID: SocketID) => {
        const player = context.sessionPlayers[playerID];

        if (!player || !player.clueDecisionInfo) {
            return;
        }

        const info = player.clueDecisionInfo;
        const triviaCategory = context.triviaRound?.categories[context.categoryIndex];
        const triviaClue = triviaCategory?.clues[context.clueIndex];

        if (info.clue.id !== triviaClue?.id) {
            return;
        }

        // ruling info
        const rulingString = info.isReversal ? "reversed to" : "ruled";
        const decisionModifier = (info.decision === TriviaClueDecision.Incorrect) ? -1 : 1;
        const clueValueString = (info.decision !== TriviaClueDecision.NeedsMoreDetail) && ` for ${formatDollarValue(info.clueValue * decisionModifier)}`;

        // voting info
        const numCurrentVoters = Object.keys(info.reversalVoterIDs).length;
        const numRequiredVoters = getNumRequiredVoters();

        const hasVotedToReverseDecision = info.reversalVoterIDs.includes(socket.id || "");
        const canVoteToReverseDecision = !hasVotedToReverseDecision && (info.decision !== TriviaClueDecision.NeedsMoreDetail) && !info.isReversal;

        return (
            <>
                <Text wordBreak={"keep-all"}><b>{player.name}:</b> "{info.response}" was {rulingString} {info.decision} {clueValueString}</Text>
                {canVoteToReverseDecision && <Button onClick={() => emitVoteToReverseDecision(playerID)} size={"sm"} margin={"0.5em"}>vote to reverse?</Button>}
                {hasVotedToReverseDecision && <Text>{numCurrentVoters}/{numRequiredVoters} required votes to reverse</Text>}
            </>
        )
    }

    const clueDecisionInfoArray = getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID) => {
        const clueDecisionInfo = getClueDecisionInfo(playerID);

        if (!clueDecisionInfo) {
            return;
        }

        return (
            <Box outline={"black solid 3px"} boxShadow={"5px 5px black"} padding={"0.5em"} margin={"0.5em"} key={playerID}>
                {clueDecisionInfo}
            </Box>
        );
    }).filter(element => !!element);

    return (
        <>
            <Heading size={"md"}>scoreboard</Heading>

            <Stack direction={"column"} gap={0}>
                {getSortedSessionPlayerIDs(context.sessionPlayers).map((playerID: SocketID, index: number) => {
                    const player = context.sessionPlayers[playerID];

                    return (
                        <Box outline={"black solid 3px"} boxShadow={"5px 5px black"} padding={"0.5em"} margin={"0.5em"} key={playerID}>
                            <Heading size={"sm"}>{index + 1}. {player.name} ({formatDollarValue(player.score)})</Heading>
                        </Box>
                    );
                })}
            </Stack>

            {
                clueDecisionInfoArray.length ? (
                    <>
                        <Box margin={"1em"} />

                        <Heading size={"md"}>past decisions</Heading>

                        <Stack direction={"column"} gap={0}>
                            {clueDecisionInfoArray}
                        </Stack>
                    </>
                ) : <></>
            }
        </>
    );
}