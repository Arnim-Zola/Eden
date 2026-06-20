import React, { useEffect, useRef, useState } from 'react';

// Inline className helper (no clsx/tailwind-merge dependency needed)
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Helper for random hex colors
const randomColors = (count) => {
    return new Array(count)
        .fill(0)
        .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
};

export function TubesBackground({
    children,
    className,
    style,
    enableClickInteraction = true,
}) {
    const canvasRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const tubesRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        let cleanup;

        const initTubes = async () => {
            console.log("Eden Tubes: initTubes triggered. canvasRef.current:", canvasRef.current);
            if (!canvasRef.current) return;
            try {
                console.log("Eden Tubes: Importing from CDN...");
                // Native dynamic import from CDN — works in modern browsers via Vite
                const module = await import(
                    /* @vite-ignore */
                    'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'
                );
                console.log("Eden Tubes: Module imported successfully");
                const TubesCursor = module.default;
                console.log("Eden Tubes: TubesCursor function loaded");

                if (!mounted) {
                    console.log("Eden Tubes: Component unmounted before initialization finished.");
                    return;
                }

                console.log("Eden Tubes: Calling TubesCursor...");
                const app = TubesCursor(canvasRef.current, {
                    tubes: {
                        colors: ["#f967fb", "#53bc28", "#6958d5"],
                        lights: {
                            intensity: 200,
                            colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
                        },
                    },
                });
                console.log("Eden Tubes: TubesCursor initialized successfully.");

                tubesRef.current = app;
                setIsLoaded(true);

                const handleResize = () => {
                    // The lib manages its own canvas sizing internally in most builds;
                    // kept as a hook point in case manual resize is ever needed.
                };
                window.addEventListener('resize', handleResize);

                cleanup = () => {
                    console.log("Eden Tubes: Cleanup triggered.");
                    window.removeEventListener('resize', handleResize);
                    if (app && typeof app.dispose === 'function') {
                        console.log("Eden Tubes: Disposing app instance...");
                        app.dispose();
                    }
                };
            } catch (error) {
                console.error("Eden Tubes: Error in initTubes:", error);
            }
        };

        initTubes();

        return () => {
            mounted = false;
            if (cleanup) cleanup();
        };
    }, []);

    const handleClick = () => {
        if (!enableClickInteraction || !tubesRef.current) return;

        const colors = randomColors(3);
        const lightsColors = randomColors(4);

        tubesRef.current.tubes.setColors(colors);
        tubesRef.current.tubes.setLightsColors(lightsColors);
    };

    return (
        <div
            className={cn("relative w-full h-full min-h-[400px] overflow-hidden bg-background", className)}
            style={style}
            onClick={handleClick}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block"
                style={{ touchAction: 'none', pointerEvents: 'none' }}
            />

            {/* Content overlay — pointer-events-none REMOVED so inputs/buttons/tabs stay interactive */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}

export default TubesBackground;