
import "../../style/components/HostBoard.css";

import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { TriviaRound } from "jparty-shared";
import { useContext } from "react";

interface HostBoardProps {
    triviaRound: TriviaRound
}

export default function HostBoard({ triviaRound }: HostBoardProps) {
    const context = useContext(LayoutContext);

    const numCategories = triviaRound.settings.numCategories;
    const numClues = triviaRound.settings.numClues;

    // adjust for the additional panel at the top of each column that displays the category name
    const numPanels = numClues + 1;
    const boardPanelHeight = `${100 / numPanels}vh`;
    const boardPanelWidth = `${100 / numCategories}vw`;

    // CapitalCase cause this is just a mini-sized functional component. should this go into its own file? the jury is out...
    const BoardPanel = (content: any, categoryIndex: number, panelIndex: number) => {
        // give every other category column a different class so they can be animated differently
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
    );
}