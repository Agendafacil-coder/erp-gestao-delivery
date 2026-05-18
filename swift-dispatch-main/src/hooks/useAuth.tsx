import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authRepository, type LocalUser } from "@/lib/repositories";

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
  signIn: (email: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ 
  user: null, 
  loading: true, 
  signOut: async () => {},
  signIn: async () => {} 
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthCtx["user"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to repository session change triggers
    const unsubscribe = authRepository.onAuthStateChange((localUser) => {
      if (localUser) {
        setUser({
          id: localUser.id,
          email: localUser.email,
          user_metadata: {
            full_name: localUser.full_name
          }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Check initial session
    authRepository.getUser().then((localUser) => {
      if (localUser) {
        setUser({
          id: localUser.id,
          email: localUser.email,
          user_metadata: {
            full_name: localUser.full_name
          }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await authRepository.signOut();
    setUser(null);
  };

  const signIn = async (email: string) => {
    const localUser = await authRepository.signIn(email);
    setUser({
      id: localUser.id,
      email: localUser.email,
      user_metadata: {
        full_name: localUser.full_name
      }
    });
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        signOut,
        signIn
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);