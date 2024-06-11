
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect } from "react";
import { isMobile } from "react-device-detect";

import { BACKGROUND_ACCENT_COLOR, BACKGROUND_COLOR } from "../../misc/ui-constants";

export default function Background() {
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        });
    }, []);

    const numParticles = isMobile ? 6 : 16;

    return (
        <Particles
            id={"tsparticles"}
            options={{
                fpsLimit: 120,
                background: {
                    color: {
                        value: BACKGROUND_COLOR,
                    },
                },
                particles: {
                    number: {
                        value: numParticles,
                    },
                    color: {
                        value: BACKGROUND_ACCENT_COLOR,
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
                        speed: 8,
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