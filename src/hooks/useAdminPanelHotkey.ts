import { useEffect, useState } from "react";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function useAdminPanelHotkey(enabled: boolean) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Backquote" || event.repeat || isInteractiveTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setIsOpen((current) => !current);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);

  return {
    isOpen,
    setIsOpen,
  };
}

