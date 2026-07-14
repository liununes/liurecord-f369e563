import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { encryptData, decryptData } from "@/lib/crypto";

// ─── Site Content ─────────────────────────────────────────────────────────[...]

export function useSiteContent(sectionKey: string) {
  return useQuery({
    queryKey: ["site_content", sectionKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", sectionKey)
        .single();
      if (error) throw error;
      return data?.content;
    },
  });
}

export function useUpdateSiteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: any }) => {
      const { error } = await supabase
        .from("site_content")
        .update({ content })
        .eq("section_key", sectionKey);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["site_content", vars.sectionKey] });
    },
  });
}

// ─── Theme ───────────────────────────────────────────────────────────[...]

export function useSiteTheme() {
  return useQuery({
    queryKey: ["site_theme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_theme")
        .select("theme_key, value");
      if (error) throw error;
      return data as { theme_key: string; value: string }[];
    },
  });
}

export function useUpdateThemeColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ themeKey, value }: { themeKey: string; value: string }) => {
      const { error } = await supabase
        .from("site_theme")
        .update({ value })
        .eq("theme_key", themeKey);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_theme"] });
    },
  });
}

// ─── Portfolio Media ─────────────────────────────────────────────────────────[...]

export function usePortfolioMedia(mediaType?: string) {
  return useQuery({
    queryKey: ["portfolio_media", mediaType],
    queryFn: async () => {
      let query = supabase
        .from("portfolio_media")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (mediaType) query = query.eq("media_type", mediaType);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAllPortfolioMedia() {
  return useQuery({
    queryKey: ["portfolio_media_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_media")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (media: any) => {
      if (media.id) {
        const { error } = await supabase.from("portfolio_media").update(media).eq("id", media.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_media").insert(media);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio_media"] });
      qc.invalidateQueries({ queryKey: ["portfolio_media_all"] });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_media").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio_media"] });
      qc.invalidateQueries({ queryKey: ["portfolio_media_all"] });
    },
  });
}

// ─── Auth helpers ──────────────────────────────────────────────────────────[...]

export function useAdminCheck() {
  return useQuery({
    queryKey: ["admin_check"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });
}

// ─── Client Proofing ─────────────────────────────────────────────────────────[...]

export function useClients() {
  return useQuery({
    queryKey: ["clients_data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "clients")
        .maybeSingle();

      if (error) throw error;
      
      if (!data || !data.content) {
        return [];
      }

      const content = data.content as any;
      if (content && content.encrypted) {
        try {
          const decrypted = await decryptData(content.encrypted, "liu_record_proofing_vault");
          return Array.isArray(decrypted) ? decrypted : [];
        } catch (e) {
          return [];
        }
      }
      
      return Array.isArray(content) ? content : [];
    },
    staleTime: 0,
    refetchInterval: 10000,
  });
}

export function useUpdateClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clients: any[]) => {
      const encrypted = await encryptData(clients, "liu_record_proofing_vault");
      
      const { data, error: selectError } = await supabase
        .from("site_content")
        .select("id")
        .eq("section_key", "clients")
        .maybeSingle();

      if (selectError) throw selectError;

      if (data?.id) {
        const { data: updatedRows, error } = await supabase
          .from("site_content")
          .update({ content: { encrypted } })
          .eq("section_key", "clients")
          .select("id");
        if (error) throw error;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(
            "Não foi possível salvar (permissão negada pelo banco de dados). Verifique as políticas de RLS da tabela site_content."
          );
        }
      } else {
        const { error } = await supabase
          .from("site_content")
          .insert({ section_key: "clients", content: { encrypted } });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      qc.setQueryData(["clients_data"], undefined);
      await qc.refetchQueries({ queryKey: ["clients_data"], exact: true });
    },
    onError: (error) => {
      console.error("[useUpdateClients] Mutation error:", error);
    },
  });
}