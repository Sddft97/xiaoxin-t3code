export class GalaxyEffortCanvas {
  constructor(host: HTMLElement, level: number, appearance: "light" | "dark");
  setValue(level: number): void;
  wake(): void;
  destroy(): void;
}
