
import { TriviaCategorySchema, TriviaClueDifficulty, TriviaClueSchema, TriviaFinalClueSchema } from "jparty-shared";

const NUM_TEST_CLUES_PER_DIFFICULTY = 10;

let nextTestCategoryID = 0;
let nextTestClueID = 0;
let nextTestFinalClueID = 0;

export function getTestCategorySchema(): TriviaCategorySchema {
    const categoryID = nextTestCategoryID++;

    let clues = {} as Record<TriviaClueDifficulty, TriviaClueSchema[]>;

    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        clues[difficulty as TriviaClueDifficulty] = [];

        for (let i = 0; i < NUM_TEST_CLUES_PER_DIFFICULTY; i++) {
            const clueID = nextTestClueID++;

            clues[difficulty as TriviaClueDifficulty].push({
                id: clueID,
                category_id: categoryID,
                question: `this is test clue #${clueID} at difficulty ${difficulty}. its correct answer is "answer ${clueID}"`,
                answer: `answer ${clueID}`,
                difficulty: difficulty,
                year: new Date().getFullYear()
            });
        }
    }

    return {
        id: categoryID,
        name: `test category #${categoryID}`,
        clues: clues
    };
}

export function getTestFinalClueSchema(): TriviaFinalClueSchema {
    const finalClueID = nextTestFinalClueID++;

    return {
        id: finalClueID,
        category_name: `test final category #${finalClueID}`,
        question: `this is test final clue #${finalClueID}. its correct answer is "final answer ${finalClueID}"`,
        answer: `final answer ${finalClueID}`,
        year: new Date().getFullYear()
    };
}
