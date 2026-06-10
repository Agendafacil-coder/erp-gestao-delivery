import type { ReactNode } from "react";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

type MenuStickyFooterProps = {
  children: ReactNode;
  className?: string;
};

/** Barra fixa inferior com safe-area e fade — carrinho, checkout, etc. */
export function MenuStickyFooter({ children, className }: MenuStickyFooterProps) {
  return (
    <div className="menu-sticky-footer">
      <div className={cn("mx-auto w-full", MENU_PAGE_MAX, className)}>{children}</div>
    </div>
  );
}
