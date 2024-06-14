
import { Box, Heading, Stack } from "@chakra-ui/react";
import { PlayerSocket, TriviaClue } from "jparty-shared";
import { useContext, useEffect, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useDoubleTap } from "use-double-tap";

import { LayoutContext } from "../common/Layout";
import { formatDollarValue } from "../../misc/client-utils";
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
        // if possible, set the default category index to be whatever was the last category this player selected
        const prevCategoryIndexString = localStorage[LocalStorageKey.CategoryIndex];
        if (prevCategoryIndexString) {
            const prevCategoryIndex = parseInt(prevCategoryIndexString);

            const numCategories = context.triviaRound ? context.triviaRound.settings.numCategories : 0;

            if (isNaN(prevCategoryIndex) || prevCategoryIndex < 0 || prevCategoryIndex > (numCategories - 1) || context.triviaRound?.categories[prevCategoryIndex].completed) {
                localStorage.removeItem(LocalStorageKey.CategoryIndex);
            }
            else {
                setCategoryIndex(prevCategoryIndex);
                return;
            }
        }

        const nextRightCategoryIndex = getNextRightCategoryIndex();
        setCategoryIndex(nextRightCategoryIndex !== undefined ? nextRightCategoryIndex : 0);
    }, []);

    const emitSelectClue = (clueIndex: number) => {
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

    const doubleTapBind = useDoubleTap((event) => {
        // clue index is stored with the ID of the clue value div... a little bit scuffed but oh well
        emitSelectClue(parseInt(event.currentTarget.id));
    });

    return (
        <Box className={"mobile-box"} padding={"1em"}>
            <Heading size={"sm"} fontFamily={"logo"}>double tap to select a clue</Heading>

            <Stack direction={"column"} marginTop={"1em"} gap={"1em"} fontFamily={"board"}>
                <Stack direction={"row"} justifyContent={"center"} alignItems={"center"}>
                    <Box className={"arrow-box"} onClick={() => canGoLeft && updateCategoryIndex(nextLeftCategoryIndex)} pointerEvents={canGoLeft ? "auto" : "none"}>
                        {canGoLeft && <FaArrowLeft />}
                    </Box>

                    <Box id={"selected-category-box"} className={"child-box"}>
                        {context.triviaRound?.categories[categoryIndex]?.name}
                    </Box>

                    <Box className={"arrow-box"} onClick={() => canGoRight && updateCategoryIndex(nextRightCategoryIndex)} pointerEvents={canGoRight ? "auto" : "none"}>
                        {canGoRight && <FaArrowRight />}
                    </Box>
                </Stack>

                {context.triviaRound?.categories[categoryIndex]?.clues.map((clue: TriviaClue, index: number) => {
                    if (!clue.completed) {
                        return (
                            <Box key={index} id={`${index}`} className={"child-box"} fontSize={"2em"} display={"flex"} justifyContent={"center"} alignItems={"center"} {...doubleTapBind}>
                                {formatDollarValue(clue.value)}
                            </Box>
                        );
                    }
                })}
            </Stack>
        </Box>
    );
}