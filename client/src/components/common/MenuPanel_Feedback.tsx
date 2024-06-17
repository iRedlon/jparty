
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { AbsoluteCenter, Box, Button, Heading, Link, Select, TabPanel, Textarea } from "@chakra-ui/react";
import { ClientSocket, Feedback, FeedbackType, getEnumKeys, TriviaCategory } from "jparty-shared";
import { useContext, useState } from "react";

import { LayoutContext } from "./Layout";
import { socket } from "../../misc/socket";
import { FEEDBACK_TYPE_DISPLAY_NAMES, KNOWN_ISSUES_LINK, ROADMAP_LINK } from "../../misc/ui-constants";

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
                <Heading size={"md"} marginBottom={"0.5em"}>Submit feedback</Heading>

                <Link href={KNOWN_ISSUES_LINK} isExternal>
                    <u>Known issues</u><ExternalLinkIcon mx={"2px"} />
                </Link>

                <br />

                <Link href={ROADMAP_LINK} isExternal>
                    <u>Roadmap</u><ExternalLinkIcon mx={"2px"} />
                </Link>

                <Box marginTop={"1em"} marginBottom={"1em"}>
                    <Select
                        id={"feedback-type"}
                        value={feedbackType}
                        onChange={e => setFeedbackType(parseInt(e.target.value))}>

                        {getEnumKeys(FeedbackType).map((_) => {
                            const type: FeedbackType = parseInt(_);
                            return (<option key={type} value={type}>{FEEDBACK_TYPE_DISPLAY_NAMES[type]}</option>);
                        })}
                    </Select>

                    <Select
                        id={"feedback-category-index"}
                        value={feedbackCategoryIndex}
                        onChange={e => setFeedbackCategoryIndex(parseInt(e.target.value))}
                        marginTop={"1em"} placeholder={"(optional) specify a category"}>

                        {context.triviaRound?.categories.map((category: TriviaCategory, index: number) => {
                            return <option key={index} value={index}>{category.name}</option>;
                        })}
                    </Select>

                    <Box margin={"1em"} />

                    <Textarea
                        id={"feedback-text"}
                        placeholder={"Please include details, if applicable"}
                        value={feedbackMessage}
                        onChange={e => setFeedbackMessage(e.target.value)} />
                </Box>

                <Button onClick={emitSubmitFeedback} isDisabled={!feedbackMessage} marginBottom={"1em"} colorScheme={"blue"}>Submit</Button>
            </AbsoluteCenter>
        </TabPanel>
    );
}