
import "../../style/components/HostBoard.css";

import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useContext } from "react";

export default function HostBoard() {
    const context = useContext(LayoutContext);

    if (!context.triviaRound) {
        throw new Error("HostClue: missing trivia round");
    }

    const numCategories = context.triviaRound.settings.numCategories;
    const numClues = context.triviaRound.settings.numClues;

    // adjust for the additional panel at the top of each column that displays the category name
    const numPanels = numClues + 1;
    const boardPanelHeight = `${100 / numPanels}vh`;
    const boardPanelWidth = `${100 / numCategories}vw`;

    const BoardPanel = (content: any, categoryIndex: number, panelIndex: number) => {
        const isEvenCategoryIndex = (categoryIndex % 2) === 0;

        return (
            <Box key={`category-${categoryIndex}-${panelIndex}`} className={`board-panel-wrapper ${isEvenCategoryIndex ? "even" : "odd"}`}
                height={boardPanelHeight} width={boardPanelWidth}>

                <Box onClick={() => handleDebugCommand(DebugCommand.SelectClue, categoryIndex, panelIndex - 1)} className={"board-panel box"}>
                    <Heading fontFamily={"board"} size={panelIndex > 0 ? "4xl" : "xl"} fontWeight={0}>{content}</Heading>
                </Box>
            </Box>
        )
    }

    return (
        <SimpleGrid columns={numCategories}>
            {[...Array(numPanels)].map((_, panelIndex) => {
                return (
                    [...Array(numCategories)].map((_, categoryIndex) => {
                        if (!context.triviaRound) {
                            throw new Error("HostClue: missing trivia round");
                        }

                        const triviaCategory = context.triviaRound.categories[categoryIndex];

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
    );
}