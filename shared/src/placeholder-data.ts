
import { TriviaCategory, TriviaRound } from "./trivia-game";
import { NORMAL_SINGLE_ROUND_SETTINGS, TriviaCategorySettings } from "./trivia-game-settings";

// used for testing a disconnected client with realistic trivia data
const PLACEHOLDER_TRIVIA_ROUND_CATEGORIES: TriviaCategory[] = [
    {
        settings: { type: 2 } as TriviaCategorySettings,
        id: 11196,
        name: 'also a 2-letter postal abbreviation',
        clues: [
            {
                id: 125427,
                question: `"You have worked with some of our great presidents.""Mm-hmm.""Who were they?""Go back to the first.  Washington.  He used to wear his wig cockeye.  I straightened him out.  I straightened out his wooden teeth.  But Wilson--Woodrow Wilson took my advice.  I said, 'Woody, you're making too many points in this declaration.  How many points do you really need?'"`,
                answer: 'Fukko & Watarai are among the many sects of this kami-centered religion',
                value: 200,
                difficulty: 1,
                year: 2004,
                bonus: 3
            },
            {
                id: 125428,
                question: 'Lincoln, Nebraska',
                answer: 'Shinto',
                value: 400,
                difficulty: 2,
                year: 2004,
                bonus: 2
            },
            {
                id: 125429,
                question: 'Sikhs of the Akhand Kirtani Jatha sect wear a small one of these traditional headdresses under the main one',
                answer: 'a turban',
                value: 600,
                difficulty: 3,
                year: 2004,
                bonus: 1
            },
            {
                id: 125430,
                question: 'The Qumran community, aka this geographical feature sect, became the subject of much attention in 1947',
                answer: 'the Dead Sea',
                value: 800,
                difficulty: 4,
                year: 2004,
                bonus: 0
            },
            {
                id: 125431,
                question: 'Awaken to the knowledge that Obaku is one of 3 Japanese sects of this form of Buddhism',
                answer: 'zen',
                value: 1000,
                difficulty: 5,
                year: 2004,
                bonus: 0
            }
        ]
    } as TriviaCategory,
    {
        settings: { type: 2 },
        id: 9639,
        name: "jerusalem's noble sanctuary",
        clues: [
            {
                id: 116730,
                question: 'The beautiful Dome of the Rock is one of the oldest surviving Islamic monuments, & it also boasts some of the oldest mihrabs which are niches, all of them designed to point to this holy city',
                answer: 'Mecca',
                value: 200,
                difficulty: 1,
                year: 2000,
                bonus: 0
            },
            {
                id: 116731,
                question: 'These multicolored Turkish tiles are faithful replicas of the ones donated by this "Magnificent" Ottoman sultan in 1545',
                answer: 'Suleyman',
                value: 400,
                difficulty: 2,
                year: 2000,
                bonus: 0
            },
            {
                id: 116732,
                question: 'The Dome of the Rock, which is now under extensive renovation, is built over this sacred stone, thought to be the place from which he ascended to heaven during his night journey',
                answer: 'Muhammad',
                value: 600,
                difficulty: 3,
                year: 2000,
                bonus: 0
            },
            {
                id: 116733,
                question: 'From the western courtyard at al-Aqsa, you get a good view of Silsila & Fakhriyya, two of these structures from which Muslims traditionally are called to prayer',
                answer: 'minarets',
                value: 800,
                difficulty: 4,
                year: 2000,
                bonus: 0
            },
            {
                id: 116734,
                question: `When entering al-Aqsa, worshippers must clean themselves, so this type of fountain was placed; it's name comes from the Latin for "wash away"`,
                answer: 'ablution',
                value: 1000,
                difficulty: 5,
                year: 2000,
                bonus: 0
            }
        ]
    } as TriviaCategory,
    {
        settings: { type: 6 },
        id: 5263,
        name: 'anagrammed british cities',
        clues: [
            {
                id: 91234,
                question: 'Popular pilgrimage place:ERRANCY TUB',
                answer: 'Canterbury',
                value: 200,
                difficulty: 1,
                year: 2000,
                bonus: 0
            },
            {
                id: 91235,
                question: 'Shire to a shifty sheriff:HANG NOT TIM',
                answer: 'Nottingham',
                value: 400,
                difficulty: 2,
                year: 2000,
                bonus: 0
            },
            {
                id: 91236,
                question: 'Where Gerry & The Pacemakers were from:PLOVER OIL',
                answer: 'Liverpool',
                value: 600,
                difficulty: 3,
                year: 2000,
                bonus: 0
            },
            {
                id: 91237,
                question: 'A united place:NECTAR MESH',
                answer: 'Manchester',
                value: 800,
                difficulty: 4,
                year: 2000,
                bonus: 0
            },
            {
                id: 91238,
                question: 'Pushoff port:HOT LUMPY',
                answer: 'Plymouth',
                value: 1000,
                difficulty: 5,
                year: 2000,
                bonus: 0
            }
        ]
    } as TriviaCategory,
    {
        settings: { type: 3 },
        id: 773,
        name: 'animals in literature',
        completed: true,
        clues: [
            {
                "id": 87961,
                "question": "This clothing company markets a snowshoe-wearing teddy bear called L.L. Bear",
                "answer": "L.L. Bean",
                "value": 200,
                "difficulty": 1,
                "year": 2004,
                "bonus": 0,
                "completed": true
            },
            {
                "id": 87962,
                "question": "In an audio book, Charles Kuralt narrates the adventures of this A.A. Milne bear",
                "answer": "Winnie the Pooh",
                "value": 400,
                "difficulty": 2,
                "year": 2004,
                "bonus": 0,
                "completed": true
            },
            {
                "id": 87963,
                "question": "One of the oldest teddy bear manufacturers in the world, the Steiff company is headquartered in this country",
                "answer": "Germany",
                "value": 600,
                "difficulty": 3,
                "year": 2004,
                "bonus": 0,
                "completed": true
            },
            {
                "id": 87964,
                "question": "A popular book character, this teddy bear was named after a London railway station",
                "answer": "Paddington Bear",
                "value": 800,
                "difficulty": 4,
                "year": 2004,
                "bonus": 0,
                "completed": true
            },
            {
                "id": 87965,
                "question": "In the mid-'80s over a million of these talking electronic teddy bears were sold",
                "answer": "Teddy Ruxpin",
                "value": 1000,
                "difficulty": 5,
                "year": 2004,
                "bonus": 0,
                "completed": true
            }
        ]
    } as TriviaCategory,
    {
        settings: { type: 2 },
        id: 6575,
        name: 'presidential fast facts',
        clues: [
            {
                id: 99242,
                question: 'In September 2004 he had heart-bypass surgery',
                answer: 'Bill Clinton',
                value: 200,
                difficulty: 1,
                year: 1995,
                bonus: 0
            },
            {
                id: 99243,
                question: `In the 1970s he had the campaign slogan "He's making us proud again"`,
                answer: 'Gerald Ford',
                value: 400,
                difficulty: 2,
                year: 1995,
                bonus: 0
            },
            {
                id: 99244,
                question: 'He was the first president to be inaugurated in Washington, D.C.',
                answer: 'Thomas Jefferson',
                value: 600,
                difficulty: 3,
                year: 1995,
                bonus: 0
            },
            {
                id: 99245,
                question: 'He died in September 1881, 2 months after he was shot',
                answer: 'Garfield',
                value: 800,
                difficulty: 4,
                year: 1995,
                bonus: 0
            },
            {
                id: 99246,
                question: "He was the only 20th century president who didn't attend formal college",
                answer: 'Harry Truman',
                value: 1000,
                difficulty: 5,
                year: 1995,
                bonus: 0
            }
        ]
    } as TriviaCategory,
    {
        settings: { type: 0 },
        id: 15218,
        name: 'california wine',
        clues: [
            {
                id: 147403,
                question: 'UC Davis know-how contributed to the 1960s growth of the local wine industry, & alum Mike Grgich was one of the vintners who triumphed in the 1976 judgment of this city, where California wines outdid the French in a blind tasting',
                answer: 'Paris',
                value: 200,
                difficulty: 1,
                year: 1995,
                bonus: 0
            },
            {
                id: 147404,
                question: 'Levels of this are monitored in the fermenting juice using the Brix scale, which calculates it as a percentage; at the start of fermentation, for a dry wine it should be around 22; for dessert wines, at or over 30',
                answer: 'sugar',
                value: 400,
                difficulty: 2,
                year: 1995,
                bonus: 0
            },
            {
                id: 147405,
                question: 'In the 1960s, UC Davis introduced the sterile type of this purifying process to the California wine industry; without it, the shelf life of wine could be compromised by in-bottle fermentation by yeast or bacteria',
                answer: 'filtration',
                value: 600,
                difficulty: 3,
                year: 1995,
                bonus: 0
            },
            {
                id: 147406,
                question: "Grape growing is a constant battle against phylloxera, an insect that in the 19th century nearly wiped out the French wine industry; it's basically the vineyard equivalent of this garden plant louse",
                answer: 'an aphid',
                value: 800,
                difficulty: 4,
                year: 1995,
                bonus: 0
            },
            {
                id: 147407,
                question: "In dry farming, grapes get all their moisture from the soil with no irrigation; it's not just a way to help California save water; some say it gives wine more of the quality of the place they're grown, this term from the French",
                answer: '<i>terroir</i>',
                value: 1000,
                difficulty: 5,
                year: 1995,
                bonus: 0
            }
        ]
    } as TriviaCategory
];

export const PLACEHOLDER_TRIVIA_ROUND = new TriviaRound(NORMAL_SINGLE_ROUND_SETTINGS, PLACEHOLDER_TRIVIA_ROUND_CATEGORIES);