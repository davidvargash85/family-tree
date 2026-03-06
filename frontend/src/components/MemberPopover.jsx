import { useEffect, useMemo } from "react";
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/react";
import { createPortal } from "react-dom";
import MemberDetail from "./MemberDetail";

const popoverWrapStyle = {
  zIndex: 1000,
  outline: "none",
};

/**
 * Renders MemberDetail in a floating popover anchored to a virtual rect.
 * @param {Object} props
 * @param {string} props.treeId
 * @param {string} props.memberId
 * @param {boolean} props.canEdit
 * @param {() => void} props.onClose
 * @param {DOMRect | { left: number, top: number, width?: number, height?: number } | null} props.anchorRect - getBoundingClientRect-like; when null, popover is not shown
 */
export default function MemberPopover({ treeId, memberId, canEdit, onClose, onDeleted, onRequestDelete, anchorRect }) {
  const virtualElement = useMemo(
    () =>
      anchorRect
        ? {
            getBoundingClientRect: () => ({
              width: anchorRect.width ?? 0,
              height: anchorRect.height ?? 0,
              x: anchorRect.left,
              y: anchorRect.top,
              top: anchorRect.top,
              left: anchorRect.left,
              right: anchorRect.right ?? anchorRect.left + (anchorRect.width ?? 0),
              bottom: anchorRect.bottom ?? anchorRect.top + (anchorRect.height ?? 0),
            }),
          }
        : null,
    [anchorRect]
  );

  const { refs, floatingStyles } = useFloating({
    open: !!memberId && !!anchorRect,
    placement: "bottom-start",
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(virtualElement);
  }, [refs, virtualElement]);

  useEffect(() => {
    if (!memberId || !anchorRect) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    const handlePointerDown = (e) => {
      const floating = refs.floating.current;
      if (floating && !floating.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [memberId, anchorRect, onClose, refs.floating]);

  if (!memberId || !anchorRect) return null;

  return createPortal(
    <div
      ref={refs.setFloating}
      style={{ ...popoverWrapStyle, ...floatingStyles }}
      role="dialog"
      aria-labelledby="member-popover-title"
    >
      <MemberDetail
        treeId={treeId}
        memberId={memberId}
        canEdit={canEdit}
        onClose={onClose}
        onDeleted={onDeleted}
        onRequestDelete={onRequestDelete}
        placement="popover"
      />
    </div>,
    document.body
  );
}
