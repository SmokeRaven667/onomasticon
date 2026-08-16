type HookFn = (...args: unknown[]) => unknown;

/**
 * Minimal, real (not mocked-away) implementation of the pieces of Foundry's global `Hooks`
 * API that test code touches — just enough that importing module code with hook-registration
 * side effects doesn't crash under plain Node. Individual tests can still `vi.spyOn` its
 * methods for behavioral assertions. Expand only as later steps actually need more of it.
 */
class HooksStub {
  private handlers = new Map<string, HookFn[]>();

  on(hook: string, fn: HookFn): void {
    const list = this.handlers.get(hook) ?? [];
    list.push(fn);
    this.handlers.set(hook, list);
  }

  once(hook: string, fn: HookFn): void {
    const wrapped: HookFn = (...args) => {
      this.off(hook, wrapped);
      return fn(...args);
    };
    this.on(hook, wrapped);
  }

  off(hook: string, fn: HookFn): void {
    const list = this.handlers.get(hook);
    if (!list) return;
    this.handlers.set(
      hook,
      list.filter((registered) => registered !== fn),
    );
  }

  callAll(hook: string, ...args: unknown[]): void {
    for (const fn of [...(this.handlers.get(hook) ?? [])]) fn(...args);
  }
}

// @ts-expect-error - fvtt-types declares Hooks as an ambient `const`, not a globalThis property.
globalThis.Hooks = new HooksStub() as unknown as typeof Hooks;
