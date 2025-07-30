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

// Helper functions for type coercion (LlamaStack compatibility)
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

// Individual evaluation tools for each supuesto
server.tool(
  "evaluar_supuesto_a",
  "Evalúa el Supuesto A: Cuidado de familiares de primer grado con enfermedad/accidente grave",
  {
    relacionFamiliar: z.string().describe("Relación familiar (madre, padre, hijo, conyuge, etc.)"),
    tieneEnfermedadGrave: z.union([z.boolean(), z.string()]).optional().describe("¿Tiene enfermedad grave?"),
    tieneAccidenteGrave: z.union([z.boolean(), z.string()]).optional().describe("¿Tiene accidente grave?"),
    requiereHospitalizacion: z.union([z.boolean(), z.string()]).optional().describe("¿Requiere/requirió hospitalización?"),
    requiereCuidadoContinuo: z.union([z.boolean(), z.string()]).optional().describe("¿Requiere cuidado continuo?"),
    requiereCuidadoPermanente: z.union([z.boolean(), z.string()]).optional().describe("¿Requiere cuidado permanente?"),
    requiereCuidadoDirecto: z.union([z.boolean(), z.string()]).optional().describe("¿Requiere cuidado directo?"),
  },
  async (params) => {
    try {
      const datos = {
        relacionFamiliar: params.relacionFamiliar,
        tieneEnfermedadGrave: parseBoolean(params.tieneEnfermedadGrave),
        tieneAccidenteGrave: parseBoolean(params.tieneAccidenteGrave),
        requiereHospitalizacion: parseBoolean(params.requiereHospitalizacion),
        requiereCuidadoContinuo: parseBoolean(params.requiereCuidadoContinuo),
        requiereCuidadoPermanente: parseBoolean(params.requiereCuidadoPermanente),
        requiereCuidadoDirecto: parseBoolean(params.requiereCuidadoDirecto),
      };

      const resultado = calculadora.evaluarSupuestoA_CuidadoFamiliarPrimerGrado(datos);
      
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
            text: `Error evaluando Supuesto A: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "evaluar_supuesto_b",
  "Evalúa el Supuesto B: Cuidado del tercer hijo o sucesivos",
  {
    numeroHijos: z.union([z.number(), z.string()]).describe("Número total de hijos"),
    edadesHijos: z.union([z.array(z.number()), z.string()]).describe("Edades de todos los hijos (array)"),
    incluyeRecienNacido: z.union([z.boolean(), z.string()]).describe("¿Incluye recién nacido?"),
  },
  async (params) => {
    try {
      const datos = {
        numeroHijos: parseNumber(params.numeroHijos),
        edadesHijos: parseArray(params.edadesHijos, parseNumber)?.filter(n => n !== undefined),
        incluyeRecienNacido: parseBoolean(params.incluyeRecienNacido),
      };

      const resultado = calculadora.evaluarSupuestoB_TercerHijo(datos);
      
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
            text: `Error evaluando Supuesto B: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

server.tool(
  "evaluar_supuesto_e",
  "Evalúa el Supuesto E: Familia monoparental",
  {
    esMonoparental: z.union([z.boolean(), z.string()]).describe("¿Es familia monoparental acreditada?"),
    esSituacionMonoparentalidad: z.union([z.boolean(), z.string()]).optional().describe("¿Situación de monoparentalidad?"),
    numeroHijos: z.union([z.number(), z.string()]).describe("Número total de hijos"),
    edadesHijos: z.union([z.array(z.number()), z.string()]).describe("Edades de los hijos"),
    tieneDiscapacidad: z.union([z.array(z.number()), z.string()]).optional().describe("Porcentajes de discapacidad por hijo"),
    tieneDependencia: z.union([z.array(z.boolean()), z.string()]).optional().describe("Dependencia reconocida por hijo"),
  },
  async (params) => {
    try {
      const datos = {
        esMonoparental: parseBoolean(params.esMonoparental),
        esSituacionMonoparentalidad: parseBoolean(params.esSituacionMonoparentalidad),
        numeroHijos: parseNumber(params.numeroHijos),
        edadesHijos: parseArray(params.edadesHijos, parseNumber)?.filter(n => n !== undefined),
        tieneDiscapacidad: parseArray(params.tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
        tieneDependencia: parseArray(params.tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
      };

      const resultado = calculadora.evaluarSupuestoE_FamiliaMonoparental(datos);
      
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
            text: `Error evaluando Supuesto E: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

// Herramienta simplificada para casos específicos con discapacidad
server.tool(
  "evaluar_caso_discapacidad",
  "Herramienta simplificada para evaluar casos con menores con discapacidad",
  {
    hijo1_edad: z.union([z.number(), z.string()]).describe("Edad del primer hijo"),
    hijo1_discapacidad: z.union([z.number(), z.string()]).optional().describe("Porcentaje discapacidad primer hijo (0 si no tiene)"),
    hijo2_edad: z.union([z.number(), z.string()]).optional().describe("Edad del segundo hijo"),
    hijo2_discapacidad: z.union([z.number(), z.string()]).optional().describe("Porcentaje discapacidad segundo hijo (0 si no tiene)"),
    es_monoparental: z.union([z.boolean(), z.string()]).optional().describe("¿Es familia monoparental?"),
  },
  async (params) => {
    try {
      const edad1 = parseNumber(params.hijo1_edad);
      const disc1 = parseNumber(params.hijo1_discapacidad) || 0;
      const edad2 = parseNumber(params.hijo2_edad);
      const disc2 = parseNumber(params.hijo2_discapacidad) || 0;
      const monoparental = parseBoolean(params.es_monoparental) || false;

      const edades = edad2 !== undefined ? [edad1!, edad2] : [edad1!];
      const discapacidades = edad2 !== undefined ? [disc1, disc2] : [disc1];
      const dependencias = discapacidades.map(d => d >= 33);

      const resultados: any = {
        datos_analizados: {
          edades,
          discapacidades,
          es_monoparental: monoparental
        },
        evaluaciones: []
      };

      // Evaluar Supuesto E si es monoparental
      if (monoparental) {
        const datosE = {
          esMonoparental: true,
          numeroHijos: edades.length,
          edadesHijos: edades,
          tieneDiscapacidad: discapacidades,
          tieneDependencia: dependencias,
        };
        const resultadoE = calculadora.evaluarSupuestoE_FamiliaMonoparental(datosE);
        resultados.evaluaciones.push(resultadoE);
      }

      // Evaluar Supuesto B si hay 2+ hijos
      if (edades.length >= 2) {
        const datosB = {
          numeroHijos: edades.length,
          edadesHijos: edades,
          incluyeRecienNacido: edades.some(e => e === 0),
        };
        const resultadoB = calculadora.evaluarSupuestoB_TercerHijo(datosB);
        resultados.evaluaciones.push(resultadoB);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resultados, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error en evaluación de caso discapacidad: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

// Tool for complete evaluation with flexible input handling
server.tool(
  "evaluacion_completa",
  "Realiza una evaluación completa de todos los supuestos aplicables",
  {
    // Supuesto A parameters
    supuestoA_relacionFamiliar: z.union([z.string(), z.undefined()]).optional().describe("Relación familiar para supuesto A"),
    supuestoA_tieneEnfermedadGrave: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Familiar tiene enfermedad grave? (Supuesto A)"),
    supuestoA_tieneAccidenteGrave: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Familiar tiene accidente grave? (Supuesto A)"),
    supuestoA_requiereHospitalizacion: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere/requirió hospitalización? (Supuesto A)"),
    supuestoA_requiereCuidadoContinuo: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado continuo? (Supuesto A)"),
    supuestoA_requiereCuidadoPermanente: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado permanente? (Supuesto A)"),
    supuestoA_requiereCuidadoDirecto: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Requiere cuidado directo? (Supuesto A)"),
    
    // Supuesto B parameters
    supuestoB_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto B)"),
    supuestoB_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de todos los hijos (Supuesto B)"),
    supuestoB_incluyeRecienNacido: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Incluye recién nacido? (Supuesto B)"),
    
    // Supuesto C parameters
    supuestoC_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto C)"),
    supuestoC_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de los hijos (Supuesto C)"),
    supuestoC_tieneDiscapacidad: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Porcentajes de discapacidad (Supuesto C)"),
    supuestoC_tieneDependencia: z.union([z.array(z.boolean()), z.string(), z.undefined()]).optional().describe("Dependencia reconocida por hijo (Supuesto C)"),
    
    // Supuesto D parameters
    supuestoD_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto D)"),
    supuestoD_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de los hijos (Supuesto D)"),
    supuestoD_tieneDiscapacidad: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Porcentajes de discapacidad (Supuesto D)"),
    supuestoD_tieneDependencia: z.union([z.array(z.boolean()), z.string(), z.undefined()]).optional().describe("Dependencia reconocida por hijo (Supuesto D)"),
    supuestoD_esPartoMultiple: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Es parto múltiple? (Supuesto D)"),
    supuestoD_esAdopcionMultiple: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Es adopción múltiple? (Supuesto D)"),
    supuestoD_esAcogimientoMultiple: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Es acogimiento múltiple? (Supuesto D)"),
    
    // Supuesto E parameters
    supuestoE_esMonoparental: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Es familia monoparental? (Supuesto E)"),
    supuestoE_esSituacionMonoparentalidad: z.union([z.boolean(), z.string(), z.undefined()]).optional().describe("¿Situación de monoparentalidad? (Supuesto E)"),
    supuestoE_numeroHijos: z.union([z.number(), z.string(), z.undefined()]).optional().describe("Número total de hijos (Supuesto E)"),
    supuestoE_edadesHijos: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Edades de los hijos (Supuesto E)"),
    supuestoE_tieneDiscapacidad: z.union([z.array(z.number()), z.string(), z.undefined()]).optional().describe("Porcentajes de discapacidad (Supuesto E)"),
    supuestoE_tieneDependencia: z.union([z.array(z.boolean()), z.string(), z.undefined()]).optional().describe("Dependencia reconocida por hijo (Supuesto E)"),
    
    // Compatibility parameters
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

      // Build Supuesto A data if provided
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

      // Build Supuesto B data if provided
      if (params.supuestoB_numeroHijos !== undefined) {
        datosCompletos.supuestoB = {
          numeroHijos: parseNumber(params.supuestoB_numeroHijos),
          edadesHijos: parseArray(params.supuestoB_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          incluyeRecienNacido: parseBoolean(params.supuestoB_incluyeRecienNacido),
        };
      }

      // Build Supuesto C data if provided
      if (params.supuestoC_numeroHijos !== undefined) {
        datosCompletos.supuestoC = {
          numeroHijos: parseNumber(params.supuestoC_numeroHijos),
          edadesHijos: parseArray(params.supuestoC_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          tieneDiscapacidad: parseArray(params.supuestoC_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined),
          tieneDependencia: parseArray(params.supuestoC_tieneDependencia, parseBoolean)?.filter(b => b !== undefined),
        };
      }

      // Build Supuesto D data if provided
      if (params.supuestoD_numeroHijos !== undefined) {
        datosCompletos.supuestoD = {
          numeroHijos: parseNumber(params.supuestoD_numeroHijos),
          edadesHijos: parseArray(params.supuestoD_edadesHijos, parseNumber)?.filter(n => n !== undefined),
          tieneDiscapacidad: parseArray(params.supuestoD_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined),
          tieneDependencia: parseArray(params.supuestoD_tieneDependencia, parseBoolean)?.filter(b => b !== undefined),
          esPartoMultiple: parseBoolean(params.supuestoD_esPartoMultiple),
          esAdopcionMultiple: parseBoolean(params.supuestoD_esAdopcionMultiple),
          esAcogimientoMultiple: parseBoolean(params.supuestoD_esAcogimientoMultiple),
        };
      }

      // Build Supuesto E data if provided
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

      // Build compatibility data if any parameter is provided
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