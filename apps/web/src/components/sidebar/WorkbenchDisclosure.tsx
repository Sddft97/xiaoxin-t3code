import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePresence } from "../../lib/workbenchMotion";

/**
 * Content that opens out of its header and folds back into it. It stays mounted while it
 * folds so the collapse can play, and is inert meanwhile; reduced motion shows and hides it
 * at once (see `.workbench-disclosure` in skins.css).
 */
export function WorkbenchDisclosure({ open, children }: { open: boolean; children: ReactNode }) {
  const presence = usePresence(open);
  if (!presence.mounted) return null;
  return (
    <div {...disclosureProps(presence)}>
      <div>{children}</div>
    </div>
  );
}

/** For containers that must keep their own element (a list item): spread onto it, wrap children in one div. */
export function disclosureProps({ closing, initial }: { closing: boolean; initial: boolean }) {
  return {
    className: "workbench-disclosure",
    "data-closing": closing ? "" : undefined,
    "data-initial": initial ? "" : undefined,
    inert: closing,
    "aria-hidden": closing || undefined,
  } as const;
}

/** One chevron that turns with its disclosure instead of swapping icons. */
export function DisclosureChevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <ChevronRightIcon
      aria-hidden
      className={cn(
        "size-3 transition-transform duration-(--motion-expand) ease-standard motion-reduce:transition-none",
        open && "rotate-90",
        className,
      )}
    />
  );
}
