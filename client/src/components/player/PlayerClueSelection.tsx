
import { Box, Heading, Stack } from "@chakra-ui/react";
import { PlayerSocket, TriviaClue } from "jparty-shared";
import { useContext, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

import FormattedDollarValue from "../common/FormattedDollarValue";
import { LayoutContext } from "../common/Layout";
import { socket } from "../../misc/socket";
import { LocalStorageKey } from "../../misc/ui-constants";

import "../../style/components/PlayerClueSelection.css";

export default function PlayerClueSelection() {
    const context = useContext(LayoutContext);
    const [categoryIndex, setCategoryIndex] = useState(-1);

    const updateCategoryIndex = (categoryIndex: number) => {
        setCategoryIndex(categoryIndex);
        localStorage.setItem(LocalStorageKey.CategoryIndex, `${categoryIndex}`);
    }

    useEffect(() => {
        if (!context.triviaRound || (categoryIndex >= 0)) {
            return;
        }

        const numCategories = context.triviaRound.settings.numCategories;

        // if possible, default to whatever was the last category this player selected
        let defaultCategoryIndex = parseInt(localStorage[LocalStorageKey.CategoryIndex]);
        if (isNaN(defaultCategoryIndex)) {
            defaultCategoryIndex = 0;
        }

        defaultCategoryIndex = Math.min(Math.max(defaultCategoryIndex, 0), numCategories - 1);

        // if that category is finished, fall back to the nearest category that's still open
        if (context.triviaRound.categories[defaultCategoryIndex].completed) {
            for (let distance = 1; distance < numCategories; distance++) {
                const rightIndex = defaultCategoryIndex + distance;
                if ((rightIndex < numCategories) && !context.triviaRound.categories[rightIndex].completed) {
                    defaultCategoryIndex = rightIndex;
                    break;
                }

                const leftIndex = defaultCategoryIndex - distance;
                if ((leftIndex >= 0) && !context.triviaRound.categories[leftIndex].completed) {
                    defaultCategoryIndex = leftIndex;
                    break;
                }
            }
        }

        setCategoryIndex(defaultCategoryIndex);
    }, [context.triviaRound, categoryIndex]);

    const emitSelectClue = (clueIndex: number) => {
        localStorage.setItem(LocalStorageKey.CategoryIndex, `${categoryIndex}`);
        socket.emit(PlayerSocket.SelectClue, categoryIndex, clueIndex);
    }

    const getNextLeftCategoryIndex = () => {
        if (!context.triviaRound) {
            return;
        }

        if (categoryIndex === 0) {
            return;
        }

        for (let i = (categoryIndex - 1); i >= 0; i--) {
            if (!context.triviaRound.categories[i].completed) {
                return i;
            }
        }
    }

    const getNextRightCategoryIndex = () => {
        if (!context.triviaRound) {
            return;
        }

        if (categoryIndex === (context.triviaRound.settings.numCategories - 1)) {
            return;
        }

        for (let i = (categoryIndex + 1); i < context.triviaRound.settings.numCategories; i++) {
            if (!context.triviaRound.categories[i].completed) {
                return i;
            }
        }
    }

    const nextLeftCategoryIndex = getNextLeftCategoryIndex();
    const nextRightCategoryIndex = getNextRightCategoryIndex();
    const canGoLeft = nextLeftCategoryIndex !== undefined;
    const canGoRight = nextRightCategoryIndex !== undefined;

    return (
        <Box className={"mobile-box"} padding={"1em"}>
            <Heading size={"lg"} className={"logo-text"}>tap to select a clue</Heading>

            <Stack direction={"column"} marginTop={"1em"} gap={"1em"} className={"board-text"}>
                <Stack direction={"row"} justifyContent={"center"} alignItems={"center"}>
                    <Box className={"arrow-box"} onClick={() => canGoLeft && updateCategoryIndex(nextLeftCategoryIndex)} pointerEvents={canGoLeft ? "auto" : "none"}>
                        {canGoLeft && <FaArrowLeft />}
                    </Box>

                    <Box id={"selected-category-box"} className={"child-box"}>
                        {context.triviaRound?.categories[categoryIndex]?.name.toUpperCase()}
                    </Box>

                    <Box className={"arrow-box"} onClick={() => canGoRight && updateCategoryIndex(nextRightCategoryIndex)} pointerEvents={canGoRight ? "auto" : "none"}>
                        {canGoRight && <FaArrowRight />}
                    </Box>
                </Stack>

                {context.triviaRound?.categories[categoryIndex]?.clues.map((clue: TriviaClue, index: number) => {
                    if (!clue.completed) {
                        return (
                            <Box key={index} className={"child-box"} fontSize={"2em"} display={"flex"} justifyContent={"center"} alignItems={"center"} onClick={() => emitSelectClue(index)}>
                                <FormattedDollarValue value={clue.value} signOffsetY={"-3%"} />
                            </Box>
                        );
                    }
                })}
            </Stack>
        </Box>
    );
}