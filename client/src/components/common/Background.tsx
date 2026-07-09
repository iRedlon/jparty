
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadTextShape } from "@tsparticles/shape-text";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useState } from "react";

import {
    BACKGROUND_THEME_CHANGE_EVENT, BACKGROUND_THEME_COLORS, BackgroundTheme, getBackgroundTheme, KALEIDOSCOPE_PARTICLE_COLORS
} from "../../misc/background-theme";

export default function Background() {
    const [theme, setTheme] = useState(getBackgroundTheme());

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
            await loadTextShape(engine);
        });

        const handleThemeChange = () => setTheme(getBackgroundTheme());
        window.addEventListener(BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange);

        return () => window.removeEventListener(BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange);
    }, []);

    const isKaleidoscope = theme === BackgroundTheme.Kaleidoscope;
    const themeColors = BACKGROUND_THEME_COLORS[theme];

    return (
        <Particles
            key={theme}
            id={"tsparticles"}
            className={isKaleidoscope ? "kaleidoscope-background" : undefined}
            options={{
                fpsLimit: 120,
                background: {
                    color: {
                        value: isKaleidoscope ? "transparent" : themeColors.backgroundColor,
                    },
                },
                particles: {
                    number: {
                        // make density consistent on any screen size
                        value: 16,
                        density: {
                            enable: true,
                            width: 1920,
                            height: 1080
                        }
                    },
                    color: isKaleidoscope ? {
                        value: KALEIDOSCOPE_PARTICLE_COLORS,
                        animation: {
                            h: {
                                enable: true,
                                speed: 10
                            }
                        }
                    } : {
                        value: themeColors.accentColor,
                    },
                    shape: {
                        type: "square",
                    },
                    move: {
                        direction: "none",
                        enable: true,
                        outModes: {
                            default: "out",
                        },
                        speed: 2,
                        straight: false
                    },
                    size: {
                        value: {
                            min: 150,
                            max: 200,
                        },
                        animation: {
                            startValue: "random",
                            enable: true,
                            speed: 20
                        }
                    },
                    opacity: {
                        value: {
                            min: 0.3,
                            max: 0.5,
                        },
                        animation: {
                            startValue: "random",
                            enable: true,
                            speed: 0.2
                        }
                    }
                },
                detectRetina: true
            }}
        />
    )
};
