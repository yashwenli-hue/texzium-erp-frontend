"use client";

import { useEffect, useRef } from "react";

/**
 * A dialog's error after a failed save (the backend's refusal, a network failure). Announced to
 * assistive technology (role="alert") and scrolled into view: in a long dialog the message sits
 * below the fields, and without this a refusal looked like "nothing happened".
 */
export function FormError({ message }: { message: string | null | undefined }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [message]);
  if (!message) return null;
  return (
    <p ref={ref} role="alert" className="form-error-msg">
      {message}
    </p>
  );
}
