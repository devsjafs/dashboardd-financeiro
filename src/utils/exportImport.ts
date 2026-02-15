import { Client } from "@/types/client";
import * as XLSX from "xlsx";

export const exportToXLSX = (clients: Client[]) => {
  const data = clients.map((client) => ({
    "Código": client.codigo,
    "Nome Fantasia": client.nomeFantasia,
    "Razão Social": client.razaoSocial,
    "Documento": client.cnpj,
    "Tipo Documento": client.documentType,
    "Valor Smart": client.valorMensalidade.smart,
    "Valor Apoio": client.valorMensalidade.apoio,
    "Valor Contabilidade": client.valorMensalidade.contabilidade,
    "Valor Personalite": client.valorMensalidade.personalite,
    "Vencimento": client.vencimento,
    "Início Competência": client.inicioCompetencia,
    "Última Competência": client.ultimaCompetencia || "",
    "Serviços": client.services.join(";"),
    "Situação": client.situacao,
    "Status": client.status,
    "Grupo": client.grupo || "",
    "Email": client.email || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
  
  XLSX.writeFile(workbook, `clientes_${new Date().toISOString().split("T")[0]}.xlsx`);
};

export const importFromXLSX = (file: File): Promise<Omit<Client, "id" | "createdAt" | "updatedAt">[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const clients = jsonData.map((row) => ({
          codigo: String(row["Código"] || ""),
          nomeFantasia: String(row["Nome Fantasia"] || ""),
          razaoSocial: String(row["Razão Social"] || ""),
          cnpj: String(row["Documento"] || ""),
          documentType: (row["Tipo Documento"] || 'cnpj') as Client["documentType"],
          valorMensalidade: {
            smart: Number(row["Valor Smart"]) || 0,
            apoio: Number(row["Valor Apoio"]) || 0,
            contabilidade: Number(row["Valor Contabilidade"]) || 0,
            personalite: Number(row["Valor Personalite"]) || 0,
          },
          vencimento: Number(row["Vencimento"]) || 10,
          inicioCompetencia: String(row["Início Competência"] || ""),
          ultimaCompetencia: row["Última Competência"] ? String(row["Última Competência"]) : undefined,
          services: row["Serviços"] 
            ? String(row["Serviços"]).split(";").filter(s => s) as Client["services"]
            : [],
          situacao: (row["Situação"] || 'mes-corrente') as Client["situacao"],
          status: String(row["Status"]) as Client["status"],
          grupo: row["Grupo"] ? String(row["Grupo"]) : undefined,
          email: row["Email"] ? String(row["Email"]) : undefined,
          periodoReajusteMeses: row["Período Reajuste (meses)"] ? Number(row["Período Reajuste (meses)"]) : 12,
          ultimoReajuste: row["Último Reajuste"] ? String(row["Último Reajuste"]) : undefined,
        }));

        resolve(clients);
      } catch (error) {
        reject(new Error("Erro ao processar arquivo XLSX"));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsBinaryString(file);
  });
};

export const downloadClientTemplate = () => {
  const templateData = [{
    "Código": "001",
    "Nome Fantasia": "Empresa Exemplo",
    "Razão Social": "Empresa Exemplo LTDA",
    "Documento": "00.000.000/0000-00",
    "Tipo Documento": "cnpj",
    "Valor Smart": 0,
    "Valor Apoio": 0,
    "Valor Contabilidade": 0,
    "Valor Personalite": 0,
    "Vencimento": 10,
    "Início Competência": "2025-01",
    "Última Competência": "",
    "Serviços": "smart;contabilidade",
    "Situação": "mes-corrente",
    "Status": "ativo",
    "Grupo": "",
    "Email": "contato@empresa.com",
  }];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
  
  XLSX.writeFile(workbook, "modelo_clientes.xlsx");
};
