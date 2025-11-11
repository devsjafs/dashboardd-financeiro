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
      boletos: {
        Row: {
          categoria: string
          client_id: string
          competencia: string
          created_at: string
          data_pagamento: string | null
          id: string
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
          id?: string
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
          id?: string
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
        }
        Insert: {
          changed_at?: string
          client_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          client_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          note: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          note?: string
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
          razao_social: string
          services: string[]
          situacao: string
          status: string
          ultima_competencia: string | null
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
          razao_social: string
          services?: string[]
          situacao: string
          status: string
          ultima_competencia?: string | null
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
          razao_social?: string
          services?: string[]
          situacao?: string
          status?: string
          ultima_competencia?: string | null
          updated_at?: string
          valor_apoio?: number | null
          valor_contabilidade?: number | null
          valor_personalite?: number | null
          valor_smart?: number | null
          vencimento?: number
        }
        Relationships: []
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
        ]
      }
      commissions: {
        Row: {
          client_id: string
          created_at: string
          duracao_meses: number
          id: string
          inicio_periodo: string
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
        ]
      }
      payments: {
        Row: {
          banco: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string
          id: string
          intervalo_recorrencia: string | null
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
          recorrente?: boolean
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
