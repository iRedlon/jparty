
import { Box, Button, Text } from "@chakra-ui/react";
import { MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD, Player, PlayerSocket, SocketID, TriviaClueDecision, TriviaClueDecisionInfo } from "jparty-shared";
import { useContext } from "react";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { socket } from "../../misc/socket";

function getNumRequiredVoters(numPlayers: number) {
    const halfNumPlayers = numPlayers / 2;
    return Math.max(Math.floor(halfNumPlayers), Math.floor(halfNumPlayers + 1));
}

function emitVoteToReverseDecision(responderID: SocketID, responder: Player, clueDecisionInfo: TriviaClueDecisionInfo) {
    const wasRuledIncorrect = clueDecisionInfo.decision === TriviaClueDecision.Incorrect;
    const isResponderQualified = responder.earnedReversalScore <= MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD;

    // check to see if this responder is currently qualified, and that this reversal would grant them enough money to disqualify them
    const needsConfirmation = wasRuledIncorrect && isResponderQualified && ((responder.earnedReversalScore + clueDecisionInfo.clueValue) > MAX_EARNED_REVERSAL_SCORE_FOR_LEADERBOARD);

    if (needsConfirmation && !confirm(`Are you sure? ${responder.name.toUpperCase()} has earned ${formatDollarValue(responder.earnedReversalScore)} from decision reversals. They will be disqualified from the leaderboard if this decision is reversed.`)) {
        return;
    }

    // responderID is the socket ID of the player whose decision we want to reverse
    socket.emit(PlayerSocket.VoteToReverseDecision, responderID);
}

interface ClueDecisionInfoProps {
    playerID: SocketID
}

export default function ClueDecisionInfo({ playerID }: ClueDecisionInfoProps) {
    const context = useContext(LayoutContext);

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
    const clueValueString = (info.decision !== TriviaClueDecision.NeedsMoreDetail) && ` for ${formatDollarValue(info.clueValue * decisionModifier)}`;

    // voting info
    const numCurrentVoters = Object.keys(info.reversalVoterIDs).length;
    const numRequiredVoters = getNumRequiredVoters(Object.keys(context.sessionPlayers).length);

    const hasVotedToReverseDecision = info.reversalVoterIDs.includes(socket.id || "");
    const canVoteToReverseDecision = !hasVotedToReverseDecision && (info.decision !== TriviaClueDecision.NeedsMoreDetail) && !info.isReversal;

    return (
        <Box key={player.clientID} className={"child-box"} padding={"0.5em"} margin={"0.5em"}>
            <Text wordBreak={"keep-all"}> "<i>{info.response}</i>" was {rulingString} {info.decision} {clueValueString}</Text>
            {canVoteToReverseDecision && <Button onClick={() => emitVoteToReverseDecision(playerID, player, info)} size={"sm"} margin={"0.5em"}>vote to reverse</Button>}
            {hasVotedToReverseDecision && <Text>{numCurrentVoters}/{numRequiredVoters} required votes to reverse</Text>}
        </Box>
    )
}