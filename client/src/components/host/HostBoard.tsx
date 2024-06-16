
import { Box, Button, Heading, SimpleGrid } from "@chakra-ui/react";
import { HostServerSocket, SessionState, TriviaRound } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { socket } from "../../misc/socket";

import "../../style/components/HostBoard.css";
import { addMockSocketEventHandler, removeMockSocketEventHandler } from "../../misc/mock-socket";

function getBoardPanelFontSize(isDollarValue: boolean, content: string) {
    if (isDollarValue) {
        return "4.5em";
    }

    if (content.length > 25) {
        return "1.75em";
    }

    return "2.25em";
}

interface HostBoardProps {
    triviaRound: TriviaRound
}

export default function HostBoard({ triviaRound }: HostBoardProps) {
    const context = useContext(LayoutContext);
    const [readingCategoryIndex, setReadingCategoryIndex] = useState(-1);

    useEffect(() => {
        socket.on(HostServerSocket.UpdateReadingCategoryIndex, handleUpdateReadingCategoryIndex);

        addMockSocketEventHandler(HostServerSocket.UpdateReadingCategoryIndex, handleUpdateReadingCategoryIndex);

        return () => {
            socket.off(HostServerSocket.UpdateReadingCategoryIndex, handleUpdateReadingCategoryIndex);

            removeMockSocketEventHandler(HostServerSocket.UpdateReadingCategoryIndex, handleUpdateReadingCategoryIndex);
        }
    }, []);

    const handleUpdateReadingCategoryIndex = (readingCategoryIndex: number) => {
        setReadingCategoryIndex(readingCategoryIndex);
    }

    const onImFeelingLucky = () => {
        if (!context.debugMode) {
            return;
        }

        handleDebugCommand(DebugCommand.UpdateReadingCategoryIndex, readingCategoryIndex + 1);
    }

    const readingCategoryNames = context.sessionState === SessionState.ReadingCategoryNames;
    const numCategories = triviaRound.settings.numCategories;
    const numClues = triviaRound.settings.numClues;

    // adjust for the additional panel at the top of each column that displays the category name
    const numPanels = numClues + 1;
    const boardPanelHeight = `${100 / numPanels}vh`;
    const boardPanelWidth = `${100 / numCategories}vw`;

    const BoardPanel = (content: any, categoryIndex: number, panelIndex: number) => {
        // give every other category column a different class so they can be animated differently
        const isEvenCategoryIndex = (categoryIndex % 2) === 0;

        const isVisible = readingCategoryNames ? (readingCategoryIndex >= categoryIndex) : true;
        const className = isVisible ? `board-panel-wrapper ${isEvenCategoryIndex ? "even" : "odd"}` : "";

        return (
            <Box
                visibility={isVisible ? "visible" : "hidden"}
                key={`category-${categoryIndex}-${panelIndex}`} className={className}
                height={boardPanelHeight} width={boardPanelWidth}>

                <Box onClick={() => handleDebugCommand(DebugCommand.SelectClue, categoryIndex, panelIndex - 1)} className={"board-panel box"}>
                    <Heading fontFamily={"board"} fontSize={getBoardPanelFontSize(panelIndex > 0, content)} fontWeight={0}>{content}</Heading>
                </Box>
            </Box>
        )
    }

    return (
        <>
            {/* {
                context.debugMode && (
                    <Button onClick={onImFeelingLucky} _hover={{ opacity: 1 }} colorScheme={"green"}
                        position={"fixed"} top={"4em"} right={"1em"}>

                        I'm Feeling Lucky
                    </Button>
                )
            } */}

            <SimpleGrid columns={numCategories}>
                {[...Array(numPanels)].map((_, panelIndex) => {
                    return (
                        [...Array(numCategories)].map((_, categoryIndex) => {
                            const triviaCategory = triviaRound.categories[categoryIndex];

                            // the first panel is the top of this category's column, which displays the category name
                            if (panelIndex === 0) {
                                return BoardPanel(triviaCategory.completed ? "" : triviaCategory.name, categoryIndex, panelIndex);
                            }

                            const triviaClue = triviaCategory.clues[panelIndex - 1];

                            return BoardPanel(triviaClue.completed ? "" : formatDollarValue(triviaClue.value), categoryIndex, panelIndex);
                        })
                    )
                })}
            </SimpleGrid>
        </>
    );
}