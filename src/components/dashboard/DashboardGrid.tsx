"use client";

/**
 * DashboardGrid — the customizable, scrollable, card-based dashboard
 * (Cluster 2.0 — Dashboard Refactor).
 *
 * The grid is a 2-column CSS grid on desktop (some cards span the
 * full width, others sit side-by-side) and a 1-column stack on
 * mobile. In view mode, every card is a tap-through target. In
 * customize mode, cards get a drag handle (the whole card becomes
 * draggable), an X to remove, and the entire card body becomes
 * non-navigable.
 *
 * Layout (order + visibility) persists to localStorage on every
 * change. The default order ships with the 3 user-requested cards
 * (Daily Tracking, Critical Timeline, Envelope Status) plus Next
 * Step; the catalog contains 3 more (Top Priority, Snapshot) the
 * user can opt in to. A "Reset to default" button in the Add Card
 * sheet restores the default layout.
 *
 * Drag-and-drop uses @dnd-kit (already in package.json from
 * Cluster 0). The grid is a single linear list; CSS controls the
 * visual sizing (full vs half).
 */

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CARD_CATALOG,
  CARD_META,
  defaultLayout,
  loadLayout,
  saveLayout,
  type CardId,
  type CardMeta,
  type DashboardLayout,
} from "./catalog";

// ---------------------------------------------------------------------------
// Context — lets the pre-rendered DashboardCard children know whether
// the grid is in edit mode. The grid owns the state, the cards listen.
// ---------------------------------------------------------------------------

const DashboardEditingContext = React.createContext(false);
export function useDashboardEditing(): boolean {
  return React.useContext(DashboardEditingContext);
}

export interface DashboardGridProps {
  /** Pre-rendered card bodies, keyed by card id. */
  cardNodes: Record<CardId, React.ReactNode>;
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export function DashboardGrid({ cardNodes }: DashboardGridProps) {
  const [layout, setLayout] = React.useState<DashboardLayout>(defaultLayout);
  const [editing, setEditing] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [showAdd, setShowAdd] = React.useState(false);

  // Load from localStorage after mount (avoids SSR mismatch).
  React.useEffect(() => {
    setLayout(loadLayout());
    setHydrated(true);
  }, []);

  // Persist on change (only after hydration).
  React.useEffect(() => {
    if (hydrated) saveLayout(layout);
  }, [layout, hydrated]);

  // Sync order from one tab to another (nice-to-have).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("compass-dashboard")) {
        setLayout(loadLayout());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleIds = layout.order;
  const hiddenIds = React.useMemo(
    () => CARD_CATALOG.filter((c) => !visibleIds.includes(c.id)),
    [visibleIds],
  );

  const handleDragEnd = React.useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      const oldIndex = visibleIds.indexOf(active.id as CardId);
      const newIndex = visibleIds.indexOf(over.id as CardId);
      if (oldIndex < 0 || newIndex < 0) return;
      setLayout({ order: arrayMove(visibleIds, oldIndex, newIndex) });
    },
    [visibleIds],
  );

  const moveBy = React.useCallback(
    (id: CardId, delta: -1 | 1) => {
      const idx = visibleIds.indexOf(id);
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= visibleIds.length) return;
      setLayout({ order: arrayMove(visibleIds, idx, target) });
    },
    [visibleIds],
  );

  const handleRemove = React.useCallback(
    (id: CardId) => {
      setLayout({ order: visibleIds.filter((x) => x !== id) });
    },
    [visibleIds],
  );

  const handleAdd = React.useCallback(
    (id: CardId) => {
      setLayout({ order: [...visibleIds, id] });
      setShowAdd(false);
    },
    [visibleIds],
  );

  const handleReset = React.useCallback(() => {
    setLayout(defaultLayout());
    setShowAdd(false);
  }, []);

  return (
    <DashboardEditingContext.Provider value={editing}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleIds}
          strategy={rectSortingStrategy}
        >
          <div className="dashboard-grid">
            {visibleIds.map((id, index) => {
              const node = cardNodes[id];
              if (!node) return null;
              return (
                <SortableCard
                  key={id}
                  id={id}
                  editing={editing}
                  isFirst={index === 0}
                  isLast={index === visibleIds.length - 1}
                  onMoveUp={() => moveBy(id, -1)}
                  onMoveDown={() => moveBy(id, 1)}
                  onRemove={() => handleRemove(id)}
                >
                  {node}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>

        {/* Customize bar: add card + done. Shown only in edit mode. */}
        {editing && (
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "center",
              gap: 12,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={hiddenIds.length === 0}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: "var(--vessel-surface)",
                color:
                  hiddenIds.length === 0 ? "var(--ink-5)" : "var(--vessel-accent)",
                border: `1px solid ${
                  hiddenIds.length === 0 ? "var(--vessel-border)" : "var(--vessel-accent)"
                }`,
                borderRadius: 2,
                padding: "12px 22px",
                cursor: hiddenIds.length === 0 ? "default" : "pointer",
                transition: "all 160ms",
              }}
            >
              + Add card
              {hiddenIds.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                  }}
                >
                  ({hiddenIds.length})
                </span>
              )}
            </button>
          </div>
        )}
      </DndContext>

      {/* Customize toggle — sticky, bottom-right. */}
      <CustomizeToggle
        editing={editing}
        onToggle={() => setEditing((v) => !v)}
        visibleCount={visibleIds.length}
      />

      {/* Add card sheet */}
      {showAdd && (
        <AddCardSheet
          hidden={hiddenIds}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
          onReset={handleReset}
        />
      )}
    </DashboardEditingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Customize toggle (sticky bottom-right)
// ---------------------------------------------------------------------------

function CustomizeToggle({
  editing,
  onToggle,
  visibleCount,
}: {
  editing: boolean;
  onToggle: () => void;
  visibleCount: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={editing ? "Done customizing dashboard" : "Customize dashboard"}
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        background: editing ? "var(--vessel-accent)" : "var(--vessel-surface)",
        color: editing ? "var(--void)" : "var(--vessel-accent)",
        border: `1px solid ${
          editing ? "var(--vessel-accent)" : "var(--vessel-border)"
        }`,
        borderRadius: 2,
        padding: "12px 18px",
        cursor: "pointer",
        boxShadow: editing
          ? "0 0 16px rgba(168, 85, 247, 0.35), 0 8px 24px rgba(0, 0, 0, 0.4)"
          : "0 4px 16px rgba(0, 0, 0, 0.35)",
        transition: "all 200ms cubic-bezier(0.2, 0.7, 0.3, 1)",
      }}
      className="dashboard-customize-toggle"
    >
      {editing ? (
        <>
          <span
            aria-hidden
            style={{
              fontSize: 12,
              lineHeight: 1,
              fontFamily: "var(--font-jetbrains), monospace",
            }}
          >
            [OK]
          </span>
          <span>DONE · {visibleCount} CARDS</span>
        </>
      ) : (
        <>
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>✎</span>
          <span>CUSTOMIZE</span>
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SortableCard — wraps a pre-rendered DashboardCard with dnd-kit wiring
// ---------------------------------------------------------------------------

function SortableCard({
  id,
  editing,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  id: CardId;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const meta = CARD_META[id];
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 5 : 1,
    position: "relative",
    gridColumn: meta.span === "full" ? "1 / -1" : undefined,
  };

  // Inject editing props into the pre-rendered DashboardCard child.
  const enhancedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{
        editing?: boolean;
        onMoveUp?: () => void;
        onMoveDown?: () => void;
        onRemove?: () => void;
        isFirst?: boolean;
        isLast?: boolean;
      }>, {
        editing,
        onMoveUp,
        onMoveDown,
        onRemove,
        isFirst,
        isLast,
      })
    : children;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-card-wrapper={id}
      data-dragging={isDragging || undefined}
    >
      {editing ? (
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            touchAction: "none",
          }}
          aria-label={`Drag to reorder ${meta.title}`}
        >
          {enhancedChild}
        </div>
      ) : (
        enhancedChild
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddCardSheet — bottom sheet listing the hidden cards + reset button
// ---------------------------------------------------------------------------

function AddCardSheet({
  hidden,
  onAdd,
  onClose,
  onReset,
}: {
  hidden: CardMeta[];
  onAdd: (id: CardId) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="Add a card"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(6, 8, 15, 0.6)",
        backdropFilter: "blur(6px)",
        display: "grid",
        alignItems: "end",
        justifyItems: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "80vh",
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          borderTop: "1px solid var(--vessel-accent)",
          borderRadius: 4,
          padding: "28px 32px 24px",
          overflow: "auto",
          boxShadow: "0 -16px 64px rgba(0, 0, 0, 0.5)",
        }}
        className="dashboard-add-sheet"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: "1px solid var(--vessel-border)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--vessel-accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              // configure
            </div>
            <h2
              style={{
                fontFamily: "var(--font-sora)",
                fontWeight: 600,
                fontSize: 22,
                color: "var(--ink)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Add a card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              width: 36,
              height: 36,
              color: "var(--ink-2)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {hidden.length === 0 ? (
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink-2)",
              textAlign: "center",
              padding: "32px 0",
            }}
          >
            [OK] All available cards are already on your dashboard.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {hidden.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onAdd(c.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 18,
                    alignItems: "center",
                    padding: "16px 18px",
                    background: "var(--vessel-surface)",
                    border: "1px solid var(--vessel-border)",
                    borderLeft: `2px solid var(--${c.accent === "gold" ? "gold" : c.accent})`,
                    borderRadius: 3,
                    color: "inherit",
                    cursor: "pointer",
                    font: "inherit",
                    transition: "background 160ms, border-color 160ms",
                  }}
                  className="dashboard-add-row"
                >
                  <span
                    aria-hidden
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 18,
                      background: "var(--vessel-dark)",
                      border: "1px solid var(--vessel-border)",
                    }}
                  >
                    {c.glyph}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-sora)",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--ink)",
                        marginBottom: 3,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-sora)",
                        fontSize: 13,
                        color: "var(--ink-2)",
                        lineHeight: 1.45,
                      }}
                    >
                      {c.description}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--vessel-accent)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      padding: "4px 8px",
                      border: "1px solid var(--vessel-accent-soft)",
                      borderRadius: 2,
                    }}
                  >
                    + Add
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid var(--vessel-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={onReset}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              background: "transparent",
              color: "var(--ink-3)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              padding: "10px 16px",
              cursor: "pointer",
              transition: "color 160ms, border-color 160ms",
            }}
          >
            ↺ Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              background: "var(--vessel-accent)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              cursor: "pointer",
              transition: "filter 160ms",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
