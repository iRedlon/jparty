
import { TriviaClueBonus, TriviaClueDecision, TriviaClueDifficulty } from "./trivia-game-constants";
import { TriviaCategorySettings, TriviaGameSettings, TriviaRoundSettings } from "./trivia-game-settings";

export class TriviaGame {
    constructor(
        public settings: TriviaGameSettings,
        public rounds: TriviaRound[]
    ) { }

    static clone(source: TriviaGame) {
        const clonedRounds = source.rounds.map(round => TriviaRound.clone(round));
        return new TriviaGame(TriviaGameSettings.clone(source.settings), clonedRounds);
    }
}

export class TriviaRound {
    constructor(
        public settings: TriviaRoundSettings,
        public categories: TriviaCategory[],
        public completed?: boolean
    ) { }

    static clone(source: TriviaRound) {
        const clonedCategories = source.categories.map(category => TriviaCategory.clone(category));
        return new TriviaRound(TriviaRoundSettings.clone(source.settings), clonedCategories, source.completed);
    }

    getMaxClueValue() {
        return this.settings.numClues * this.settings.clueValueStep;
    }

    // returns the position of the last uncompleted clue in this round, if and only if there is exactly one uncompleted clue remaining
    getFinalCluePosition() {
        let finalCluePosition = new TriviaCluePosition(-1, -1);

        for (let categoryIndex = 0; categoryIndex < this.categories.length; categoryIndex++) {
            const category = this.categories[categoryIndex];

            for (let clueIndex = 0; clueIndex < category.clues.length; clueIndex++) {
                const clue = category.clues[clueIndex];

                if (clue.completed) {
                    continue;
                }

                // if we've already found a valid clue position, we must have more than one uncompleted clue
                if (finalCluePosition.validate()) {
                    return;
                }

                finalCluePosition = new TriviaCluePosition(categoryIndex, clueIndex);
            }
        }

        return finalCluePosition;
    }

    setClueCompleted(categoryIndex: number, clueIndex: number) {
        if (categoryIndex >= this.categories.length) {
            return;
        }

        this.categories[categoryIndex].setClueCompleted(clueIndex);

        // don't bother checking for round completion if this category isn't even complete yet
        if (!this.categories[categoryIndex].completed) {
            return;
        }

        let completedCategories = 0;
        for (const category of this.categories) {
            if (category.completed) {
                completedCategories++;
            }
        }

        this.completed = (completedCategories === this.categories.length);
    }
}

export class TriviaCluePosition {
    constructor(
        public categoryIndex: number,
        public clueIndex: number
    ) { }

    validate() {
        return this.categoryIndex >= 0 && this.clueIndex >= 0;
    }
}

// DO NOT TOUCH: mongo schema
export interface TriviaCategorySchema {
    id: number,
    name: string,
    type: number,
    clues: Record<TriviaClueDifficulty, TriviaClueSchema[]>
}

export class TriviaCategory {
    settings: TriviaCategorySettings;
    id: number;
    name: string;
    clues: TriviaClue[];
    completed?: boolean;

    constructor(settings?: TriviaCategorySettings, schema?: TriviaCategorySchema, completed?: boolean) {
        // default constructor
        if (settings === undefined || schema === undefined) {
            return;
        }

        this.settings = settings;
        this.id = schema.id;
        this.name = schema.name;
        this.clues = [];
        this.completed = completed;
    }

    static clone(source: TriviaCategory) {
        source.clues = source.clues.map(clue => TriviaClue.clone(clue));
        return Object.assign(new TriviaCategory(), source);
    }

    setClueCompleted(clueIndex: number) {
        if (clueIndex >= this.clues.length) {
            return;
        }

        this.clues[clueIndex].completed = true;

        let completedClues = 0;
        for (const clue of this.clues) {
            if (clue.completed) {
                completedClues++;
            }
        }

        this.completed = (completedClues === this.clues.length);
    }
}

// DO NOT TOUCH: mongo schema
export interface TriviaClueSchema {
    id: number,
    category_id: number,
    question: string,
    answer: string,
    difficulty: number,
    year: number
}

export class TriviaClue {
    id: number;
    question: string;
    answer: string;
    value: number;
    difficulty: TriviaClueDifficulty;
    year: number;
    bonus: TriviaClueBonus;
    completed?: boolean;

    constructor(schema?: TriviaClueSchema, clueValueStep?: number, clueIndex?: number) {
        // default constructor
        if (schema === undefined || clueValueStep === undefined || clueIndex === undefined) {
            return;
        }

        this.id = schema.id;
        this.question = schema.question;
        this.answer = schema.answer;
        this.value = clueValueStep * (clueIndex + 1);
        this.difficulty = schema.difficulty;
        this.year = schema.year;
        this.bonus = TriviaClueBonus.None;
    }

    static clone(source: TriviaClue) {
        return Object.assign(new TriviaClue(), source);
    }

    isTossupClue() {
        switch (this.bonus) {
            case TriviaClueBonus.AllWager:
            case TriviaClueBonus.AllPlay:
                {
                    return false;
                }
        }

        return true;
    }

    // only the selecting player can attempt a personal clue, even if they get it wrong
    isPersonalClue() {
        switch (this.bonus) {
            case TriviaClueBonus.Wager:
                {
                    return true;
                }
        }

        return false;
    }

    isWagerClue() {
        switch (this.bonus) {
            case TriviaClueBonus.Wager:
            case TriviaClueBonus.AllWager:
                {
                    return true;
                }
        }

        return false;
    }
}

export class TriviaClueDecisionInfo {
    categoryID: number;
    categoryName: string;
    clue: TriviaClue;
    response: string;
    decision: TriviaClueDecision;
    clueValue: number;
    isReversal: boolean;
    reversalVoterIDs: string[];

    constructor(categoryID: number, categoryName: string, clue: TriviaClue, response: string, decision: TriviaClueDecision, clueValue: number, isReversal: boolean = false) {
        this.categoryID = categoryID;
        this.categoryName = categoryName;
        this.clue = TriviaClue.clone(clue);
        this.response = response;
        this.decision = decision;
        this.clueValue = clueValue;
        this.isReversal = isReversal;
        this.reversalVoterIDs = [];
    }
}
