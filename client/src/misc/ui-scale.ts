
import { LocalStorageKey } from "./ui-constants";

export const DEFAULT_UI_SCALE = 100;
export const MIN_UI_SCALE = 50;
export const MAX_UI_SCALE = 150;

export function getUIScale(): number {
    const storedScale = parseInt(localStorage[LocalStorageKey.UIScale]);

    if (!isNaN(storedScale) && (storedScale >= MIN_UI_SCALE) && (storedScale <= MAX_UI_SCALE)) {
        return storedScale;
    }

    return DEFAULT_UI_SCALE;
}

export function updateUIScale(scale: number) {
    localStorage[LocalStorageKey.UIScale] = scale;
    applyUIScale();
}

export function applyUIScale() {
    const scale = getUIScale();

    document.documentElement.style.fontSize = (scale === DEFAULT_UI_SCALE) ? "" : `${scale}%`;
}
