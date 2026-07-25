
import dotenv from "dotenv";
import { TriviaCategorySchema, TriviaClueDifficulty, TriviaClueSchema, TriviaFinalClueSchema } from "jparty-shared";
import { AnyBulkWriteOperation, MongoClient } from "mongodb";

import { CATEGORY_COLLECTION_NAME, FINAL_CLUE_COLLECTION_NAME, TRIVIA_DB_NAME } from "./trivia-db";
import { debugLog, formatDebugLog, LogCategory, LogVerbosity } from "../misc/log";
import { formatText } from "../misc/text-utils";

const J_ARCHIVE_BASE_URL = "https://j-archive.com";
const J_ARCHIVE_REQUEST_DELAY_MS = 1200;
const J_ARCHIVE_USER_AGENT = "jparty-trivia-db-updater (jparty.io)";

const FIRST_JEOPARDY_SEASON_YEAR = 1983;
const IMAGE_CLUE_KEYWORDS = ["seen here", "pictured here", "featured here", "shown here", "heard here"];

dotenv.config();

const client: MongoClient | undefined = process.env.MONGO_CONNECTION_STRING ? new MongoClient(process.env.MONGO_CONNECTION_STRING) : undefined;

function getCategoryCollection() {
    return client!.db(TRIVIA_DB_NAME).collection(CATEGORY_COLLECTION_NAME);
}

function getFinalClueCollection() {
    return client!.db(TRIVIA_DB_NAME).collection(FINAL_CLUE_COLLECTION_NAME);
}

// ======================
// text cleaning
// ======================

const NAMED_HTML_ENTITIES: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'", "&nbsp;": " "
};

function decodeHTMLEntities(text: string) {
    text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    text = text.replace(/&#(\d+);/g, (_, decimal) => String.fromCharCode(parseInt(decimal)));

    for (const [entity, character] of Object.entries(NAMED_HTML_ENTITIES)) {
        text = text.replaceAll(entity, character);
    }

    return text;
}

function fixPunctuationSpacing(text: string) {
    text = text.replace(/,(?=[A-Za-z])/g, ", ");
    text = text.replace(/(?<=[a-z]{2})\.(?=[A-Z][a-z])/g, ". ");
    text = text.replace(/([;?!])(?=[A-Za-z])/g, "$1 ");
    text = text.replace(/:(?=[A-Za-z])/g, ": ");
    text = text.replace(/(?<= )&(?=[A-Za-z])/g, "& ");

    return text.replace(/\s+/g, " ").trim();
}

function cleanScrapedHTML(html: string) {
    return formatText(decodeHTMLEntities(html.replace(/<br\s*\/?>/g, " "))).replace(/\s+/g, " ").trim();
}

function cleanClueText(html: string) {
    return fixPunctuationSpacing(cleanScrapedHTML(html));
}

function getNormalizedKey(text: string) {
    return formatText(text).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ======================
// j-archive.com scraper
// ======================

interface ScrapedClue {
    question: string,
    answer: string,
    difficulty: TriviaClueDifficulty,
    year: number
}

interface ScrapedCategory {
    name: string,
    clues: ScrapedClue[]
}

interface ScrapedFinalClue {
    categoryName: string,
    question: string,
    answer: string,
    year: number
}

interface ScrapedGame {
    categories: ScrapedCategory[],
    finalClue?: ScrapedFinalClue
}

let lastFetchTimeMs = 0;

async function fetchPage(url: string) {
    const timeSinceLastFetchMs = Date.now() - lastFetchTimeMs;
    if (timeSinceLastFetchMs < J_ARCHIVE_REQUEST_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, J_ARCHIVE_REQUEST_DELAY_MS - timeSinceLastFetchMs));
    }

    lastFetchTimeMs = Date.now();

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(url, { headers: { "User-Agent": J_ARCHIVE_USER_AGENT } });
            if (response.ok) {
                return await response.text();
            }

            debugLog(LogCategory.TriviaDatabase, `got status: ${response.status} while fetching: ${url}`, LogVerbosity.Normal);
        }
        catch (e) {
            debugLog(LogCategory.TriviaDatabase, `network error while fetching: ${url}`, LogVerbosity.Normal);
        }

        await new Promise(resolve => setTimeout(resolve, J_ARCHIVE_REQUEST_DELAY_MS * (attempt + 1)));
    }

    throw new Error(formatDebugLog(`failed to fetch: ${url}`));
}

// parses one board (single or double jeopardy) out of a game page. roundPrefix is "J" or "DJ" to match j-archive's clue IDs
function parseRound(roundHTML: string, roundPrefix: string, year: number): ScrapedCategory[] {
    const categoryNames = [...roundHTML.matchAll(/<td class="category_name">([\s\S]*?)<\/td>/g)].map(match => cleanScrapedHTML(match[1]));

    let categories: ScrapedCategory[] = categoryNames.map(name => ({ name: name, clues: [] }));

    const clueMatches = [...roundHTML.matchAll(new RegExp(`<td id="clue_${roundPrefix}_(\\d+)_(\\d+)" class="clue_text">([\\s\\S]*?)<\\/td>`, "g"))];

    for (const clueMatch of clueMatches) {
        const categoryIndex = parseInt(clueMatch[1]) - 1;
        const row = parseInt(clueMatch[2]);

        // clues that reference video/image/audio media (i.e. "the film seen here...") are unplayable as text-only trivia
        if (clueMatch[3].includes("j-archive.com/media")) {
            continue;
        }

        const question = cleanClueText(clueMatch[3]);

        // the correct response lives in a hidden sibling cell with the same ID plus an "_r" suffix
        const responseMatch = roundHTML.match(new RegExp(`<td id="clue_${roundPrefix}_${clueMatch[1]}_${clueMatch[2]}_r" class="clue_text"[^>]*>[\\s\\S]*?<em class="correct_response">([\\s\\S]*?)<\\/em>`));
        const answer = responseMatch ? cleanClueText(responseMatch[1]) : "";

        if (!question || !answer || (categoryIndex < 0) || (categoryIndex >= categories.length)) {
            continue;
        }

        if ((row < TriviaClueDifficulty.Easiest) || (row > TriviaClueDifficulty.Hardest)) {
            continue;
        }

        categories[categoryIndex].clues.push({ question: question, answer: answer, difficulty: row as TriviaClueDifficulty, year: year });
    }

    return categories.filter(category => category.name && category.clues.length);
}

function parseFinalJeopardy(roundHTML: string, year: number): ScrapedFinalClue | undefined {
    const categoryNameMatch = roundHTML.match(/<td class="category_name">([\s\S]*?)<\/td>/);
    const questionMatch = roundHTML.match(/<td id="clue_FJ" class="clue_text">([\s\S]*?)<\/td>/);
    const responseMatch = roundHTML.match(/<td id="clue_FJ_r" class="clue_text"[^>]*>[\s\S]*?<em class="correct_response">([\s\S]*?)<\/em>/);

    if (!categoryNameMatch || !questionMatch || !responseMatch || questionMatch[1].includes("j-archive.com/media")) {
        return undefined;
    }

    const categoryName = cleanScrapedHTML(categoryNameMatch[1]);
    const question = cleanClueText(questionMatch[1]);
    const answer = cleanClueText(responseMatch[1]);

    if (!categoryName || !question || !answer || IMAGE_CLUE_KEYWORDS.some(keyword => question.toLowerCase().includes(keyword))) {
        return undefined;
    }

    return { categoryName: categoryName, question: question, answer: answer, year: year };
}

function parseGame(gameHTML: string, airDate: string): ScrapedGame {
    const year = parseInt(airDate.slice(0, 4));

    const jeopardyRoundStart = gameHTML.indexOf("id=\"jeopardy_round\"");
    const doubleJeopardyRoundStart = gameHTML.indexOf("id=\"double_jeopardy_round\"");
    const finalJeopardyRoundStart = gameHTML.indexOf("id=\"final_jeopardy_round\"");

    let categories: ScrapedCategory[] = [];

    if (jeopardyRoundStart >= 0) {
        const roundEnd = (doubleJeopardyRoundStart >= 0) ? doubleJeopardyRoundStart : ((finalJeopardyRoundStart >= 0) ? finalJeopardyRoundStart : gameHTML.length);
        categories = categories.concat(parseRound(gameHTML.slice(jeopardyRoundStart, roundEnd), "J", year));
    }

    if (doubleJeopardyRoundStart >= 0) {
        const roundEnd = (finalJeopardyRoundStart >= 0) ? finalJeopardyRoundStart : gameHTML.length;
        categories = categories.concat(parseRound(gameHTML.slice(doubleJeopardyRoundStart, roundEnd), "DJ", year));
    }

    const finalClue = (finalJeopardyRoundStart >= 0) ? parseFinalJeopardy(gameHTML.slice(finalJeopardyRoundStart), year) : undefined;

    return { categories: categories, finalClue: finalClue };
}

// finds every archived game that aired on or after January 1st of the given year
async function getGameListSinceYear(sinceYear: number) {
    const sinceDate = `${sinceYear}-01-01`;
    const seasonListHTML = await fetchPage(`${J_ARCHIVE_BASE_URL}/listseasons.php`);

    // each season row looks like: <a href="showseason.php?season=41">Season 41</a></td><td class="left_padded">2024-09-09 to 2025-07-25</td>
    const seasonMatches = [...seasonListHTML.matchAll(/showseason\.php\?season=([^"]+)"[^>]*>[\s\S]*?<\/a><\/td><td[^>]*>(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/g)];

    let games: { gameID: number, airDate: string }[] = [];

    for (const seasonMatch of seasonMatches) {
        const season = seasonMatch[1];

        if (!/^\d+$/.test(season) || (seasonMatch[3] < sinceDate)) {
            continue;
        }

        const seasonHTML = await fetchPage(`${J_ARCHIVE_BASE_URL}/showseason.php?season=${season}`);

        // each game row looks like: <a href="showgame.php?game_id=9262" ...>&#35;9385, aired&#160;2025-07-25</a>
        const gameMatches = [...seasonHTML.matchAll(/showgame\.php\?game_id=(\d+)"[^>]*>[\s\S]*?aired(?:&#160;|&nbsp;|\s)*(\d{4}-\d{2}-\d{2})/g)];

        for (const gameMatch of gameMatches) {
            if (gameMatch[2] >= sinceDate) {
                games.push({ gameID: parseInt(gameMatch[1]), airDate: gameMatch[2] });
            }
        }

        debugLog(LogCategory.TriviaDatabase, `season ${season}: found ${gameMatches.length} archived games`, LogVerbosity.Normal);
    }

    // oldest first so a partial run still fills the database in chronological order
    return games.sort((a, b) => a.airDate.localeCompare(b.airDate));
}

async function scrapeGamesSinceYear(sinceYear: number) {
    const gameList = await getGameListSinceYear(sinceYear);

    debugLog(LogCategory.TriviaDatabase, `scraping ${gameList.length} games aired since ${sinceYear}-01-01`, LogVerbosity.Normal);

    let scrapedGames: ScrapedGame[] = [];

    for (let gameIndex = 0; gameIndex < gameList.length; gameIndex++) {
        const { gameID, airDate } = gameList[gameIndex];

        const gameHTML = await fetchPage(`${J_ARCHIVE_BASE_URL}/showgame.php?game_id=${gameID}`);
        scrapedGames.push(parseGame(gameHTML, airDate));

        debugLog(LogCategory.TriviaDatabase, `scraped game ${gameIndex + 1}/${gameList.length} (game ID: ${gameID}, aired: ${airDate})`, LogVerbosity.Verbose);

        if ((gameIndex + 1) % 100 === 0) {
            debugLog(LogCategory.TriviaDatabase, `scraping progress: ${gameIndex + 1}/${gameList.length} games`, LogVerbosity.Normal);
        }
    }

    return scrapedGames;
}

// ======================
// db update
// ======================
async function getMaxFieldValue(collection: ReturnType<typeof getCategoryCollection>, projectExpression: Object) {
    const results = await collection.aggregate([
        { $project: { value: projectExpression } },
        { $group: { _id: null, maxValue: { $max: "$value" } } }
    ]).toArray();

    return (results.length && (typeof results[0].maxValue === "number")) ? results[0].maxValue : 0;
}

function getMaxClueFieldExpression(field: string) {
    let perDifficultyMaxes = [];

    for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
        perDifficultyMaxes.push({ $max: `$clues.${difficulty}.${field}` });
    }

    return { $max: perDifficultyMaxes };
}

async function getDefaultSinceYear() {
    const latestClueYear = await getMaxFieldValue(getCategoryCollection(), getMaxClueFieldExpression("year"));
    const latestFinalClueYear = await getMaxFieldValue(getFinalClueCollection(), "$year");

    const latestYears = [latestClueYear, latestFinalClueYear].filter(year => year > 0);
    return latestYears.length ? Math.min(...latestYears) : FIRST_JEOPARDY_SEASON_YEAR;
}

async function updateTriviaDatabase(scrapedGames: ScrapedGame[], write: boolean) {
    const categoryCollection = getCategoryCollection();

    // merge every scraped category with the same name into a single bucket of clues
    let scrapedCategoryBuckets: Map<string, ScrapedCategory> = new Map();

    for (const game of scrapedGames) {
        for (const category of game.categories) {
            const nameKey = getNormalizedKey(category.name);

            const bucket = scrapedCategoryBuckets.get(nameKey);
            if (bucket) {
                bucket.clues = bucket.clues.concat(category.clues);
            }
            else {
                scrapedCategoryBuckets.set(nameKey, { name: category.name, clues: [...category.clues] });
            }
        }
    }

    debugLog(LogCategory.TriviaDatabase, `scraped ${scrapedCategoryBuckets.size} unique category names across ${scrapedGames.length} games`, LogVerbosity.Normal);

    let existingCategoryIDsByName: Map<string, number[]> = new Map();

    for (const doc of await categoryCollection.find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray()) {
        const nameKey = getNormalizedKey(doc.name || "");
        if (nameKey) {
            existingCategoryIDsByName.set(nameKey, [...(existingCategoryIDsByName.get(nameKey) || []), doc.id]);
        }
    }

    let nextCategoryID = (await getMaxFieldValue(categoryCollection, "$id")) + 1;
    let nextClueID = (await getMaxFieldValue(categoryCollection, getMaxClueFieldExpression("id"))) + 1;

    let newCategories: TriviaCategorySchema[] = [];
    let existingCategoryUpdates: { categoryID: number, newClues: TriviaClueSchema[] }[] = [];
    let newClueCount = 0;
    let duplicateClueCount = 0;

    for (const [nameKey, bucket] of scrapedCategoryBuckets) {
        const sameNameCategoryIDs = existingCategoryIDsByName.get(nameKey);

        let existingQuestionKeys: Set<string> = new Set();

        for (const sameNameCategoryID of (sameNameCategoryIDs || [])) {
            const existingSchema = await categoryCollection.findOne({ id: sameNameCategoryID }) as unknown as TriviaCategorySchema | null;

            for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
                for (const clue of (existingSchema?.clues[difficulty as TriviaClueDifficulty] || [])) {
                    existingQuestionKeys.add(getNormalizedKey(clue.question));
                }
            }
        }

        const categoryID = sameNameCategoryIDs ? sameNameCategoryIDs[0] : nextCategoryID;
        let newClues: TriviaClueSchema[] = [];

        for (const clue of bucket.clues) {
            const questionKey = getNormalizedKey(clue.question);
            if (existingQuestionKeys.has(questionKey)) {
                duplicateClueCount++;
                continue;
            }

            existingQuestionKeys.add(questionKey);

            newClues.push({
                id: nextClueID++,
                category_id: categoryID,
                question: clue.question,
                answer: clue.answer,
                difficulty: clue.difficulty,
                year: clue.year
            });
        }

        if (!newClues.length) {
            continue;
        }

        newClueCount += newClues.length;

        if (sameNameCategoryIDs) {
            debugLog(LogCategory.TriviaDatabase, `appending ${newClues.length} clues onto existing category "${bucket.name}" (id: ${categoryID})`, LogVerbosity.Verbose);
            existingCategoryUpdates.push({ categoryID: categoryID, newClues: newClues });
        }
        else {
            nextCategoryID++;

            let clues = {} as Record<TriviaClueDifficulty, TriviaClueSchema[]>;
            for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
                clues[difficulty as TriviaClueDifficulty] = newClues.filter(clue => clue.difficulty === difficulty);
            }

            const name = bucket.name.toLowerCase();

            debugLog(LogCategory.TriviaDatabase, `new category "${name}" (id: ${categoryID}, ${newClues.length} clues) -> "${TRIVIA_DB_NAME}".${CATEGORY_COLLECTION_NAME}`, LogVerbosity.Normal);
            newCategories.push({ id: categoryID, name: name, clues: clues });
        }
    }

    debugLog(LogCategory.TriviaDatabase, `board clue plan: ${newClueCount} new clues (${newCategories.length} new categories, ${existingCategoryUpdates.length} existing categories gaining clues, ${duplicateClueCount} duplicates skipped)`, LogVerbosity.Normal);

    if (!write) {
        return;
    }

    if (newCategories.length) {
        const insertResult = await categoryCollection.insertMany(newCategories as any[]);
        debugLog(LogCategory.TriviaDatabase, `inserted ${insertResult.insertedCount}/${newCategories.length} new categories`, LogVerbosity.Normal);
    }

    if (existingCategoryUpdates.length) {
        let bulkOperations: AnyBulkWriteOperation[] = [];

        for (const update of existingCategoryUpdates) {
            // append each new clue onto the array matching its difficulty
            let pushOperation: Record<string, Object> = {};

            for (let difficulty = TriviaClueDifficulty.Easiest; difficulty <= TriviaClueDifficulty.Hardest; difficulty++) {
                const cluesAtDifficulty = update.newClues.filter(clue => clue.difficulty === difficulty);
                if (cluesAtDifficulty.length) {
                    pushOperation[`clues.${difficulty}`] = { $each: cluesAtDifficulty };
                }
            }

            bulkOperations.push({ updateOne: { filter: { id: update.categoryID }, update: { $push: pushOperation } as any } });
        }

        const bulkResult = await categoryCollection.bulkWrite(bulkOperations);
        debugLog(LogCategory.TriviaDatabase, `appended new clues onto ${bulkResult.modifiedCount}/${existingCategoryUpdates.length} existing categories`, LogVerbosity.Normal);
    }
}

async function updateFinalClueDatabase(scrapedGames: ScrapedGame[], write: boolean) {
    const finalClueCollection = getFinalClueCollection();

    const scrapedFinalClues = scrapedGames.map(game => game.finalClue).filter(finalClue => !!finalClue) as ScrapedFinalClue[];

    let existingQuestionKeys: Set<string> = new Set();

    for (const doc of await finalClueCollection.find({}, { projection: { _id: 0, question: 1 } }).toArray()) {
        existingQuestionKeys.add(getNormalizedKey(doc.question || ""));
    }

    let nextFinalClueID = (await getMaxFieldValue(finalClueCollection, "$id")) + 1;

    let newFinalClues: TriviaFinalClueSchema[] = [];
    let duplicateClueCount = 0;

    for (const finalClue of scrapedFinalClues) {
        const questionKey = getNormalizedKey(finalClue.question);
        if (existingQuestionKeys.has(questionKey)) {
            duplicateClueCount++;
            continue;
        }

        existingQuestionKeys.add(questionKey);

        newFinalClues.push({
            id: nextFinalClueID++,
            category_name: finalClue.categoryName.toLowerCase(),
            question: finalClue.question,
            answer: finalClue.answer,
            year: finalClue.year
        });
    }

    debugLog(LogCategory.TriviaDatabase, `final clue plan: ${newFinalClues.length} new final clues -> "${TRIVIA_DB_NAME}".${FINAL_CLUE_COLLECTION_NAME} (${duplicateClueCount} duplicates skipped)`, LogVerbosity.Normal);

    if (!write || !newFinalClues.length) {
        return;
    }

    const insertResult = await finalClueCollection.insertMany(newFinalClues as any[]);
    debugLog(LogCategory.TriviaDatabase, `inserted ${insertResult.insertedCount}/${newFinalClues.length} new final clues`, LogVerbosity.Normal);
}

// ==========================
// command line interface
// =========================

async function runCli() {
    if (!client) {
        throw new Error(formatDebugLog("can't update the trivia database without a mongo connection"));
    }

    const args = process.argv.slice(2);
    const write = args.includes("--write");
    const yearArg = args.find(arg => arg !== "--write");

    if ((yearArg !== undefined) && !/^\d{4}$/.test(yearArg)) {
        console.log("usage: npx tsx server/api-requests/trivia-db-utils.ts [year] [--write]");
        process.exit(1);
    }

    console.log(`targeting trivia database: "${TRIVIA_DB_NAME}"`);

    const sinceYear = yearArg ? parseInt(yearArg) : await getDefaultSinceYear();
    if (!yearArg) {
        console.log(`no year given: resuming from the latest year already in the database (${sinceYear})`);
    }

    const scrapedGames = await scrapeGamesSinceYear(sinceYear);

    await updateTriviaDatabase(scrapedGames, write);
    await updateFinalClueDatabase(scrapedGames, write);

    console.log(write ? "finished writing to mongo" : "dry run finished. nothing was written to mongo (re-run with --write to commit)");

    // the mongo client keeps the event loop alive, so end the process explicitly
    process.exit(0);
}

runCli().catch(e => {
    console.error(e);
    process.exit(1);
});
