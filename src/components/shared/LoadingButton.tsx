import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  showSpinner?: boolean;
  children: React.ReactNode;
}

/**
 * Standardized loading button component.
 * 
 * Design system rules:
 * - Always 50% opacity when disabled/loading
 * - Always cursor-wait when loading
 * - Shows spinner icon for primary actions (showSpinner=true)
 * - Maintains button dimensions during loading state
 */
export default function LoadingButton({
  isLoading = false,
  loadingText,
  showSpinner = false,
  children,
  disabled,
  className = "",
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${className} ${isLoading ? "cursor-wait opacity-50" : ""}`}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      {isLoading && showSpinner && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
