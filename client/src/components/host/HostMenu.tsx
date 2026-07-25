import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
} from "@chakra-ui/react";
import { DEFAULT_VOICE_SPEED, HostServerSocket, SessionState, VoiceType } from "jparty-shared";
import { useContext, useEffect, useState } from "react";

import GameSettings from "./GameSettings";
import { LayoutContext } from "../common/Layout";
import MenuPanel_Credits from "../common/MenuPanel_Credits";
import MenuPanel_Debug from "../common/MenuPanel_Debug";
import MenuPanel_Feedback from "../common/MenuPanel_Feedback";
import MenuPanel_Settings from "../common/MenuPanel_Settings";
import { socket } from "../../misc/socket";
import { Layer } from "../../misc/ui-constants";

export default function HostMenu() {
  const context = useContext(LayoutContext);
  const [voiceType, setVoiceType] = useState(VoiceType.ModernMasculine);
  const [voiceSpeed, setVoiceSpeed] = useState(DEFAULT_VOICE_SPEED);
  const [modernVoicesDisabled, setModernVoicesDisabled] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    socket.on(HostServerSocket.UpdateVoiceType, handleUpdateVoiceType);
    socket.on(HostServerSocket.UpdateVoiceSpeed, handleUpdateVoiceSpeed);

    return () => {
      socket.off(HostServerSocket.UpdateVoiceType, handleUpdateVoiceType);
      socket.off(HostServerSocket.UpdateVoiceSpeed, handleUpdateVoiceSpeed);
    };
  }, []);

  const handleUpdateVoiceType = (
    voiceType: VoiceType,
    modernVoicesDisabled: boolean
  ) => {
    setVoiceType(voiceType);
    setModernVoicesDisabled(modernVoicesDisabled);
  };

  const handleUpdateVoiceSpeed = (voiceSpeed: number) => {
    setVoiceSpeed(voiceSpeed);
  };

  const menuTabs = [
    <Tab key={"settings-tab"}>Settings</Tab>,
    // <Tab key={"game-settings-tab"}>Custom Game</Tab>,
    <Tab key={"feedback-tab"}>Feedback</Tab>,
    <Tab key={"credits-tab"}>Credits</Tab>,
    context.debugMode && <Tab key={"debug-tab"}>Debug</Tab>,
  ];

  const menuPanels = [
    <MenuPanel_Settings
      key={"settings-tab-panel"}
      voiceType={voiceType}
      voiceSpeed={voiceSpeed}
      modernVoicesDisabled={modernVoicesDisabled}
    />,
    // <TabPanel key={"game-settings-tab-panel"}>
    //   <GameSettings onCloseHostMenu={onClose} />
    // </TabPanel>,
    <MenuPanel_Feedback key={"feedback-tab-panel"} />,
    <MenuPanel_Credits key={"credits-tab-panel"} />,
    context.debugMode && <MenuPanel_Debug key={"debug-tab-panel"} />,
  ];

  // menu button should be visible and accessible in any session state without obscuring the game
  const fixedButtonOpacity =
    context.sessionState === SessionState.Lobby ? 1 : 0.5;
  const zIndex = context.debugMode ? Layer.Fixed : Layer.Middle;

  return (
    <>
      <Button
        onClick={onOpen}
        _hover={{ opacity: 1 }}
        zIndex={zIndex}
        opacity={fixedButtonOpacity}
        position={"fixed"}
        top={"1em"}
        right={"1em"}
      >
        Menu
      </Button>

      <Modal motionPreset={"none"} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent
          height={"80vh"}
          minWidth={"60vw"}
          marginTop={"auto"}
          marginBottom={"auto"}
        >
          <ModalCloseButton zIndex={Layer.Middle} />
          <ModalBody overflow={"hidden"}>
            <Tabs display={"flex"} flexDirection={"column"} height={"100%"}>
              <TabList flexShrink={0} overflowX={"auto"} overflowY={"hidden"}>
                {menuTabs}
              </TabList>
              <TabPanels overflowY={"auto"} minHeight={0} sx={{ scrollbarGutter: "stable" }}>{menuPanels}</TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
