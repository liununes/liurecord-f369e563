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
      console.log("[useClients] Fetching clients from Supabase...");
      
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "clients")
        .maybeSingle();

      if (error) {
        console.error("[useClients] Supabase error:", error);
        throw error;
      }
      
      if (!data || !data.content) {
        console.log("[useClients] No data found");
        return [];
      }

      const content = data.content as any;
      if (content && content.encrypted) {
        try {
          console.log("[useClients] Decrypting data...");
          const decrypted = await decryptData(content.encrypted, "liu_record_proofing_vault");
          console.log("[useClients] Successfully decrypted clients:", decrypted);
          return Array.isArray(decrypted) ? decrypted : [];
        } catch (e) {
          console.error("[useClients] Decryption error:", e);
          return [];
        }
      }
      
      console.log("[useClients] Returning unencrypted content:", content);
      return Array.isArray(content) ? content : [];
    },
    staleTime: 0, // Sempre considerar como stale
    refetchInterval: 3000, // Refetch automático a cada 3 segundos para atualização em tempo real
  });
}

export function useUpdateClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clients: any[]) => {
      console.log("[useUpdateClients] Starting mutation with data:", clients);
      
      const encrypted = await encryptData(clients, "liu_record_proofing_vault");
      console.log("[useUpdateClients] Data encrypted successfully");
      
      const { data, error: selectError } = await supabase
        .from("site_content")
        .select("id")
        .eq("section_key", "clients")
        .maybeSingle();

      if (selectError) {
        console.error("[useUpdateClients] SELECT error:", selectError);
        throw selectError;
      }

      if (data?.id) {
        console.log("[useUpdateClients] Updating existing record");
        // IMPORTANT: .select() forces PostgREST to return the affected rows.
        // If RLS silently blocks the UPDATE (0 rows matched), Supabase does
        // NOT return a query error - it just returns an empty array. Without
        // this check, failures caused by missing/incorrect RLS policies were
        // being swallowed and the UI reported "saved" even though nothing
        // was persisted.
        const { data: updatedRows, error } = await supabase
          .from("site_content")
          .update({ content: { encrypted } })
          .eq("section_key", "clients")
          .select("id");
        if (error) {
          console.error("[useUpdateClients] Update error:", error);
          throw error;
        }
        if (!updatedRows || updatedRows.length === 0) {
          console.error("[useUpdateClients] Update affected 0 rows - likely blocked by RLS policy");
          throw new Error(
            "Não foi possível salvar (permissão negada pelo banco de dados). Verifique as políticas de RLS da tabela site_content."
          );
        }
        console.log("[useUpdateClients] Update successful");
      } else {
        console.log("[useUpdateClients] Inserting new record");
        const { error } = await supabase
          .from("site_content")
          .insert({ section_key: "clients", content: { encrypted } });
        if (error) {
          console.error("[useUpdateClients] Insert error:", error);
          throw error;
        }
        console.log("[useUpdateClients] Insert successful");
      }
    },
    onSuccess: async () => {
      console.log("[useUpdateClients] Mutation successful, invalidating cache and refetching...");
      // Limpa o cache
      qc.setQueryData(["clients_data"], undefined);
      // Força refetch imediato
      await qc.refetchQueries({ queryKey: ["clients_data"], exact: true });
      console.log("[useUpdateClients] Refetch complete");
    },
    onError: (error) => {
      console.error("[useUpdateClients] Mutation error:", error);
    },
  });
}