import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns initial value when no stored value exists", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("stores and retrieves value from localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));
    
    act(() => {
      result.current[1]("new value");
    });

    expect(result.current[0]).toBe("new value");
    expect(localStorage.getItem("test-key")).toBe(JSON.stringify("new value"));
  });

  it("updates value using function updater", () => {
    const { result } = renderHook(() => useLocalStorage("test-key", 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it("handles complex objects", () => {
    const initialValue = { name: "Test", count: 0 };
    const { result } = renderHook(() => useLocalStorage("test-key", initialValue));
    
    act(() => {
      result.current[1]({ name: "Updated", count: 5 });
    });

    expect(result.current[0]).toEqual({ name: "Updated", count: 5 });
  });

  it("retrieves existing value from localStorage on mount", () => {
    localStorage.setItem("test-key", JSON.stringify("stored value"));
    
    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));
    expect(result.current[0]).toBe("stored value");
  });
});
