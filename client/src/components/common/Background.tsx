
import { Box } from "@chakra-ui/react";
import { useCallback } from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

export default function Background() {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine);
    }, []);

    return (
        <Box position={"fixed"} zIndex={"1"}>
            <Particles id="tsparticles" init={particlesInit} options={{
                "background": {
                    "color": "#0d47a1"
                },
                "particles": {
                    "number": {
                        "value": 8,
                        "density": {
                            "enable": true,
                            "value_area": 800
                        }
                    },
                    "color": {
                        "value": "#00008B"
                    },
                    "shape": {
                        "type": "polygon",
                        "polygon": {
                            "nb_sides": 4
                        }
                    },
                    "opacity": {
                        "value": 0.3,
                        "random": true,
                        "anim": {
                            "enable": false,
                            "speed": 1,
                            "opacity_min": 0.3,
                            "sync": false
                        }
                    },
                    "size": {
                        "value": 160,
                        "random": false,
                        "anim": {
                            "enable": true,
                            "speed": 10,
                            "size_min": 60,
                            "sync": false
                        }
                    },
                    "move": {
                        "enable": true,
                        "speed": 4,
                        "direction": "none",
                        "random": true,
                        "straight": false,
                        "out_mode": "bounce"
                    }
                }
            }} />
        </Box>
    )
}