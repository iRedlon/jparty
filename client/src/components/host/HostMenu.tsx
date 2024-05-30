
import GameSettings from "./GameSettings";
import { LayoutContext } from "../common/Layout";
import MenuPanel_Debug from "../common/MenuPanel_Debug";
import MenuPanel_Feedback from "../common/MenuPanel_Feedback";
import MenuPanel_Settings from "../common/MenuPanel_Settings";

import {
    Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalOverlay,
    Tabs, TabList, TabPanels, Tab, TabPanel, useDisclosure
} from "@chakra-ui/react";
import { SessionState } from "jparty-shared";
import { useContext } from "react";

export default function HostMenu() {
    const context = useContext(LayoutContext);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const menuTabs = [
        <Tab key={"settings-tab"}>Settings</Tab>,
        <Tab key={"game-settings-tab"}>Custom Game</Tab>,
        <Tab key={"feedback-tab"}>Feedback</Tab>,
        context.debugMode && <Tab key={"debug-tab"}>Debug</Tab>
    ];

    const menuPanels = [
        <MenuPanel_Settings key={"settings-tab-panel"} />,
        <TabPanel key={"game-settings-tab-panel"}><GameSettings onCloseHostMenu={onClose} /></TabPanel>,
        <MenuPanel_Feedback key={"feedback-tab-panel"} />,
        context.debugMode && <MenuPanel_Debug key={"debug-tab-panel"} />
    ];

    // menu button should be visible and accessible in any session state without obscuring the game
    const fixedButtonOpacity = (context.sessionState === SessionState.Lobby) ? 1 : 0.5;
    const zIndex = context.debugMode ? "9999" : "99";

    return (
        <>
            <Button onClick={onOpen} _hover={{ opacity: 1 }} position={"fixed"} zIndex={zIndex} top={"1em"} right={"1em"} opacity={fixedButtonOpacity} colorScheme={"gray"}>
                Menu
            </Button>

            <Modal motionPreset={"none"} isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent overflowY={"auto"} height={"80vh"} minWidth={"60vw"} marginTop={"auto"} marginBottom={"auto"}>
                    <ModalCloseButton zIndex={10} />
                    <ModalBody>
                        <Tabs>
                            <TabList overflowX={"auto"} overflowY={"hidden"}>{menuTabs}</TabList>
                            <TabPanels>{menuPanels}</TabPanels>
                        </Tabs>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
}