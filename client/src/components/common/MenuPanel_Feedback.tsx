import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Link,
  Select,
  Stack,
  TabPanel,
  Text,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  ClientSocket,
  Feedback,
  FeedbackType,
  getEnumKeys,
  TriviaCategory,
} from "jparty-shared";
import { useContext, useState } from "react";

import { LayoutContext } from "./Layout";
import { socket } from "../../misc/socket";
import {
  FEEDBACK_TYPE_DISPLAY_NAMES,
  KNOWN_ISSUES_LINK,
} from "../../misc/ui-constants";

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
      category: category,
    };

    socket.emit(ClientSocket.SubmitFeedback, feedback);

    setFeedbackType(FeedbackType.Bug);
    setFeedbackMessage("");
    setFeedbackCategoryIndex(-1);
  };

  const panelBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const cardBg = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.300");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.100");

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
            <Box
              px={{ base: 4, md: 5 }}
              py={{ base: 3, md: 4 }}
              bg={panelBg}
              borderBottomWidth="1px"
              borderBottomColor={borderColor}
            >
              <Stack
                direction={{ base: "column", sm: "row" }}
                spacing={{ base: 2, sm: 3 }}
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
              >
                <Heading size="md" letterSpacing="tight">
                  Submit feedback
                </Heading>

                <Link
                  href={KNOWN_ISSUES_LINK}
                  isExternal
                  color={muted}
                  fontWeight="semibold"
                  fontSize="sm"
                  _hover={{ color: "inherit", textDecoration: "none" }}
                >
                  <HStack spacing={1}>
                    <Text as="u">Known issues</Text>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              </Stack>
            </Box>

            <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
              <Stack spacing={4}>
                {/* <Select
                  id={"feedback-type"}
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(parseInt(e.target.value))}
                  bg={inputBg}
                  borderColor={borderColor}
                  borderRadius="lg"
                  focusBorderColor="blue.400"
                >
                  {getEnumKeys(FeedbackType).map((_) => {
                    const type: FeedbackType = parseInt(_);
                    return (
                      <option key={type} value={type}>
                        {FEEDBACK_TYPE_DISPLAY_NAMES[type]}
                      </option>
                    );
                  })}
                </Select>

                <Select
                  id={"feedback-category-index"}
                  value={feedbackCategoryIndex}
                  onChange={(e) =>
                    setFeedbackCategoryIndex(parseInt(e.target.value))
                  }
                  placeholder={"(optional) specify a category"}
                  bg={inputBg}
                  borderColor={borderColor}
                  borderRadius="lg"
                  focusBorderColor="blue.400"
                >
                  {context.triviaRound?.categories.map(
                    (category: TriviaCategory, index: number) => {
                      return (
                        <option key={index} value={index}>
                          {category.name}
                        </option>
                      );
                    }
                  )}
                </Select> */}

                <Textarea
                  id={"feedback-text"}
                  placeholder={"Report a bug, share your opinion, etc."}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  bg={inputBg}
                  borderColor={borderColor}
                  borderRadius="lg"
                  focusBorderColor="blue.400"
                  resize="vertical"
                  minH="140px"
                />
              </Stack>
            </Box>

            <Box
              px={{ base: 4, md: 5 }}
              py={{ base: 3, md: 4 }}
              bg={panelBg}
              borderTopWidth="1px"
              borderTopColor={borderColor}
            >
              <Button
                onClick={emitSubmitFeedback}
                isDisabled={!feedbackMessage}
                colorScheme={"blue"}
                w="full"
                borderRadius="lg"
              >
                Submit
              </Button>
            </Box>
          </Box>
        </Box>
      </Flex>
    </TabPanel>
  );
}
