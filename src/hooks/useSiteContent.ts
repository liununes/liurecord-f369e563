import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { decryptData } from "@/lib/crypto";

// ─── Site Content ────────────────────────────────────────────────

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

// ─── Theme ───────────────────────────────────────────────────────

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

// ─── Portfolio Media ─────────────────────────────────────────────

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

// ─── Auth helpers ────────────────────────────────────────────────

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

// ─── Client Proofing ─────────────────────────────────────────────

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
      if (!data || !data.content) return [];

      const content = data.content as any;

      if (content.encrypted) {
        try {
          const decrypted = await decryptData(content.encrypted, "liu_record_proofing_vault");
          return Array.isArray(decrypted) ? decrypted : [];
        } catch { return []; }
      }

      return Array.isArray(content) ? content : [];
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useClientPhotos(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_photos", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("section_key", "clients")
        .maybeSingle();

      if (error) throw error;
      if (!data || !data.content) return [];

      const content = data.content as any;
      let clients: any[] = [];

      if (content.encrypted) {
        try {
          const decrypted = await decryptData(content.encrypted, "liu_record_proofing_vault");
          clients = Array.isArray(decrypted) ? decrypted : [];
        } catch { return []; }
      } else {
        clients = Array.isArray(content) ? content : [];
      }

      const client = clients.find((c: any) => c.id === clientId);
      return client?.photos || [];
    },
    enabled: !!clientId,
  });
}

export function useUpdateClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clients: any[]) => {
      const { error } = await supabase
        .from("site_content")
        .upsert(
          { section_key: "clients", content: clients },
          { onConflict: "section_key" }
        );
      if (error) throw error;
    },
    onMutate: async (clients) => {
      await qc.cancelQueries({ queryKey: ["clients_data"] });
      const previousClients = qc.getQueryData<any[]>(["clients_data"]);
      qc.setQueryData(["clients_data"], clients);
      return { previousClients };
    },
    onError: (_error, _clients, context) => {
      if (context?.previousClients) {
        qc.setQueryData(["clients_data"], context.previousClients);
      }
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["clients_data"], exact: true });
    },
  });
}
