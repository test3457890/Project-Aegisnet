import { useState, useRef, useEffect, cloneElement } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

export function ActionMenu({
  trigger,
  items,
  align = "end"
}: {
  trigger: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  items: ActionMenuItem[];
  align?: "start" | "end" | "center";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let left = rect.left;
      if (align === "end") {
        left = rect.right - 192; // 192px is w-48
      } else if (align === "center") {
        left = rect.left + rect.width / 2 - 96;
      }
      // Ensure it stays in viewport
      const top = rect.bottom + 4;
      setCoords({ top, left: Math.max(8, left) });
    }
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={triggerRef}>
        {cloneElement(trigger, {
          type: "button",
          "aria-expanded": open,
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((wasOpen) => !wasOpen);
          },
        })}
      </div>
      {open && createPortal(
        <div 
          ref={menuRef} 
          className="fixed z-[100] w-48 rounded-xl border border-border-default bg-surface-card p-1 text-text-primary shadow-xl"
          style={{ top: coords.top, left: coords.left }}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={`sep-${i}`} className="my-1 h-px bg-border-default" />;
            }
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${item.danger ? "text-danger-readable hover:bg-danger/10" : "hover:bg-surface-hover"}`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
