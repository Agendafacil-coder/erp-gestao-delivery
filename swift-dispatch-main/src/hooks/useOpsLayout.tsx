import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { OPS_NAV_BREAKPOINT } from "@/hooks/use-mobile";

type OpsLayoutContextValue = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  tvMode: boolean;
  setTvMode: (on: boolean) => void;
  sidebarHidden: boolean;
};

const OpsLayoutContext = createContext<OpsLayoutContextValue | null>(null);

export function OpsLayoutProvider({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tvMode, setTvMode] = useState(false);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((v) => !v);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${OPS_NAV_BREAKPOINT}px)`);
    const closeWhenDesktop = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    closeWhenDesktop();
    mq.addEventListener("change", closeWhenDesktop);
    return () => mq.removeEventListener("change", closeWhenDesktop);
  }, []);

  const sidebarHidden = tvMode;

  return (
    <OpsLayoutContext.Provider
      value={{
        mobileNavOpen,
        setMobileNavOpen,
        toggleMobileNav,
        tvMode,
        setTvMode,
        sidebarHidden,
      }}
    >
      {children}
    </OpsLayoutContext.Provider>
  );
}

export function useOpsLayout() {
  const ctx = useContext(OpsLayoutContext);
  if (!ctx) {
    throw new Error("useOpsLayout must be used within OpsLayoutProvider");
  }
  return ctx;
}
