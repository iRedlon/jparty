
import { LayoutContext } from "../common/Layout";
import { socket } from "../../misc/socket";

import { Box, Button, Heading, Select, Stack } from "@chakra-ui/react";
import { PlayerSocket, TriviaCategory, TriviaClue } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

interface PlayerClueSelectionProps {
    renderComponent: boolean
}

export default function PlayerClueSelection({ renderComponent }: PlayerClueSelectionProps) {
    const context = useContext(LayoutContext);
    const [categoryIndex, setCategoryIndex] = useState(-1);
    const [clueIndex, setClueIndex] = useState(-1);

    useEffect(() => {
        setClueIndex(-1);
    }, [categoryIndex]);

    const emitSelectClue = () => {
        socket.emit(PlayerSocket.SelectClue, categoryIndex, clueIndex);
    }

    const categorySelect = (
        <Select placeholder={"category"} value={categoryIndex} onChange={(e) => setCategoryIndex(parseInt(e.target.value))}>
            {context.triviaRound?.categories.map((category: TriviaCategory, index: number) => {
                if (!category.completed) {
                    return <option key={index} value={index}>{category.name}</option>;
                }
            })}
        </Select>
    );

    const clueSelect = categoryIndex >= 0 && (
        <Select placeholder={"dollar value"} value={clueIndex} onChange={(e) => setClueIndex(parseInt(e.target.value))}>
            {context.triviaRound?.categories[categoryIndex].clues.map((clue: TriviaClue, index: number) => {
                if (!clue.completed) {
                    return <option key={index} value={index}>${clue.value}</option>;
                }
            })}
        </Select>
    );

    const validSelection = categoryIndex >= 0 && clueIndex >= 0;

    return (
        <Box display={renderComponent ? "auto" : "none"}>
            <Heading size={"md"}>select a category and dollar value</Heading>
            <Stack direction={"column"}>
                {categorySelect}
                {clueSelect}
                <Button colorScheme={"blue"} marginTop={"1em"} isDisabled={!validSelection} onClick={emitSelectClue}>select clue</Button>
            </Stack>
        </Box>
    );
}