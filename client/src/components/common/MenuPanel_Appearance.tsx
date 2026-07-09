import {
  Box,
  Divider,
  Flex,
  Heading,
  Stack,
  TabPanel,
  Text,
  useColorModeValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useState } from "react";

import {
  BACKGROUND_THEME_DISPLAY_NAMES,
  BACKGROUND_THEME_SWATCHES,
  BackgroundTheme,
  getBackgroundTheme,
  updateBackgroundTheme,
} from "../../misc/background-theme";

export default function MenuPanel_Appearance() {
  const [theme, setTheme] = useState(getBackgroundTheme());

  const selectTheme = (newTheme: BackgroundTheme) => {
    setTheme(newTheme);
    updateBackgroundTheme(newTheme);
  };

  const cardBg = useColorModeValue("white", "gray.900");
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
          >
            <Box px={{ base: 4, md: 5 }} py={{ base: 3, md: 4 }}>
              <Heading size="md">Background theme</Heading>
            </Box>

            <Divider />

            <Box px={{ base: 4, md: 5 }} py={{ base: 4, md: 5 }}>
              <Wrap spacing={5} justify="center">
                {Object.values(BackgroundTheme).map((themeOption) => (
                  <WrapItem key={themeOption}>
                    <Stack spacing={2} align="center">
                      <Box
                        as="button"
                        onClick={() => selectTheme(themeOption)}
                        height="4.5em"
                        width="4.5em"
                        borderRadius="xl"
                        background={BACKGROUND_THEME_SWATCHES[themeOption]}
                        outline={
                          theme === themeOption ? "3px solid" : "1px solid"
                        }
                        outlineColor={
                          theme === themeOption ? "blue.400" : borderColor
                        }
                        outlineOffset="2px"
                      />
                      <Text
                        fontSize="sm"
                        fontWeight={theme === themeOption ? "bold" : "normal"}
                      >
                        {BACKGROUND_THEME_DISPLAY_NAMES[themeOption]}
                      </Text>
                    </Stack>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          </Box>
        </Box>
      </Flex>
    </TabPanel>
  );
}
