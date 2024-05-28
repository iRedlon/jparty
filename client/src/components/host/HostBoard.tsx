
import { LayoutContext } from "../common/Layout";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { formatDollarValue } from "../../misc/format";

import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useContext } from "react";

export default function HostBoard() {
    const context = useContext(LayoutContext);

    // panel index isn't equivalent to clue index. it's off by 1 because of the top panel displaying category name
    const boardPanel = (content: any, categoryIndex: number, panelIndex: number) => {
        if (!context.triviaRound) {
            return <></>;
        }

        const panelHeight = `${100 / (context.triviaRound.settings.numClues + 1)}vh`;
        const panelWidth = `${100 / context.triviaRound.settings.numCategories}vw`;
        const isDollarValue = panelIndex > 0;

        return (
            <Box
                key={`category-${categoryIndex}-${panelIndex}`}
                display={"flex"} justifyContent={"center"} alignItems={"center"}
                height={panelHeight} width={panelWidth}>

                <Box onClick={() => handleDebugCommand(DebugCommand.SelectClue, categoryIndex, panelIndex - 1)}
                    display={"flex"} justifyContent={"center"} alignItems={"center"} height={"80%"} width={"80%"}
                    backgroundColor={"white"} boxShadow={"7px 7px black"} padding={"0.5em"}>
                    {
                        isDollarValue ? (
                            <Heading fontFamily={"board-panel"} size={"4xl"} fontWeight={0}>{content}</Heading>
                        ) : (
                            <Heading fontFamily={"board-panel"} size={"xl"}>{content}</Heading>
                        )
                    }

                </Box>
            </Box>
        )
    }

    const numCategories = context.triviaRound?.settings.numCategories || 0;
    const numClues = context.triviaRound?.settings.numClues || 0;
    const numPanels = numClues + 1;

    return (
        <SimpleGrid columns={numCategories}>
            {[...Array(numPanels)].map((_, panelIndex) => {
                return (
                    [...Array(numCategories)].map((_, categoryIndex) => {
                        if (!context.triviaRound) {
                            return <></>;
                        }

                        const triviaCategory = context.triviaRound.categories[categoryIndex];

                        // the first panel is the top of this category's column, which displays the category name
                        if (panelIndex === 0) {
                            const panelContent = triviaCategory.completed ? "" : triviaCategory.name;
                            return boardPanel(panelContent, categoryIndex, panelIndex);
                        }

                        const clueIndex = panelIndex - 1;
                        const triviaClue = triviaCategory.clues[clueIndex];
                        const panelContent = triviaClue.completed ? "" : formatDollarValue(triviaClue.value);

                        return boardPanel(panelContent, categoryIndex, panelIndex);
                    })
                )
            })}
        </SimpleGrid>
    );
}