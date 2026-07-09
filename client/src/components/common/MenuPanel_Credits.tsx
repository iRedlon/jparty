import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Flex,
  Heading,
  HStack,
  Link,
  Stack,
  TabPanel,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

import { BUY_ME_A_COFFEE_LINK, SOURCE_CODE_LINK } from "../../misc/ui-constants";

type CreditRowProps = {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
};

function CreditRow({ label, children, isLast }: CreditRowProps) {
  const labelColor = useColorModeValue("gray.600", "gray.300");
  const dividerColor = useColorModeValue("gray.200", "whiteAlpha.200");

  return (
    <Box py={2}>
      <Flex
        gap={{ base: 1, md: 5 }}
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "baseline" }}
      >
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={labelColor}
          minW={{ md: "200px" }}
        >
          {label}
        </Text>

        <Box flex="1">{children}</Box>
      </Flex>

      {!isLast && (
        <Box mt={2} borderBottomWidth="1px" borderColor={dividerColor} />
      )}
    </Box>
  );
}

export default function MenuPanel_Credits() {
  const cardBg = useColorModeValue("white", "gray.900");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.300");

  return (
    <TabPanel px={{ base: 4, md: 6 }} py={3}>
      <Flex justify="center">
        <Box w="full" maxW="2xl">
          <Stack spacing={3}>
            <Stack spacing={1} align="center" textAlign="center">
              <Heading size="md" letterSpacing="tight">
                Credits
              </Heading>

              <Link
                href={SOURCE_CODE_LINK}
                isExternal
                fontSize="sm"
                fontWeight="semibold"
                color={muted}
                _hover={{ color: "inherit", textDecoration: "none" }}
              >
                <HStack spacing={1}>
                  <Text as="u">Source code</Text>
                  <ExternalLinkIcon />
                </HStack>
              </Link>
            </Stack>

            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="xl"
              boxShadow="sm"
              px={4}
              py={3}
            >
              <CreditRow label="Programming and UI">
                <Text>Isaac Redlon</Text>
              </CreditRow>

              <CreditRow label="Additional Programming">
                <Text>Theodore Redlon</Text>
              </CreditRow>

              <CreditRow label="Trivia Clues">
                <Text>J! Archive</Text>
              </CreditRow>

              <CreditRow label="Voice">
                <Text>OpenAI Text to Speech</Text>
              </CreditRow>

              <CreditRow label="Music">
                <Text>
                  Jeopardy Theme Song Remix - Attic Stein
                </Text>

                <br />

                <Text>
                  Data Stream of Consciousness - Aldous Ichnite
                  <br />
                  Free Music Archive (CC BY-NC)
                </Text>
              </CreditRow>

              <CreditRow label="Fonts" isLast>
                <Text>
                  SquareFont (Bou Fonts)
                  <br />
                  Rheiborn Sans (Bartosz Wesolek)
                  <br />
                  OPTIKorinna-Agency (Castcraft Software)
                </Text>
              </CreditRow>
            </Box>

            <Stack spacing={2} align="center" textAlign="center" pt={1}>
              <Link
                href={BUY_ME_A_COFFEE_LINK}
                isExternal
                bg="#FFDD00"
                color="black"
                fontWeight="bold"
                px={5}
                py={2.5}
                borderRadius="full"
                boxShadow="sm"
                _hover={{ textDecoration: "none", boxShadow: "md", transform: "translateY(-1px)" }}
              >
                Buy me a coffee
              </Link>

              <Text fontSize="xs" color={muted} maxW="sm">
                 jparty will always be 100% free. Donations help pay for the cost of web hosting and API usage
              </Text>
            </Stack>
          </Stack>
        </Box>
      </Flex>
    </TabPanel>
  );
}
