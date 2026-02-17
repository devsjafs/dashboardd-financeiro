import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useOrganization = () => {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const { data: organization } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organizationId)
        .single();
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!organizationId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at");
      if (error) throw error;
      
      // Fetch profiles for each member
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      
      return data.map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.user_id) || null,
      })) as OrganizationMember[];
    },
    enabled: !!organizationId,
  });

  const createOrganization = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Não autenticado");
      
      // Create org
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name })
        .select()
        .single();
      if (orgError) throw orgError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });
      if (memberError) throw memberError;

      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-organization"] });
      toast({ title: "Organização criada", description: "Sua organização foi criada com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "owner" | "admin" | "member" | "viewer" }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      toast({ title: "Sucesso", description: "Papel atualizado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      toast({ title: "Sucesso", description: "Membro removido." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    organization,
    members,
    createOrganization,
    updateMemberRole,
    removeMember,
  };
};
