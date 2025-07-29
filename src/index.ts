#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CalculadoraExcedenciaNavarra2025 } from "./calculadora.js";

// Create server instance
const server = new McpServer({
  name: "bon-calculadora",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Create calculator instance
const calculadora = new CalculadoraExcedenciaNavarra2025();

// Tool to validate kinship relationship
server.tool(
  "validar_parentesco",
  "Valida si una relación familiar es de primer grado según los criterios de Navarra",
  {
    relacion: z.string().describe("Tipo de relación familiar (ej: madre, padre, hijo, conyuge)"),
  },
  async ({ relacion }) => {
    try {
      const resultado = calculadora.validarParentescoPrimerGrado(relacion);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultado, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error validando parentesco: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);



// Helper functions for type coercion
function parseBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return undefined;
}

function parseNumber(value: any): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function parseArray(value: any, itemParser?: (item: any) => any): any[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return itemParser ? value.map(itemParser) : value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return itemParser ? parsed.map(itemParser) : parsed;
      }
    } catch (e) {
      // If JSON parsing fails, return undefined
    }
  }
  return undefined;
}

// Tool for complete evaluation with flexible input handling
server.tool(
  "evaluacion_completa",
  "Realiza una evaluación completa de todos los supuestos aplicables",
  {
    // Supuesto A parameters - accepting strings that will be coerced
    supuestoA_relacionFamiliar: z.union([z.string(), z.undefined()]).optional().describe("Relación familiar para supuesto A"),
    supuestoA_tieneEnfermedadGrave: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Familiar tiene enfermedad grave? (Supuesto A)"),
    supuestoA_tieneAccidenteGrave: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Familiar tiene accidente grave? (Supuesto A)"),
    supuestoA_requiereHospitalizacion: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere/requirió hospitalización? (Supuesto A)"),
    supuestoA_requiereCuidadoContinuo: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado continuo? (Supuesto A)"),
    supuestoA_requiereCuidadoPermanente: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado permanente? (Supuesto A)"),
    supuestoA_requiereCuidadoDirecto: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado directo? (Supuesto A)"),
    
    // Supuesto B parameters - accepting strings that will be coerced
    supuestoB_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto B)"),
    supuestoB_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de todos los hijos (Supuesto B)"),
    supuestoB_incluyeRecienNacido: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Incluye recién nacido? (Supuesto B)"),
    
    // Supuesto C parameters - accepting strings that will be coerced
    supuestoC_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto C)"),
    supuestoC_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de los hijos (Supuesto C)"),
    supuestoC_tieneDiscapacidad: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Porcentajes de discapacidad (Supuesto C)"),
    supuestoC_tieneDependencia: z.union([z.array(z.boolean()), z.string(), z.undefined()]).optional().describe("Dependencia reconocida por hijo (Supuesto C)"),
    
    // Supuesto E parameters - accepting strings that will be coerced
    supuestoE_esMonoparental: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Es familia monoparental? (Supuesto E)"),
    supuestoE_esSituacionMonoparentalidad: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Situación de monoparentalidad? (Supuesto E)"),
    supuestoE_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto E)"),
    supuestoE_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de los hijos (Supuesto E)"),
    supuestoE_tieneDiscapacidad: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Porcentajes de discapacidad (Supuesto E)"),
    supuestoE_tieneDependencia: z.union([z.array(z.boolean()), z.string(), z.undefined()]).optional().describe("Dependencia reconocida por hijo (Supuesto E)"),
    
    // Situation parameters - accepting strings that will be coerced
    tieneOtrasAyudasPublicas: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Tiene otras ayudas públicas?"),
    tienePrestacionesSeguridadSocial: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Tiene prestaciones de seguridad social?"),
    tieneAyudaDependencia: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Tiene ayudas a la dependencia?"),
    tieneConvenioEspecialCuidadores: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Tiene convenio especial para cuidadores?"),
    importeOtrasAyudas: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Importe de otras ayudas"),
    importeAyudaDependencia: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Importe de ayuda a la dependencia"),
  },
  async (params) => {
    try {
      const datosCompletos: any = {};

      // Build Supuesto A data if provided - with type coercion
      if (params.supuestoA_relacionFamiliar) {
        datosCompletos.supuestoA = {
          relacionFamiliar: params.supuestoA_relacionFamiliar,
          tieneEnfermedadGrave: parseBoolean(params.supuestoA_tieneEnfermedadGrave),
          tieneAccidenteGrave: parseBoolean(params.supuestoA_tieneAccidenteGrave),
          requiereHospitalizacion: parseBoolean(params.supuestoA_requiereHospitalizacion),
          requiereCuidadoContinuo: parseBoolean(params.supuestoA_requiereCuidadoContinuo),
          requiereCuidadoPermanente: parseBoolean(params.supuestoA_requiereCuidadoPermanente),
          requiereCuidadoDirecto: parseBoolean(params.supuestoA_requiereCuidadoDirecto),
        };
      }

      // Build Supuesto B data if provided - with type coercion
      if (params.supuestoB_numeroHijos !== undefined) {
        datosCompletos.supuestoB = {
          numeroHijos: parseNumber(params.supuestoB_numeroHijos),
          edadesHijos: parseArray(params.supuestoB_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          incluyeRecienNacido: parseBoolean(params.supuestoB_incluyeRecienNacido),
        };
      }

      // Build Supuesto C data if provided - with type coercion
      if (params.supuestoC_numeroHijos !== undefined) {
        datosCompletos.supuestoC = {
          numeroHijos: parseNumber(params.supuestoC_numeroHijos),
          edadesHijos: parseArray(params.supuestoC_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          tieneDiscapacidad: parseArray(params.supuestoC_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined),
          tieneDependencia: parseArray(params.supuestoC_tieneDependencia, parseBoolean)?.filter(b => b !== undefined),
        };
      }

      // Build Supuesto E data if provided - with type coercion
      if (params.supuestoE_esMonoparental !== undefined || params.supuestoE_numeroHijos !== undefined) {
        datosCompletos.supuestoE = {
          esMonoparental: parseBoolean(params.supuestoE_esMonoparental),
          esSituacionMonoparentalidad: parseBoolean(params.supuestoE_esSituacionMonoparentalidad),
          numeroHijos: parseNumber(params.supuestoE_numeroHijos),
          edadesHijos: parseArray(params.supuestoE_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          tieneDiscapacidad: parseArray(params.supuestoE_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined),
          tieneDependencia: parseArray(params.supuestoE_tieneDependencia, parseBoolean)?.filter(b => b !== undefined),
        };
      }

      // Build situation data if any compatibility parameter is provided - with type coercion
      if (params.tieneOtrasAyudasPublicas !== undefined || 
          params.tienePrestacionesSeguridadSocial !== undefined ||
          params.tieneAyudaDependencia !== undefined ||
          params.tieneConvenioEspecialCuidadores !== undefined) {
        datosCompletos.situacionActual = {
          tieneOtrasAyudasPublicas: parseBoolean(params.tieneOtrasAyudasPublicas),
          tienePrestacionesSeguridadSocial: parseBoolean(params.tienePrestacionesSeguridadSocial),
          tieneAyudaDependencia: parseBoolean(params.tieneAyudaDependencia),
          tieneConvenioEspecialCuidadores: parseBoolean(params.tieneConvenioEspecialCuidadores),
          importeOtrasAyudas: parseNumber(params.importeOtrasAyudas),
          importeAyudaDependencia: parseNumber(params.importeAyudaDependencia),
        };
      }

      const resultado = calculadora.evaluacionCompleta(datosCompletos);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultado, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error en evaluación completa: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Calculadora Excedencia Navarra MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});