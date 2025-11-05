import { Client } from "@/types/client";

export const exportToCSV = (clients: Client[]) => {
  const headers = [
    "Código",
    "Nome Fantasia",
    "Razão Social",
    "Documento",
    "Tipo Documento",
    "Valor Smart",
    "Valor Apoio",
    "Valor Contabilidade",
    "Valor Personalite",
    "Vencimento",
    "Início Competência",
    "Última Competência",
    "Serviços",
    "Situação",
    "Status",
    "Grupo",
  ];

  const rows = clients.map((client) => [
    client.codigo,
    client.nomeFantasia,
    client.razaoSocial,
    client.cnpj,
    client.documentType,
    client.valorMensalidade.smart,
    client.valorMensalidade.apoio,
    client.valorMensalidade.contabilidade,
    client.valorMensalidade.personalite,
    client.vencimento,
    client.inicioCompetencia,
    client.ultimaCompetencia || "",
    client.services.join(";"),
    client.situacao,
    client.status,
    client.grupo || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `clientes_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const importFromCSV = (file: File): Promise<Omit<Client, "id" | "createdAt" | "updatedAt">[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        const headers = lines[0].split(",");

        const clients = lines.slice(1).map((line) => {
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map((v) => v.replace(/^"|"$/g, "").trim());

          return {
            codigo: cleanValues[0],
            nomeFantasia: cleanValues[1],
            razaoSocial: cleanValues[2],
            cnpj: cleanValues[3],
            documentType: (cleanValues[4] || 'cnpj') as Client["documentType"],
            valorMensalidade: {
              smart: parseFloat(cleanValues[5]) || 0,
              apoio: parseFloat(cleanValues[6]) || 0,
              contabilidade: parseFloat(cleanValues[7]) || 0,
              personalite: parseFloat(cleanValues[8]) || 0,
            },
            vencimento: parseInt(cleanValues[9]) || 10,
            inicioCompetencia: cleanValues[10],
            ultimaCompetencia: cleanValues[11] || undefined,
            services: cleanValues[12] ? cleanValues[12].split(";").filter(s => s) as Client["services"] : [],
            situacao: (cleanValues[13] || 'mes-corrente') as Client["situacao"],
            status: cleanValues[14] as Client["status"],
            grupo: cleanValues[15] || undefined,
          };
        });

        resolve(clients);
      } catch (error) {
        reject(new Error("Erro ao processar arquivo CSV"));
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file);
  });
};
