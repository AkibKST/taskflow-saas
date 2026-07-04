"use client";
import { useEffect, useRef, useState, FC } from "react";
import { Avatar } from "@/components/ui";

export interface PickerMember {
  userId: string;
  name: string;
  email?: string;
}

interface AssigneePickerProps {
  members: PickerMember[];
  selected: string[]; // selected userIds
  onChange: (userIds: string[]) => void;
  /** Compact avatar trigger (for task cards) vs. full-width field (for forms). */
  compact?: boolean;
}

/**
 * Multi-select dropdown for choosing task assignees from the project's members.
 * Used both in the create-task modal and inline on task cards.
 */
export const AssigneePicker: FC<AssigneePickerProps> = ({
  members,
  selected,
  onChange,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (userId: string) => {
    onChange(
      selected.includes(userId)
        ? selected.filter((id) => id !== userId)
        : [...selected, userId],
    );
  };

  const selectedMembers = members.filter((m) => selected.includes(m.userId));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          compact
            ? "flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 outline-none transition-colors hover:border-brand-400 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
            : "flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-600 shadow-sm outline-none transition-colors hover:border-gray-400 focus-visible:ring-4 focus-visible:ring-brand-500/15"
        }
      >
        {selectedMembers.length === 0 ? (
          <span>{compact ? "+ Assign" : "Assign members…"}</span>
        ) : compact ? (
          <span className="flex -space-x-1.5">
            {selectedMembers.slice(0, 3).map((m) => (
              <Avatar
                key={m.userId}
                id={m.userId}
                name={m.name}
                size="xs"
                className="border border-white"
              />
            ))}
            {selectedMembers.length > 3 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-200 text-[11px] text-gray-600">
                +{selectedMembers.length - 3}
              </span>
            )}
          </span>
        ) : (
          <span className="truncate">
            {selectedMembers.map((m) => m.name).join(", ")}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 max-h-56 w-56 overflow-auto rounded-2xl border border-gray-100 bg-white p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {members.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">No project members</p>
          ) : (
            members.map((m) => {
              const isSel = selected.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => toggle(m.userId)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Avatar id={m.userId} name={m.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-gray-700">{m.name}</span>
                  {isSel && (
                    <svg className="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5 10 17.5 19 6.5" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
