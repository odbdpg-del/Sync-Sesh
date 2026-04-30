import type { ReactNode } from "react";
import { PanelShell, type PanelShellDragInfo, type PanelShellRect } from "./PanelShell";

type FloatingWindowRect = PanelShellRect;

interface FloatingWindowProps {
  title: string;
  isOpen: boolean;
  initialRect: FloatingWindowRect;
  rect?: FloatingWindowRect;
  zIndex?: number;
  minWidth?: number;
  minHeight?: number;
  onClose: () => void;
  onRectChange?: (rect: FloatingWindowRect) => void;
  onInteractionEnd?: () => void;
  onFocusPanel?: () => void;
  onDragMove?: (info: PanelShellDragInfo) => void;
  onDragEnd?: (info: PanelShellDragInfo) => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function FloatingWindow({
  title,
  isOpen,
  initialRect,
  rect,
  zIndex,
  minWidth = 360,
  minHeight = 220,
  onClose,
  onRectChange,
  onInteractionEnd,
  onFocusPanel,
  onDragMove,
  onDragEnd,
  actions,
  children,
}: FloatingWindowProps) {
  return (
    <PanelShell
      title={title}
      isOpen={isOpen}
      initialRect={initialRect}
      rect={rect}
      zIndex={zIndex}
      minWidth={minWidth}
      minHeight={minHeight}
      onClose={onClose}
      onRectChange={onRectChange}
      onInteractionEnd={onInteractionEnd}
      onFocusPanel={onFocusPanel}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      actions={actions}
    >
      {children}
    </PanelShell>
  );
}
