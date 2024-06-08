
import { LayoutContext } from "./Layout";
import { socket } from "../../misc/socket";
import { FEEDBACK_TYPE_DISPLAY_NAMES } from "../../misc/ui-constants";

import { AbsoluteCenter, Box, Button, Heading, ListItem, Select, TabPanel, Textarea, UnorderedList } from "@chakra-ui/react";
import { ClientSocket, Feedback, FeedbackType, getEnumKeys, TriviaCategory } from "jparty-shared";
import { useContext, useState } from "react";

export default function MenuPanel_Feedback() {
    const context = useContext(LayoutContext);

    const [feedbackType, setFeedbackType] = useState(FeedbackType.Bug);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackCategoryIndex, setFeedbackCategoryIndex] = useState(-1);

    const emitSubmitFeedback = () => {
        const category = context.triviaRound?.categories[feedbackCategoryIndex];

        const feedback: Feedback = {
            type: feedbackType,
            message: feedbackMessage,
            category: category
        }

        socket.emit(ClientSocket.SubmitFeedback, feedback);

        setFeedbackType(FeedbackType.Bug);
        setFeedbackMessage("");
        setFeedbackCategoryIndex(-1);
    }

    return (
        <TabPanel>
            <AbsoluteCenter axis={"horizontal"} width={"100%"}>
                <Heading size={"md"}>Known issues</Heading>
                
                <UnorderedList listStylePosition={"inside"} margin={"0 auto"} marginBottom={"1em"}>
                    <ListItem>Border lines of player scoreboard sometimes don't update visually</ListItem>
                </UnorderedList>

                <Heading size={"md"}>Submit feedback</Heading>

                <Box marginTop={"1em"} marginBottom={"1em"}>
                    <Select
                        value={feedbackType}
                        onChange={e => setFeedbackType(parseInt(e.target.value))}>

                        {getEnumKeys(FeedbackType).map((_) => {
                            const type: FeedbackType = parseInt(_);
                            return (<option key={type} value={type}>{FEEDBACK_TYPE_DISPLAY_NAMES[type]}</option>);
                        })}
                    </Select>

                    <Select
                        value={feedbackCategoryIndex}
                        onChange={e => setFeedbackCategoryIndex(parseInt(e.target.value))}
                        marginTop={"1em"} placeholder={"(optional) specify a category"}>
                            
                        {context.triviaRound?.categories.map((category: TriviaCategory, index: number) => {
                            return <option key={index} value={index}>{category.name}</option>;
                        })}
                    </Select>

                    <Box margin={"1em"} />

                    <Textarea
                        placeholder={"Please include details, if applicable"}
                        value={feedbackMessage}
                        onChange={e => setFeedbackMessage(e.target.value)} />
                </Box>

                <Button onClick={emitSubmitFeedback} isDisabled={!feedbackMessage} marginBottom={"1em"} colorScheme={"blue"}>Submit</Button>
            </AbsoluteCenter>
        </TabPanel>
    );
}