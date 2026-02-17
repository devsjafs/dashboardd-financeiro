import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

export type AppRole = "owner" | "admin" | "member" | "viewer";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  organizationId: string | null;
  userRole: AppRole | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  organizationId: null,
  userRole: null,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshOrganization: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
    }
  };

  const fetchOrganization = async (userId: string) => {
    const { data } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (data) {
      setOrganizationId(data.organization_id);
      setUserRole(data.role as AppRole);
    } else {
      setOrganizationId(null);
      setUserRole(null);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  const refreshOrganization = async () => {
    if (session?.user?.id) {
      await fetchOrganization(session.user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user?.id) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchOrganization(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setOrganizationId(null);
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchOrganization(session.user.id),
        ]).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        organizationId,
        userRole,
        signOut,
        refreshProfile,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
