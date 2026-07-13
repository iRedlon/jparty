
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadTextShape } from "@tsparticles/shape-text";
import { loadSlim } from "@tsparticles/slim";
import { useEffect, useState } from "react";

import {
    BACKGROUND_THEME_CHANGE_EVENT, BACKGROUND_THEME_COLORS, BackgroundTheme, getBackgroundParticlesEnabled, getBackgroundTheme
} from "../../misc/background-theme";

export default function Background() {
    const [theme, setTheme] = useState(getBackgroundTheme());
    const [particlesEnabled, setParticlesEnabled] = useState(getBackgroundParticlesEnabled());

    const isKaleidoscope = theme === BackgroundTheme.Kaleidoscope;

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
            await loadTextShape(engine);
        });

        const handleThemeChange = () => {
            setTheme(getBackgroundTheme());
            setParticlesEnabled(getBackgroundParticlesEnabled());
        };

        window.addEventListener(BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange);

        return () => window.removeEventListener(BACKGROUND_THEME_CHANGE_EVENT, handleThemeChange);
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        if (theme === BackgroundTheme.Kaleidoscope) {
            root.style.backgroundColor = "";
            root.classList.add("kaleidoscope-canvas");
        } else {
            root.classList.remove("kaleidoscope-canvas");
            root.style.backgroundColor = BACKGROUND_THEME_COLORS[theme].backgroundColor;
        }
    }, [theme]);

    const themeColors = BACKGROUND_THEME_COLORS[theme];

    return (
        <div className={isKaleidoscope ? "kaleidoscope-background" : "solid-background"}
            style={isKaleidoscope ? undefined : { backgroundColor: themeColors.backgroundColor }}>

            {!isKaleidoscope && particlesEnabled && <Particles
                key={theme}
                id={"tsparticles"}
                options={{
                    fpsLimit: 120,
                    background: {
                        color: {
                            value: themeColors.backgroundColor,
                        },
                    },
                    particles: {
                        number: {
                            value: 16,
                            density: {
                                enable: true,
                                width: 1920,
                                height: 1080
                            }
                        },
                        color: {
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
            />}
        </div>
    )
};
