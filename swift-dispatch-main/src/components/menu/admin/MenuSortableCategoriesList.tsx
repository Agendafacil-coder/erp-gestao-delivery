import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Pencil, Trash2 } from "lucide-react";
import { reorderMenuCategoriesFn, type PublicMenuPayload } from "@/functions/menu";
import { clonePublicMenuPayload, reorderCategoriesInPayload } from "@/lib/menu/admin-state";
import { toast } from "sonner";

type CategoryRow = PublicMenuPayload["categories"][number];

type Props = {
  categories: CategoryRow[];
  tenantId: string;
  menu: PublicMenuPayload;
  onMenuChange: (menu: PublicMenuPayload) => void;
  editingCategoryId: string | null;
  editingCategoryName: string;
  onStartEdit: (cat: CategoryRow) => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onDelete: (categoryId: string, categoryName: string) => void;
  onDuplicate: (categoryId: string, categoryName: string) => void;
};

function SortableCategoryRow({
  cat,
  dragHandle,
  editingCategoryId,
  editingCategoryName,
  onStartEdit,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
}: {
  cat: CategoryRow;
  dragHandle?: { attributes: object; listeners?: Record<string, unknown>; isDragging?: boolean };
  editingCategoryId: string | null;
  editingCategoryName: string;
  onStartEdit: (cat: CategoryRow) => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: (categoryId: string) => void;
  onCancelEdit: () => void;
  onDelete: (categoryId: string, categoryName: string) => void;
  onDuplicate: (categoryId: string, categoryName: string) => void;
}) {
  const isEditing = editingCategoryId === cat.id;

  return (
    <li className="flex items-center justify-between gap-2 py-3.5 text-sm">
      {isEditing ? (
        <div className="flex flex-1 gap-2">
          <input
            value={editingCategoryName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(cat.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => onSaveEdit(cat.id)}
            className="erp-btn-primary text-xs px-3"
          >
            Salvar
          </button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {dragHandle ? (
              <button
                type="button"
                className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
                aria-label="Arrastar categoria"
                {...dragHandle.attributes}
                {...dragHandle.listeners}
              >
                <GripVertical className="size-4" />
              </button>
            ) : null}
            <span className="font-medium text-foreground/90 truncate">{cat.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="tabular-nums text-muted-foreground text-xs">{cat.items.length} itens</span>
            <button
              type="button"
              onClick={() => onStartEdit(cat)}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label={`Renomear ${cat.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(cat.id, cat.name)}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label={`Duplicar ${cat.name}`}
              title="Duplicar categoria e produtos"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(cat.id, cat.name)}
              className="size-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
              aria-label={`Excluir ${cat.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function DraggableCategoryRow(props: Omit<Props, "categories" | "tenantId" | "menu" | "onMenuChange"> & { cat: CategoryRow }) {
  const { cat, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
    disabled: rest.editingCategoryId === cat.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "relative z-50" : undefined}>
      <SortableCategoryRow
        cat={cat}
        dragHandle={{ attributes, listeners, isDragging }}
        {...rest}
      />
    </div>
  );
}

export function MenuSortableCategoriesList({
  categories,
  tenantId,
  menu,
  onMenuChange,
  editingCategoryId,
  editingCategoryName,
  onStartEdit,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDuplicate,
}: Props) {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const categoryIds = useMemo(() => sorted.map((c) => c.id), [sorted]);
  const [orderedIds, setOrderedIds] = useState(categoryIds);

  useEffect(() => {
    setOrderedIds(categoryIds);
  }, [categoryIds.join("|")]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const previousIds = orderedIds;
    const nextIds = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(nextIds);

    const snapshot = clonePublicMenuPayload(menu);
    onMenuChange(reorderCategoriesInPayload(menu, nextIds));

    void reorderMenuCategoriesFn({ data: { tenantId, orderedCategoryIds: nextIds } }).catch((e) => {
      onMenuChange(snapshot);
      setOrderedIds(previousIds);
      toast.error((e as Error).message);
    });
  };

  const orderedCategories = orderedIds
    .map((id) => sorted.find((c) => c.id === id))
    .filter((c): c is CategoryRow => c !== undefined);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-border/40">
          {orderedCategories.map((cat) => (
            <DraggableCategoryRow
              key={cat.id}
              cat={cat}
              editingCategoryId={editingCategoryId}
              editingCategoryName={editingCategoryName}
              onStartEdit={onStartEdit}
              onEditingNameChange={onEditingNameChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
