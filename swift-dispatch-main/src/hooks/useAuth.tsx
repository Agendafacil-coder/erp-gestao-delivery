import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authRepository } from "@/lib/repositories";

interface AuthCtx {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
    };
  } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => {},
  signUp: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthCtx["user"]>(null);
  const [loading, setLoading] = useState(true);

  const mapUser = (localUser: { id: string; email: string; full_name: string }) => ({
    id: localUser.id,
    email: localUser.email,
    user_metadata: { full_name: localUser.full_name },
  });

  useEffect(() => {
    const unsubscribe = authRepository.onAuthStateChange((localUser) => {
      setUser(localUser ? mapUser(localUser) : null);
      setLoading(false);
    });

    authRepository
      .getUser()
      .then((localUser) => {
        setUser(localUser ? mapUser(localUser) : null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await authRepository.signOut();
    setUser(null);
  };

  const signIn = async (email: string, password: string) => {
    const localUser = await authRepository.signIn(email, password);
    setUser(mapUser(localUser));
  };

  const signUp = async (email: string, name: string, password: string) => {
    const localUser = await authRepository.signUp(email, name, password);
    setUser(mapUser(localUser));
  };

  return (
    <Ctx.Provider value={{ user, loading, signOut, signIn, signUp }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
