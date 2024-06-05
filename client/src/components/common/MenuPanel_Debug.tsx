
import { LayoutContext } from "./Layout";
import { getClientID } from "../../misc/client-utils";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { socket } from "../../misc/socket";

import { AbsoluteCenter, Box, Button, Select, Stack, TabPanel } from "@chakra-ui/react";
import { getEnumKeys, SessionState } from "jparty-shared";
import { useContext } from "react";

export function DebugSessionStateSelect(sessionState: SessionState) {
    return (
        <Select
            value={sessionState} _hover={{ opacity: 1 }}
            onChange={(e) => handleDebugCommand(DebugCommand.UpdateSessionState, parseInt(e.target.value))}>
            {getEnumKeys(SessionState).map((_) => {
                const state: SessionState = parseInt(_);
                return (<option key={state} value={state}>{SessionState[state]}</option>);
            })}
        </Select>
    );
}

interface MenuPanel_DebugProps {
    customDebugElement?: JSX.Element
}

export default function MenuPanel_Debug({ customDebugElement }: MenuPanel_DebugProps) {
    const context = useContext(LayoutContext);

    if (!context.debugMode) {
        return <></>;
    }

    return (
        <>
            <TabPanel>
                <AbsoluteCenter axis={"horizontal"}>
                    <Stack direction={"column"}>
                        <Box>
                            socket ID: {socket.id}<br />
                            client ID: {getClientID()}
                        </Box>

                        <Button onClick={() => handleDebugCommand(DebugCommand.PopulatePlaceholderData)}>Populate placeholder data</Button>

                        {DebugSessionStateSelect(context.sessionState)}

                        <Button onClick={() => handleDebugCommand(DebugCommand.StartTimeout)}>Start timeout</Button>
                        <Button onClick={() => handleDebugCommand(DebugCommand.ShowAnnouncement)}>Show announcement</Button>
                        <Button onClick={() => handleDebugCommand(DebugCommand.HideAnnouncement)}>Hide announcement</Button>

                        {customDebugElement}
                    </Stack>
                </AbsoluteCenter>
            </TabPanel>
        </>
    );
}