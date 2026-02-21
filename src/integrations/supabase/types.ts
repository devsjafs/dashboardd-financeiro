export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_connections: {
        Row: {
          api_key: string
          api_token: string
          created_at: string
          extra_config: Json
          id: string
          nome: string
          organization_id: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_token?: string
          created_at?: string
          extra_config?: Json
          id?: string
          nome: string
          organization_id?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_token?: string
          created_at?: string
          extra_config?: Json
          id?: string
          nome?: string
          organization_id?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          categoria: string
          client_id: string
          competencia: string
          created_at: string
          data_pagamento: string | null
          deleted_at: string | null
          id: string
          nibo_deleted_at: string | null
          nibo_schedule_id: string | null
          nibo_synced_at: string | null
          organization_id: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria: string
          client_id: string
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          id?: string
          nibo_deleted_at?: string | null
          nibo_schedule_id?: string | null
          nibo_synced_at?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          categoria?: string
          client_id?: string
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          id?: string
          nibo_deleted_at?: string | null
          nibo_schedule_id?: string | null
          nibo_synced_at?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "boletos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          changed_at: string
          client_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string | null
        }
        Insert: {
          changed_at?: string
          client_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
        }
        Update: {
          changed_at?: string
          client_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          note: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cnpj: string
          codigo: string
          created_at: string
          document_type: string | null
          email: string | null
          grupo: string | null
          id: string
          inicio_competencia: string
          nome_fantasia: string
          organization_id: string | null
          periodo_reajuste_meses: number | null
          razao_social: string
          services: string[]
          situacao: string
          status: string
          ultima_competencia: string | null
          ultimo_reajuste: string | null
          updated_at: string
          valor_apoio: number | null
          valor_contabilidade: number | null
          valor_personalite: number | null
          valor_smart: number | null
          vencimento: number
        }
        Insert: {
          cnpj: string
          codigo: string
          created_at?: string
          document_type?: string | null
          email?: string | null
          grupo?: string | null
          id?: string
          inicio_competencia: string
          nome_fantasia: string
          organization_id?: string | null
          periodo_reajuste_meses?: number | null
          razao_social: string
          services?: string[]
          situacao: string
          status: string
          ultima_competencia?: string | null
          ultimo_reajuste?: string | null
          updated_at?: string
          valor_apoio?: number | null
          valor_contabilidade?: number | null
          valor_personalite?: number | null
          valor_smart?: number | null
          vencimento: number
        }
        Update: {
          cnpj?: string
          codigo?: string
          created_at?: string
          document_type?: string | null
          email?: string | null
          grupo?: string | null
          id?: string
          inicio_competencia?: string
          nome_fantasia?: string
          organization_id?: string | null
          periodo_reajuste_meses?: number | null
          razao_social?: string
          services?: string[]
          situacao?: string
          status?: string
          ultima_competencia?: string | null
          ultimo_reajuste?: string | null
          updated_at?: string
          valor_apoio?: number | null
          valor_contabilidade?: number | null
          valor_personalite?: number | null
          valor_smart?: number | null
          vencimento?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          commission_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          documento: string | null
          fim_trimestre: string
          id: string
          inicio_trimestre: string
          mes1_vencimento: string | null
          mes2_vencimento: string | null
          mes3_vencimento: string | null
          metodo_pagamento: string | null
          organization_id: string | null
          pago: boolean
          preco: number
          trimestre_numero: number
          updated_at: string
        }
        Insert: {
          commission_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          documento?: string | null
          fim_trimestre: string
          id?: string
          inicio_trimestre: string
          mes1_vencimento?: string | null
          mes2_vencimento?: string | null
          mes3_vencimento?: string | null
          metodo_pagamento?: string | null
          organization_id?: string | null
          pago?: boolean
          preco: number
          trimestre_numero: number
          updated_at?: string
        }
        Update: {
          commission_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          documento?: string | null
          fim_trimestre?: string
          id?: string
          inicio_trimestre?: string
          mes1_vencimento?: string | null
          mes2_vencimento?: string | null
          mes3_vencimento?: string | null
          metodo_pagamento?: string | null
          organization_id?: string | null
          pago?: boolean
          preco?: number
          trimestre_numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          client_id: string
          created_at: string
          duracao_meses: number
          id: string
          inicio_periodo: string
          organization_id: string | null
          percentual_comissao: number
          updated_at: string
          valor_base: number
          vendedor: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duracao_meses: number
          id?: string
          inicio_periodo: string
          organization_id?: string | null
          percentual_comissao?: number
          updated_at?: string
          valor_base: number
          vendedor: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duracao_meses?: number
          id?: string
          inicio_periodo?: string
          organization_id?: string | null
          percentual_comissao?: number
          updated_at?: string
          valor_base?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nibo_connections: {
        Row: {
          api_key: string
          api_token: string
          created_at: string
          id: string
          nome: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_token: string
          created_at?: string
          id?: string
          nome: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_token?: string
          created_at?: string
          id?: string
          nome?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nibo_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          banco: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string
          id: string
          intervalo_recorrencia: string | null
          organization_id: string | null
          recorrente: boolean
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          banco?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          id?: string
          intervalo_recorrencia?: string | null
          organization_id?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          banco?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          id?: string
          intervalo_recorrencia?: string | null
          organization_id?: string | null
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      billing_connections_safe: {
        Row: {
          created_at: string | null
          id: string | null
          nome: string | null
          organization_id: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          organization_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          organization_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nibo_connections_safe: {
        Row: {
          created_at: string | null
          id: string | null
          nome: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nibo_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_pending_invite: {
        Args: { _email: string; _user_id: string }
        Returns: undefined
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
