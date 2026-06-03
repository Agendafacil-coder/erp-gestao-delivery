import { Clock, Star } from "lucide-react";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

type MenuHeroProps = {
  name: string;
};

/** Cabeçalho da loja — uma faixa, sem duplicar o título do header */
export function MenuHero({ name }: MenuHeroProps) {
  return (
    <div className="bg-[#ea1d2c] text-white">
      <div className={cn("px-4 pb-4 pt-3", MENU_PAGE_MAX, "mx-auto w-full")}>
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">{name}</h1>
            <p className="mt-0.5 text-xs text-white/80">Pedido online · entrega</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
            <Star className="size-3 fill-amber-300 text-amber-300" />
            4,8
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90">
            <Clock className="size-3" />
            35–50 min
          </span>
        </div>
      </div>
    </div>
  );
}
