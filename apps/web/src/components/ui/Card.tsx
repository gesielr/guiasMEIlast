import { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, title, className = "", padding = "md" }: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 ${paddingClasses[padding]} ${className}`}
    >
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  );
}
