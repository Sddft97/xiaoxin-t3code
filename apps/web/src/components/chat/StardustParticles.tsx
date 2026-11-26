import { useEffect, useRef, useState } from "react";
import * as Schema from "effect/Schema";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTheme } from "../../hooks/useTheme";
import { getThemeDefinition, resolveThemeHalf } from "../../themePalette";
import { mountStardustParticles } from "./stardustParticlesCanvas";

export function useStardustMotionPreference() {
  return useLocalStorage("stardust:background-motion", true, Schema.Boolean);
}

export function StardustParticles({ busy }: { busy: boolean }) {
  const [enabled] = useStardustMotionPreference();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { theme, themeHalves, resolvedTheme } = useTheme();
  const darkStardust =
    resolvedTheme === "dark" &&
    getThemeDefinition(resolveThemeHalf(theme, themeHalves, resolvedTheme))?.id === "stardust";
  const bridge = window.desktopBridge;
  const [onBattery, setOnBattery] = useState<boolean | undefined>(undefined);

  // Subscribe before querying so an AC transition cannot be lost during startup.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reflects Electron power events into the backdrop
  useEffect(() => {
    if (!enabled || reducedMotion || !darkStardust || !bridge?.getOnBatteryPower) return;
    let receivedEvent = false;
    let active = true;
    const unsubscribe = bridge.onBatteryPowerChange?.((value) => {
      receivedEvent = true;
      setOnBattery(value);
    });
    void bridge.getOnBatteryPower().then(
      (value) => {
        if (active && !receivedEvent) setOnBattery(value);
      },
      () => {
        if (active && !receivedEvent) setOnBattery(true);
      },
    );
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [bridge, darkStardust, enabled, reducedMotion]);

  if (!enabled || reducedMotion || !darkStardust) return null;
  return <ParticleCanvas paused={busy || (bridge !== undefined && onBattery !== false)} />;
}

function ParticleCanvas({ paused }: { paused: boolean }) {
  const engine = useRef<ReturnType<typeof mountStardustParticles> | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- canvas owns the resize and timer lifetimes
  useEffect(() => {
    if (!canvas) return;
    const mounted = mountStardustParticles(canvas);
    engine.current = mounted;
    return () => {
      mounted?.destroy();
      engine.current = null;
    };
  }, [canvas]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- pause the imperative loop without discarding particle positions
  useEffect(() => {
    if (canvas) engine.current?.setPaused(paused);
  }, [canvas, paused]);

  return <canvas aria-hidden data-stardust-particles ref={setCanvas} />;
}
