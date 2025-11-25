import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert } from "../Alert";

describe("Alert", () => {
  it("renders with children", () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText("Alert message")).toBeInTheDocument();
  });

  it("applies info variant styles by default", () => {
    const { container } = render(<Alert>Test</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass("bg-blue-50", "text-blue-800", "border-blue-200");
  });

  it("applies success variant styles", () => {
    const { container } = render(<Alert variant="success">Test</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass("bg-green-50", "text-green-800", "border-green-200");
  });

  it("applies warning variant styles", () => {
    const { container } = render(<Alert variant="warning">Test</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass("bg-yellow-50", "text-yellow-800", "border-yellow-200");
  });

  it("applies error variant styles", () => {
    const { container } = render(<Alert variant="error">Test</Alert>);
    const alert = container.firstChild;
    expect(alert).toHaveClass("bg-red-50", "text-red-800", "border-red-200");
  });
});
