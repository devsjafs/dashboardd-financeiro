import { BoletoWithClient } from "@/types/boleto";
import * as XLSX from "xlsx";

export const exportBoletosToXLSX = (boletos: BoletoWithClient[]) => {
  const data = boletos.map((boleto) => ({
    "Cliente": boleto.clients.nome_fantasia,
    "CPF/CNPJ": boleto.clients.cnpj,
    "Categoria": boleto.categoria,
    "Competência": boleto.competencia,
    "Vencimento": boleto.vencimento,
    "Valor": boleto.valor,
    "Status": boleto.status,
    "Data Pagamento": boleto.data_pagamento || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Boletos");
  
  XLSX.writeFile(workbook, `boletos_${new Date().toISOString().split("T")[0]}.xlsx`);
};

export const importBoletosFromXLSX = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const boletos = jsonData.map((row) => ({
          client_cnpj: String(row["CPF/CNPJ"] || ""),
          categoria: String(row["Categoria"] || ""),
          competencia: String(row["Competência"] || ""),
          vencimento: String(row["Vencimento"] || ""),
          valor: Number(row["Valor"]) || 0,
          status: String(row["Status"] || "não pago"),
          data_pagamento: row["Data Pagamento"] ? String(row["Data Pagamento"]) : null,
        }));

        resolve(boletos);
      } catch (error) {
        reject(new Error("Erro ao processar arquivo XLSX"));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsBinaryString(file);
  });
};

export const downloadBoletoTemplate = () => {
  const templateData = [{
    "CPF/CNPJ": "00.000.000/0000-00",
    "Categoria": "Mensalidade",
    "Competência": "2025-11",
    "Vencimento": "2025-11-10",
    "Valor": 1000,
    "Status": "não pago",
    "Data Pagamento": "",
  }];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Boletos");
  
  XLSX.writeFile(workbook, "modelo_boletos.xlsx");
};
