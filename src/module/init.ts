export function registerInitHook(): void {
  Hooks.once("init", () => {
    console.log("Onomasticon | Initializing");
  });
}
