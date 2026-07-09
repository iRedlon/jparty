
// custom background themes, selected from the "Appearance" menu tab and persisted in localStorage

import { LocalStorageKey } from "./ui-constants";

export const BACKGROUND_THEME_CHANGE_EVENT = "backgroundThemeChange";

export enum BackgroundTheme {
    Blue = "blue",
    Red = "red",
    Green = "green",
    Kaleidoscope = "kaleidoscope"
}

export const BACKGROUND_THEME_DISPLAY_NAMES: Record<BackgroundTheme, string> = {
    [BackgroundTheme.Blue]: "Blue",
    [BackgroundTheme.Red]: "Red",
    [BackgroundTheme.Green]: "Green",
    [BackgroundTheme.Kaleidoscope]: "Kaleidoscope"
}

interface BackgroundThemeColors {
    backgroundColor: string,
    accentColor: string
}

export const BACKGROUND_THEME_COLORS: Record<BackgroundTheme, BackgroundThemeColors> = {
    [BackgroundTheme.Blue]: { backgroundColor: "#0d47a1", accentColor: "#00008b" },
    [BackgroundTheme.Red]: { backgroundColor: "#9d1818", accentColor: "#5c0000" },
    [BackgroundTheme.Green]: { backgroundColor: "#1b5e20", accentColor: "#003300" },
    [BackgroundTheme.Kaleidoscope]: { backgroundColor: "#46178f", accentColor: "#ffffff" }
}

export const KALEIDOSCOPE_PARTICLE_COLORS = ["#c81e3c", "#cf8a00", "#26890c", "#1368ce", "#9c27b0"];

export const BACKGROUND_THEME_SWATCHES: Record<BackgroundTheme, string> = {
    [BackgroundTheme.Blue]: "#0d47a1",
    [BackgroundTheme.Red]: "#9d1818",
    [BackgroundTheme.Green]: "#1b5e20",
    [BackgroundTheme.Kaleidoscope]: "linear-gradient(135deg, #46178f 0%, #1368ce 25%, #26890c 50%, #cf8a00 75%, #c81e3c 100%)"
}

export function getBackgroundTheme(): BackgroundTheme {
    const storedTheme = localStorage[LocalStorageKey.BackgroundTheme];

    if (Object.values(BackgroundTheme).includes(storedTheme)) {
        return storedTheme as BackgroundTheme;
    }

    return BackgroundTheme.Blue;
}

export function updateBackgroundTheme(theme: BackgroundTheme) {
    localStorage[LocalStorageKey.BackgroundTheme] = theme;
    window.dispatchEvent(new Event(BACKGROUND_THEME_CHANGE_EVENT));
}
