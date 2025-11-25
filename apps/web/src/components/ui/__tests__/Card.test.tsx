import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  it("renders with children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass("custom-class");
  });

  it("applies default styles", () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass("rounded-lg", "border", "bg-white", "p-6", "shadow-md");
  });
});
