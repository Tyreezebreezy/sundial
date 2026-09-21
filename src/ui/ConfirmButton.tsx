import { useEffect, useState, type ReactNode } from "react";

const CONFIRM_WINDOW_MS = 4000;

/**
 * Two-step destructive action without a modal: the first press arms it (the
 * label changes to the confirmation wording), the second press within a few
 * seconds runs it. Focus leaving or the window elapsing disarms it.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = "btn btn--danger",
}: {
  label: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={className}
      data-confirming={armed}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
