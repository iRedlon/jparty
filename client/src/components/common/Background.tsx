
import { BACKGROUND_COLOR, BACKGROUND_ACCENT_COLOR } from "../../misc/ui-constants";

import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useEffect } from "react";

export default function Background() {
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        });
    }, []);

    return (
        <Particles
            id="tsparticles"
            options={{
                fpsLimit: 120,
                background: {
                    color: {
                        value: BACKGROUND_COLOR,
                    },
                },
                particles: {
                    number: {
                        value: 12,
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