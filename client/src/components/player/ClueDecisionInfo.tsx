
import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD, PlayerSocket, SocketID, TriviaClueBonus, TriviaClueDecision } from "jparty-shared";
import { useContext, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { formatDollarValueString } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

function getNumRequiredVoters(numPlayers: number) {
    const halfNumPlayers = numPlayers / 2;
    return Math.max(Math.floor(halfNumPlayers), Math.floor(halfNumPlayers + 1));
}

interface ClueDecisionInfoProps {
    playerID: SocketID
}

export default function ClueDecisionInfo({ playerID }: ClueDecisionInfoProps) {
    const context = useContext(LayoutContext);

    const [isConfirmingVote, setIsConfirmingVote] = useState(false);

    const player = context.sessionPlayers[playerID];
    if (!player) {
        return null;
    }

    const info = player.clueDecisionInfo;
    if (!info) {
        return null;
    }

    // ruling info
    const rulingString = info.isReversal ? "reversed to" : "ruled";
    const decisionModifier = (info.decision === TriviaClueDecision.Incorrect) ? -1 : 1;
    const clueValueString = (info.decision !== TriviaClueDecision.NeedsMoreDetail) && ` for ${formatDollarValueString(info.clueValue * decisionModifier)}`;

    // voting info
    const numCurrentVoters = Object.keys(info.reversalVoterIDs).length;
    const numRequiredVoters = getNumRequiredVoters(Object.keys(context.sessionPlayers).length);

    const hasVotedToReverseDecision = info.reversalVoterIDs.includes(socket.id || "");
    const canVoteToReverseDecision = !hasVotedToReverseDecision && (info.decision !== TriviaClueDecision.NeedsMoreDetail) && !info.isReversal && (info.clue.bonus !== TriviaClueBonus.AllWager);

    // check to see if this responder is currently qualified for the leaderboard, and that this reversal would grant them enough money to disqualify them
    const wasRuledIncorrect = info.decision === TriviaClueDecision.Incorrect;
    const isResponderQualified = player.earnedReversalScore <= MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD;
    const needsConfirmation = wasRuledIncorrect && isResponderQualified && ((player.earnedReversalScore + info.clueValue) > MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD);

    const emitVoteToReverseDecision = () => {
        setIsConfirmingVote(false);

        // playerID is the socket ID of the player whose decision we want to reverse
        socket.emit(PlayerSocket.VoteToReverseDecision, playerID);
    }

    const handleVoteClick = () => {
        if (needsConfirmation) {
            setIsConfirmingVote(true);
        }
        else {
            emitVoteToReverseDecision();
        }
    }

    return (
        <Box key={player.clientID} className={"child-box"} padding={"0.5em"} margin={"0.5em"}>
            <Text wordBreak={"keep-all"}> "<i>{info.response}</i>" was {rulingString} {info.decision} {clueValueString}</Text>

            {canVoteToReverseDecision && !isConfirmingVote &&
                <Button onClick={handleVoteClick} size={"sm"} margin={"0.5em"}>vote to reverse</Button>}

            {canVoteToReverseDecision && isConfirmingVote && (
                <>
                    <Text fontSize={"0.9em"}>
                        are you sure? {player.name} has earned {formatDollarValueString(player.earnedReversalScore)} from decision reversals.
                        they will be disqualified from the leaderboard if this decision is reversed
                    </Text>
                    <Stack direction={"row"} justifyContent={"center"}>
                        <Button onClick={emitVoteToReverseDecision} size={"sm"} margin={"0.5em"} colorScheme={"red"}>yes, vote to reverse</Button>
                        <Button onClick={() => setIsConfirmingVote(false)} size={"sm"} margin={"0.5em"}>cancel</Button>
                    </Stack>
                </>
            )}

            {hasVotedToReverseDecision && <Text>{numCurrentVoters}/{numRequiredVoters} required votes to reverse</Text>}
        </Box>
    )
}