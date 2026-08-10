import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "patient" | "gp";

export type Practice = { id: string; name: string; code: string };

export type Account = {
  userId: string;
  email: string | null;
  fullName: string;
  role: Role | null;
  practiceId: string | null;
  practice: Practice | null;
};

type Status = "loading" | "signedOut" | "signedIn";

type Ctx = {
  status: Status;
  account: Account | null;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    role: Role;
    fullName: string;
    practiceName?: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

type Meta = { role?: Role; full_name?: string; practice_name?: string };

async function loadAccount(): Promise<Account | null> {
  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user;
  if (error || !user) return null;

  const meta = (user.user_metadata ?? {}) as Meta;

  const readRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    return (data?.role as Role | undefined) ?? null;
  };

  let role = await readRole();
  if (!role) {
    const args = {
      _role: (meta.role === "gp" ? "gp" : "patient") as Role,
      _full_name: meta.full_name ?? "",
      ...(meta.practice_name ? { _practice_name: meta.practice_name } : {}),
    };
    await supabase.rpc("bootstrap_account", args);
    role = await readRole();
  }


  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, practice_id")
    .eq("id", user.id)
    .maybeSingle();

  let practice: Practice | null = null;
  if (role === "gp") {
    const { data } = await supabase
      .from("practices")
      .select("id, name, code")
      .eq("gp_id", user.id)
      .limit(1)
      .maybeSingle();
    practice = (data as Practice | null) ?? null;
  } else if (profile?.practice_id) {
    const { data } = await supabase
      .from("practices")
      .select("id, name, code")
      .eq("id", profile.practice_id)
      .maybeSingle();
    practice = (data as Practice | null) ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name || meta.full_name || "",
    role,
    practiceId: profile?.practice_id ?? null,
    practice,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const busy = useRef(false);

  const hydrate = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await loadAccount();
      setAccount(next);
      setStatus(next ? "signedIn" : "signedOut");
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    void hydrate();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAccount(null);
        setStatus("signedOut");
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") void hydrate();
    });
    return () => data.subscription.unsubscribe();
  }, [hydrate]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await hydrate();
    },
    [hydrate],
  );

  const signUp = useCallback<Ctx["signUp"]>(
    async ({ email, password, role, fullName, practiceName }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { role, full_name: fullName, practice_name: practiceName ?? null },
        },
      });
      if (error) throw error;
      if (!data.session) return { needsConfirmation: true };
      await hydrate();
      return { needsConfirmation: false };
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setAccount(null);
    setStatus("signedOut");
  }, [queryClient]);

  const value = useMemo<Ctx>(
    () => ({ status, account, refresh: hydrate, signIn, signUp, signOut }),
    [status, account, hydrate, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
