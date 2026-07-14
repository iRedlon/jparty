
import { TriviaCategorySchema, TriviaCategoryType, TriviaClueDifficulty, TriviaClueSchema } from "jparty-shared";

const NUM_TEST_CLUES_PER_DIFFICULTY = 10;

let nextTestCategoryID = 0;
let nextTestClueID = 0;

export function getTestCategorySchema(type: TriviaCategoryType): TriviaCategorySchema {
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
        name: `test ${TriviaCategoryType[type].toLowerCase()} #${categoryID}`,
        type: type,
        clues: clues
    };
}
