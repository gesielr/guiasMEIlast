import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 500));
    expect(result.current).toBe("test");
  });

  it("debounces value changes", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    expect(result.current).toBe("initial");

    rerender({ value: "updated", delay: 500 });
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("updated");

    vi.useRealTimers();
  });

  it("cancels previous timeout on rapid changes", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 500 } }
    );

    rerender({ value: "second", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: "third", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("first");

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("third");

    vi.useRealTimers();
  });
});
