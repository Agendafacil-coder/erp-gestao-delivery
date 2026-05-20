import { Clock, Star, Bike } from "lucide-react";

type MenuHeroProps = {
  name: string;
};

/** Faixa compacta — menos altura no mobile */
export function MenuHero({ name }: MenuHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#ea1d2c] via-[#d41828] to-[#c41222] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.15),transparent_55%)]" />
      <div className="relative mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-lg font-bold backdrop-blur-sm">
          {name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-tight">{name}</h2>
          <p className="text-xs text-white/75">Pedido online · entrega</p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 text-[10px] font-medium sm:flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
            <Star className="size-2.5 fill-amber-300 text-amber-300" />
            4,8
          </span>
          <span className="inline-flex items-center gap-1 text-white/80">
            <Clock className="size-2.5" />
            35–50 min
          </span>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none sm:hidden">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium">
          <Star className="size-3 fill-amber-300 text-amber-300" />
          4,8
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium">
          <Clock className="size-3" />
          35–50 min
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium">
          <Bike className="size-3" />
          Entrega
        </span>
      </div>
    </div>
  );
}
