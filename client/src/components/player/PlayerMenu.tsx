
import { LayoutContext } from "../common/Layout";
import MenuPanel_Debug, { DebugSessionStateSelect } from "../common/MenuPanel_Debug";
import MenuPanel_Feedback from "../common/MenuPanel_Feedback";
import MenuPanel_Settings from "../common/MenuPanel_Settings";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { Layer } from "../../misc/ui-constants";

import {
    Box, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay,
    Select, Tabs, TabList, TabPanels, Tab, useDisclosure
} from "@chakra-ui/react";
import { getEnumKeys, PlayerState } from "jparty-shared";
import { useContext } from "react";

export default function PlayerMenu() {
    const context = useContext(LayoutContext);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const debugPlayerStateSelect = (
        <Select
            value={context.sessionPlayers["socket1"]?.state} _hover={{ opacity: 1 }}
            onChange={(e) => handleDebugCommand(DebugCommand.UpdatePlayerState, parseInt(e.target.value))}>
            {getEnumKeys(PlayerState).map((_) => {
                const state: PlayerState = parseInt(_);
                return (<option key={state} value={state}>{PlayerState[state]}</option>);
            })}
        </Select>
    );

    const menuTabs = [
        <Tab key={"settings-tab"}>Settings</Tab>,
        <Tab key={"feedback-tab"}>Feedback</Tab>,
        context.debugMode && <Tab key={"debug-tab"}>Debug</Tab>
    ];

    const menuPanels = [
        <MenuPanel_Settings key={"settings-panel"} />,
        <MenuPanel_Feedback key={"feedback-panel"} />,
        context.debugMode && <MenuPanel_Debug key={"debug-panel"} customDebugElement={debugPlayerStateSelect} />
    ];

    const zIndex = context.debugMode ? Layer.Fixed : Layer.Middle;

    return (
        <>
            <Button onClick={onOpen} position={"fixed"} bottom={"1em"} right={"1em"} colorScheme={"red"} zIndex={zIndex}>Menu</Button>

            {/* {
                context.debugMode && (
                    <>
                        <Button onClick={() => handleDebugCommand(DebugCommand.PopulatePlaceholderData)} zIndex={zIndex} position={"fixed"} bottom={"7em"} right={"1em"}>
                            Populate placeholder data
                        </Button>

                        <Box backgroundColor={"white"} zIndex={zIndex} position={"fixed"} bottom={"4em"} right={"1em"}>
                            {DebugSessionStateSelect(context.sessionState)}
                        </Box>
                    </>
                )
            } */}

            <Modal motionPreset={"none"} isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent overflowY={"scroll"} height={"80vh"} width={"80vw"} marginTop={"auto"} marginBottom={"auto"}>
                    <ModalCloseButton zIndex={Layer.Bottom} />
                    <ModalBody>
                        <Tabs>
                            <TabList overflowX={"scroll"} overflowY={"hidden"} marginRight={"1em"}>{menuTabs}</TabList>
                            <TabPanels>{menuPanels}</TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}