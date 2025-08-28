import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message, Character, User} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Client} from "@gradio/client";
import { Outcome, Result, ResultClass, ResultDescription } from "./Outcome";
import { Action } from "./Action";

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

interface SaveState {
    lastOutcome: Outcome|null;
    lastOutcomePrompt: string;
}

const DEFAULT_OUTCOME_TEMPLATE = '<div style="--show-true: flex; --show-false: none; --failure: 255, 0, 0; --mixed: 255, 140, 0; --success: 60, 179, 113; --critical: 176, 224, 230; --none: 204, 204, 204; margin: 1rem; ' +
    'border: 2px solid rgb(var(--{{total_class}})); border-radius: 8px; padding: 1rem 1rem; background: linear-gradient(to right, rgba(var(--{{total_class}}), 0.2), #0003); box-shadow: 0 2px 4px #0003; ' +
    'font-family: system-ui, sans-serif; text-shadow: 2px 2px 4px #0003; font-size: 2rem; line-height: 1rem; white-space: pre;">' +
    '<div style="display: flex; justify-content: center; color: #bbb; font-size: 1.5rem; margin-bottom: 1.5rem;"><b><i>{{content}}</b></i></div>' +
    '<div style="display: var(--show-{{has_outcome}}); justify-content: center;">' +
    '<span style="color: rgb(var(--{{dice1_class}})); font-size: 3rem;">{{dice1_emoji}}</span><span style="color: rgb(var(--{{dice1_class}}));"> {{dice1_value}}</span>' +
    '<span style="color: rgb(var(--{{dice2_class}}));"> + </span><span style="color: rgb(var(--{{dice2_class}})); font-size: 3rem;">{{dice2_emoji}}</span><span style="color: rgb(var(--{{dice2_class}}));"> {{dice2_value}}</span>' +
    '<span style="color: rgb(var(--{{modifier_class}}));"> {{modifier_sign}} {{modifier_absolute}}</span><sup style="color: rgb(var(--{{modifier_class}})); font-size: 1rem;">(difficulty)</sup>' +
    '<span style="color: rgb(var(--{{total_class}}));">= {{total}} ({{total_label}})</span></div></div>';

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    // message-level variables
    userState: {[key: string]: SaveState} = {};

    // other
    client: any;
    users: {[key: string]: User} = {};
    characters: {[key: string]: Character} = {};
    globalModifier: number;
    outcomeTemplate: string;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        super(data);
        const {
            characters,
            users,
            messageState,
            config
        } = data;
        this.users = users;
        this.characters = characters;
        console.log(this.users);
        console.log(this.characters);
        this.globalModifier = config.difficultyModifier ?? 0;
        this.outcomeTemplate = config.outcomeTemplate ?? DEFAULT_OUTCOME_TEMPLATE;

        for (let user of Object.values(this.users)) {
            this.userState[user.anonymizedId] = this.initializeUserState();
        }
        this.setStateFromMessageState(messageState);
    }

    initializeUserState(): SaveState {
        return {
            lastOutcome: null,
            lastOutcomePrompt: ''
        }
    }

    getUserState(anonymizedId: string): SaveState {
        return this.userState[anonymizedId] ?? this.initializeUserState();
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        try {
            this.client = await Client.connect("Ravenok/statosphere-backend");
        } catch (error) {
            console.error(`Error connecting to backend.`);
        }

        console.log('Finished loading stage.');

        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        this.setStateFromMessageState(state);
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        const {
            anonymizedId,
            content,
            promptForId
        } = userMessage;

        let errorMessage: string|null = null;
        let takenAction: Action|null = null;
        let finalContent: string|undefined = content;

        if (finalContent) {
            let sequence = this.replaceTags(content,
                {"user": anonymizedId ? this.users[anonymizedId].name : '', "char": promptForId ? this.characters[promptForId].name : ''});

            const difficultyMapping:{[key: string]: number} = {
                '1 (simple or safe)': 1000,
                '2 (straightforward or fiddly)': 1,
                '3 (complex or tricky)': 0,
                '4 (challenging and risky)': -1,
                '5 (arduous and dangerous)': -2,
                '6 (virtually impossible)': -3};
            let difficultyRating:number = 0;
            const difficultyHypothesis = 'On a scale of 1-6, the difficulty of the narrator\'s actions is {}.';
            let difficultyResponse = await this.query({sequence: sequence, candidate_labels: Object.keys(difficultyMapping), hypothesis_template: difficultyHypothesis, multi_label: true });
            if (difficultyResponse && difficultyResponse.labels[0]) {
                console.log(`Difficulty modifier selected: ${difficultyMapping[difficultyResponse.labels[0]] + this.globalModifier}`);
                difficultyRating = difficultyMapping[difficultyResponse.labels[0]] + this.globalModifier;
            } else {
                difficultyRating = 0;
            }

            if (difficultyRating < 1000) {
                takenAction = new Action(finalContent, false, difficultyRating);
            } else {
                takenAction = new Action(finalContent, true, 0);
            }
        }

        let outcome: Outcome|null = null;
        if (takenAction) {
            this.setLastOutcome(anonymizedId, takenAction.determineSuccess());
            //finalContent = this.getUserState(anonymizedId).lastOutcome?.getDescription();
            outcome = this.getUserState(anonymizedId).lastOutcome;
        }

        finalContent = this.replaceTags(this.outcomeTemplate, {
            "content": content,
            "has_outcome": outcome && outcome.action && !outcome.action.free ? 'true' : 'false',
            "dice1_value": outcome ? `${outcome.dieResult1}` : '0',
            "dice1_emoji": outcome ? `${outcome.getDieEmoji(outcome.dieResult1)}` : '',
            "dice1_class": outcome ? `${outcome.getDieClass(outcome.dieResult1)}` : 'none',
            "dice2_value": outcome ? `${outcome.dieResult2}` : '0',
            "dice2_emoji": outcome ? `${outcome.getDieEmoji(outcome.dieResult2)}` : '',
            "dice2_class": outcome ? `${outcome.getDieClass(outcome.dieResult2)}` : 'none',
            "modifier_absolute": takenAction ? `${Math.abs(takenAction.difficultyModifier)}` : '',
            "modifier_sign": takenAction && takenAction.difficultyModifier >= 0 ? '+' : '-',
            "modifier_class": takenAction && outcome ? `${outcome.getDifficultyClass(takenAction.difficultyModifier - this.globalModifier)}` : 'none',
            "total": outcome ? `${outcome.total}` : '',
            "total_class": outcome ? ResultClass[outcome.result] : 'none',
            "total_label": outcome ? `${outcome.result}` : 'Free Action'
        });

        return {
            stageDirections: `\nCritical Instruction: ${this.replaceTags(this.getUserState(anonymizedId).lastOutcomePrompt,{
                "user": this.users[anonymizedId].name,
                "char": promptForId ? this.characters[promptForId].name : ''
            })}\n`,
            messageState: this.buildMessageState(),
            modifiedMessage: finalContent,
            systemMessage: null,
            error: errorMessage,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        Object.values(this.users).forEach(user => this.getUserState(user.anonymizedId).lastOutcomePrompt = '');

        return {
            stageDirections: null,
            messageState: this.buildMessageState(),
            modifiedMessage: null,
            error: null,
            systemMessage: null,
            chatState: null
        };
    }

    setStateFromMessageState(messageState: MessageStateType) {
        console.log('messageState:');
        console.log(messageState);
        for (let user of Object.values(this.users)) {
            let userState = this.getUserState(user.anonymizedId);
            if (messageState != null) {
                let lastOutcome = messageState[user.anonymizedId]?.['lastOutcome'] ?? messageState['lastOutcome'] ?? null;
                userState.lastOutcome = lastOutcome ? this.convertOutcome(lastOutcome) : null;
                userState.lastOutcomePrompt = messageState[user.anonymizedId]?.['lastOutcomePrompt'] ?? messageState['lastOutcomePrompt'] ?? '';
            }
            this.userState[user.anonymizedId] = userState;
        }
    }

    convertOutcome(input: any): Outcome {
        return new Outcome(input['dieResult1'], input['dieResult2'], this.convertAction(input['action']));
    }

    convertAction(input: any): Action {
        return new Action(input['description'], input['free'], input['difficultyModifier']);
    }

    buildMessageState(): any {
        let messageState: any = {};
        for (let user of Object.values(this.users)) {
            let userState: { [key: string]: any } = {};
            userState['lastOutcome'] = this.getUserState(user.anonymizedId).lastOutcome ?? null;
            userState['lastOutcomePrompt'] = this.getUserState(user.anonymizedId).lastOutcomePrompt ?? '';

            messageState[user.anonymizedId] = userState;
        }
        console.log('buildMessageState:');
        console.log(messageState);
        return messageState;
    }

    setLastOutcome(anonymizedId: string, outcome: Outcome|null) {
        this.getUserState(anonymizedId).lastOutcome = outcome;
        this.getUserState(anonymizedId).lastOutcomePrompt = '';
        if (this.getUserState(anonymizedId).lastOutcome) {
            this.getUserState(anonymizedId).lastOutcomePrompt += `{{user}} has chosen the following action: ${this.getUserState(anonymizedId).lastOutcome?.action.description ?? ''}\n`;
            this.getUserState(anonymizedId).lastOutcomePrompt += `${ResultDescription[this.getUserState(anonymizedId).lastOutcome?.result ?? Result.None]}\n`
            if (Object.values(this.users).length > 1) {
                this.getUserState(anonymizedId).lastOutcomePrompt += `Use third-person language for {{user}}.\n`;
            }
        }
    }

    replaceTags(source: string, replacements: {[name: string]: string}) {
        return source.replace(/{{([A-z|\d]*)}}/g, (match) => {
            return replacements[match.substring(2, match.length - 2)];
        });
    }

    async query(data: any) {
        let result: any = null;
        if (this.client) {
            try {
                const response = await this.client.predict("/predict", {data_string: JSON.stringify(data)});
                result = JSON.parse(`${response.data[0]}`);
            } catch(e) {
                console.log(e);
            }
        }
        if (result) {
            console.log({sequence: data.sequence, hypothesisTemplate: data.hypothesis_template, labels: result.labels, scores: result.scores});
        } else {
            console.warn('Disconnected from Hugging Face pipeline. Difficulty defaulting to 0');
        }
        return result;
    }

    render(): ReactElement {
        return <></>;
    }

}
