import {
  Box,
  Button,
  Code,
  Divider,
  Flex,
  Heading,
  Select,
  SimpleGrid,
  Stack,
  TabPanel,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { getEnumKeys, SessionState } from "jparty-shared";
import { useContext } from "react";

import { LayoutContext } from "./Layout";
import { getClientID } from "../../misc/client-utils";
import { DebugCommand, handleDebugCommand } from "../../misc/debug-command";
import { socket } from "../../misc/socket";

export function DebugSessionStateSelect(sessionState: SessionState) {
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");

  return (
    <Select
      id={"debug-session-state-select"}
      value={sessionState}
      bg={inputBg}
      borderColor={borderColor}
      borderRadius="lg"
      focusBorderColor="blue.400"
      _hover={{ opacity: 1 }}
      onChange={(e) =>
        handleDebugCommand(
          DebugCommand.UpdateSessionState,
          parseInt(e.target.value)
        )
      }
    >
      {getEnumKeys(SessionState).map((_) => {
        const state: SessionState = parseInt(_);
        return (
          <option key={state} value={state}>
            {SessionState[state]}
          </option>
        );
      })}
    </Select>
  );
}

interface MenuPanel_DebugProps {
  customDebugElement?: JSX.Element;
}

export default function MenuPanel_Debug({
  customDebugElement,
}: MenuPanel_DebugProps) {
  const context = useContext(LayoutContext);

  if (!context.debugMode) {
    return null;
  }

  const cardBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.300");

  return (
    <TabPanel px={{ base: 4, md: 6 }} py={{ base: 4, md: 5 }}>
      <Flex justify="center">
        <Box w="full" maxW="lg">
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="2xl"
            boxShadow="md"
            overflow="hidden"
          >
            {/* Header */}
            <Box bg={headerBg} px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
              <Heading size="md" letterSpacing="tight">
                Debug
              </Heading>
              <Text fontSize="sm" color={muted} mt={1}>
                Developer tools and state controls
              </Text>
            </Box>

            <Divider />

            <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
              <Stack spacing={5}>
                <Box
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="xl"
                  p={4}
                  bg={headerBg}
                >
                  <Stack spacing={2}>
                    <Text fontSize="sm" color={muted}>
                      socket ID
                    </Text>
                    <Code borderRadius="md" px={2} py={1} fontSize="sm">
                      {socket.id}
                    </Code>

                    <Text fontSize="sm" color={muted} mt={2}>
                      client ID
                    </Text>
                    <Code borderRadius="md" px={2} py={1} fontSize="sm">
                      {getClientID()}
                    </Code>
                  </Stack>
                </Box>

                <Stack spacing={3}>
                  <Button
                    onClick={() =>
                      handleDebugCommand(DebugCommand.PopulatePlaceholderData)
                    }
                    colorScheme="blue"
                    variant="outline"
                    borderRadius="lg"
                  >
                    Populate placeholder data
                  </Button>

                  <Box>
                    <Text fontSize="sm" color={muted} mb={2}>
                      Session state
                    </Text>
                    {DebugSessionStateSelect(context.sessionState)}
                  </Box>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                    <Button
                      onClick={() =>
                        handleDebugCommand(DebugCommand.StartTimeout)
                      }
                      variant="outline"
                      borderRadius="lg"
                    >
                      Start timeout
                    </Button>
                    <Button
                      onClick={() =>
                        handleDebugCommand(DebugCommand.ShowAnnouncement)
                      }
                      variant="outline"
                      borderRadius="lg"
                    >
                      Show announcement
                    </Button>
                    <Button
                      onClick={() =>
                        handleDebugCommand(DebugCommand.HideAnnouncement)
                      }
                      variant="outline"
                      borderRadius="lg"
                    >
                      Hide announcement
                    </Button>
                  </SimpleGrid>

                  {customDebugElement && (
                    <Box
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="xl"
                      p={4}
                    >
                      {customDebugElement}
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Flex>
    </TabPanel>
  );
}
