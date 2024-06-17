
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { AbsoluteCenter, Heading, Link, Stack, TabPanel, Text } from "@chakra-ui/react";

import { SOURCE_CODE_LINK } from "../../misc/ui-constants";

export default function MenuPanel_Credits() {
    return (
        <TabPanel>
            <AbsoluteCenter axis={"horizontal"} width={"100%"}>
                <Stack direction={"column"}>
                    <Heading size={"md"}>Credits</Heading>
                    <Link href={SOURCE_CODE_LINK} isExternal>
                        <u>Source code</u><ExternalLinkIcon mx={"2px"} />
                    </Link>

                    <Heading size={"sm"}>Programming and UI</Heading>
                    <Text>Isaac Redlon</Text>

                    <Heading size={"sm"}>Additional Programming</Heading>
                    <Text>Theodore Redlon</Text>

                    <Heading size={"sm"}>Trivia Clues</Heading>
                    <Text>J! Archive</Text>

                    <Heading size={"sm"}>Voice</Heading>
                    <Text>OpenAI Text to Speech</Text>

                    <Heading size={"sm"}>Music</Heading>
                    <Text>
                        Data Stream of Consciousness - Aldous Ichnite<br />
                        Free Music Archive (CC BY-NC)
                    </Text>

                    <Heading size={"sm"}>Fonts</Heading>
                    <Text>
                        SquareFont (Bou Fonts)<br />
                        Rheiborn Sans (Bartosz Wesolek)<br />
                        OPTIKorinna-Agency (Castcraft Software)
                    </Text>
                </Stack>
            </AbsoluteCenter>
        </TabPanel>
    );
}