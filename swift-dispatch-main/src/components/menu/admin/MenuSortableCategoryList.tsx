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
import { reorderMenuItemsFn, type MenuItemDto, type PublicMenuPayload } from "@/functions/menu";
import { clonePublicMenuPayload, reorderDisplayedInCategory } from "@/lib/menu/admin-state";
import { MenuProductRow } from "@/components/menu/admin/MenuProductRow";
import { toast } from "sonner";

type MenuSortableCategoryListProps = {
  categoryId: string;
  categoryName: string;
  items: MenuItemDto[];
  listTab: "ativos" | "pausados";
  tenantId: string;
  categories: PublicMenuPayload["categories"];
  menu: PublicMenuPayload;
  onMenuChange: (menu: PublicMenuPayload) => void;
  onEdit: (item: MenuItemDto, categoryId: string) => void;
  onDelete: (itemId: string) => Promise<void>;
  onAvailabilityChange?: (available: boolean) => void;
};

function SortableProductRow(
  props: Omit<MenuSortableCategoryListProps, "items"> & {
    item: MenuItemDto;
  },
) {
  const { item, categoryName, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-50" : undefined}
    >
      <MenuProductRow
        {...rest}
        item={item}
        categoryName={categoryName}
        dragHandle={{ attributes, listeners, isDragging }}
      />
    </div>
  );
}

export function MenuSortableCategoryList({
  categoryId,
  categoryName,
  items,
  listTab,
  tenantId,
  categories,
  menu,
  onMenuChange,
  onEdit,
  onDelete,
  onAvailabilityChange,
}: MenuSortableCategoryListProps) {
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const itemIds = useMemo(() => sortedItems.map((i) => i.id), [sortedItems]);
  const [orderedIds, setOrderedIds] = useState(itemIds);

  useEffect(() => {
    setOrderedIds(itemIds);
  }, [itemIds.join("|")]);

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
    const nextDisplayedIds = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(nextDisplayedIds);

    const snapshot = clonePublicMenuPayload(menu);
    const { menu: nextMenu, fullOrderedIds } = reorderDisplayedInCategory(
      menu,
      categoryId,
      nextDisplayedIds,
    );
    onMenuChange(nextMenu);

    void reorderMenuItemsFn({
      data: { tenantId, categoryId, orderedItemIds: fullOrderedIds },
    }).catch((e) => {
      onMenuChange(snapshot);
      setOrderedIds(previousIds);
      toast.error((e as Error).message);
    });
  };

  const orderedItems = orderedIds
    .map((id) => sortedItems.find((i) => i.id === id))
    .filter((i): i is MenuItemDto => i !== undefined);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2.5">
          {orderedItems.map((item) => (
            <SortableProductRow
              key={item.id}
              item={item}
              categoryId={categoryId}
              categoryName={categoryName}
              listTab={listTab}
              tenantId={tenantId}
              categories={categories}
              menu={menu}
              onMenuChange={onMenuChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onAvailabilityChange={onAvailabilityChange}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
