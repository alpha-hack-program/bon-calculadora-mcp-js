//!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CalculadoraExcedenciaNavarra2025 } from "./calculadora.js";

const server = new McpServer({
  name: "bon-calculadora",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

const calculadora = new CalculadoraExcedenciaNavarra2025();

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
    } catch {}
  }
  return undefined;
}

// TOOL DEFINITIONS

server.tool("evaluar_supuesto_a", 
  "🏥 SUPUESTO A: Cuidado de FAMILIAR ADULTO con enfermedad/accidente GRAVE. ⚠️ CUÁNDO USAR: Solo si alguien está enfermo/accidentado y necesita cuidado (ej: 'mi padre está hospitalizado', 'mi madre tuvo un accidente'). ❌ NO USAR para: cuidado de hijos propios, embarazos, familias monoparentales. ✅ REQUISITOS: familiar 1º grado + hospitalización + enfermedad/accidente grave. 💰 PAGO: 725€/mes", {
  relacionFamiliar: z.string().describe("¿QUIÉN está enfermo/accidentado? (padre/madre/hijo/hija/conyuge/pareja) - debe ser familiar de primer grado"),
  tieneEnfermedadGrave: z.any().describe("¿La persona enferma tiene enfermedad GRAVE?"),
  tieneAccidenteGrave: z.any().describe("¿La persona enferma tuvo accidente GRAVE?"),
  requiereHospitalizacion: z.any().describe("¿Requiere/requirió HOSPITALIZACIÓN? (REQUISITO OBLIGATORIO)"),
  requiereCuidadoContinuo: z.any().describe("¿Necesita cuidado las 24 horas?"),
  requiereCuidadoPermanente: z.any().describe("¿Necesita cuidado por tiempo prolongado?"),
  requiereCuidadoDirecto: z.any().describe("¿Necesita cuidado personal directo?")
}, async (params) => {
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
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando Supuesto A: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_supuesto_b", 
  "👶 SUPUESTO B: TERCER HIJO o más CON recién nacido. ⚠️ CUÁNDO USAR: Solo familias NO monoparentales con 3+ hijos y recién nacido (ej: 'acabamos de tener nuestro tercer hijo', 'tenemos 5 hijos y acaba de nacer uno'). ❌ NO USAR para: padres/madres solteros (usar Supuesto E), menos de 3 hijos, sin recién nacido. ✅ REQUISITOS: ≥3 hijos + recién nacido + ≥2 menores de 6 años + NO monoparental. 💰 PAGO: 500€/mes", {
  numeroHijos: z.any().describe("Número TOTAL de hijos (debe ser 3 o más)"),
  edadesHijos: z.any().describe("Edades de TODOS los hijos - incluir 0 para recién nacido (ej: [0, 2, 5] para recién nacido, 2 años, 5 años). Si no se saben las edades pero se indica que son menores de X años, X-1. Por ejemplo, si se dice: 4 hijos menores de 6 años [5, 5, 5, 5]."),
  incluyeRecienNacido: z.any().describe("¿Hay un bebé recién nacido entre los hijos? (OBLIGATORIO: true)")
}, async (params) => {
  try {
    const datos = {
      numeroHijos: parseNumber(params.numeroHijos),
      edadesHijos: parseArray(params.edadesHijos, parseNumber)?.filter(n => n !== undefined),
      incluyeRecienNacido: parseBoolean(params.incluyeRecienNacido),
    };
    const resultado = calculadora.evaluarSupuestoB_TercerHijo(datos);
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando Supuesto B: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_supuesto_c", 
  "👨‍👩‍👧‍👦 SUPUESTO C: ADOPCIÓN o ACOGIMIENTO oficial. ⚠️ CUÁNDO USAR: Solo procesos oficiales de adopción/acogimiento (ej: 'adoptamos un niño', 'tenemos un menor en acogimiento'). ❌ NO USAR para: hijos biológicos, cuidado informal de menores. ✅ REQUISITOS: adopción/acogimiento oficial + duración >1 año + menores de edad. 💰 PAGO: 500€/mes", {
  numeroHijos: z.any().describe("Número de menores adoptados/acogidos"),
  edadesHijos: z.any().describe("Edades de los menores adoptados/acogidos"),
  tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad si los hay (≥33% extiende edad límite a 9 años)"),
  tieneDependencia: z.any().optional().describe("¿Alguno tiene dependencia reconocida? (extiende edad límite a 9 años)")
}, async (params) => {
  try {
    const datos = {
      numeroHijos: parseNumber(params.numeroHijos),
      edadesHijos: parseArray(params.edadesHijos, parseNumber)?.filter(n => n !== undefined),
      tieneDiscapacidad: parseArray(params.tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
      tieneDependencia: parseArray(params.tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
    };
    const resultado = calculadora.evaluarSupuestoC_AdopcionAcogimiento(datos);
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando Supuesto C: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_supuesto_d", 
  "👶👶 SUPUESTO D: PARTOS/ADOPCIONES/ACOGIMIENTOS MÚLTIPLES. ⚠️ CUÁNDO USAR: Solo nacimientos/adopciones múltiples simultáneos (ej: 'tuvimos gemelos', 'adoptamos dos hermanos a la vez'). ❌ NO USAR para: hijos individuales, hermanos adoptados en fechas diferentes. ✅ REQUISITOS: múltiples simultáneos + menores de 6 años (9 si discapacidad ≥33%). 💰 PAGO: 500€/mes", {
  numeroHijos: z.any().describe("Número de hijos en el evento múltiple (gemelos=2, trillizos=3, etc.)"),
  edadesHijos: z.any().describe("Edades de los hijos múltiples (normalmente serán iguales)"),
  esPartoMultiple: z.any().optional().describe("¿Es parto múltiple? (gemelos, trillizos, etc.)"),
  esAdopcionMultiple: z.any().optional().describe("¿Adoptaron varios menores simultáneamente?"),
  esAcogimientoMultiple: z.any().optional().describe("¿Acogieron varios menores simultáneamente?"),
  tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad si los hay (≥33% extiende edad límite a 9 años)"),
  tieneDependencia: z.any().optional().describe("¿Alguno tiene dependencia reconocida? (extiende edad límite a 9 años)")
}, async (params) => {
  try {
    const datos = {
      numeroHijos: parseNumber(params.numeroHijos),
      edadesHijos: parseArray(params.edadesHijos, parseNumber)?.filter(n => n !== undefined),
      tieneDiscapacidad: parseArray(params.tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
      tieneDependencia: parseArray(params.tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
      esPartoMultiple: parseBoolean(params.esPartoMultiple),
      esAdopcionMultiple: parseBoolean(params.esAdopcionMultiple),
      esAcogimientoMultiple: parseBoolean(params.esAcogimientoMultiple),
    };
    const resultado = calculadora.evaluarSupuestoD_PartosMultiples(datos);
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando Supuesto D: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_supuesto_e", 
  "👤 SUPUESTO E: FAMILIAS MONOPARENTALES (padre/madre SIN pareja). ⚠️ CUÁNDO USAR: Solo padres/madres solteros, viudos, divorciados SIN pareja actual (ej: 'soy padre soltero', 'soy madre soltera', 'soy viuda con hijos'). Válido para CUALQUIER número de hijos (1º, 2º, 3º...). ❌ NO USAR para: parejas, familias biparentales. ✅ REQUISITOS: sin pareja + hijos menores 6 años (9 si discapacidad ≥33%). 💰 PAGO: 500€/mes", {
  esMonoparental: z.any().describe("¿Tiene acreditación oficial de familia monoparental?"),
  esSituacionMonoparentalidad: z.any().describe("¿Está realmente sin pareja? (soltero/soltera, viudo/viuda, divorciado SIN nueva pareja)"),
  numeroHijos: z.any().describe("Número total de hijos (puede ser 1, 2, 3, 4... cualquier cantidad)"),
  edadesHijos: z.any().describe("Edades de todos los hijos menores. Si no se saben las edades pero se indica que son menores de X años, X-1. Por ejemplo, si se dice: 4 hijos menores de 6 años [5, 5, 5, 5]."),
  tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad si los hay (≥33% extiende edad límite a 9 años)"),
  tieneDependencia: z.any().optional().describe("¿Alguno tiene dependencia reconocida? (extiende edad límite a 9 años)")
}, async (params) => {
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
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando Supuesto E: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_caso_discapacidad", 
  "♿ CASOS ESPECIALES: Evaluación simplificada para menores con discapacidad. ⚠️ CUÁNDO USAR: Cuando hay hijos con discapacidad ≥33% (amplía límite de edad de 6 a 9 años). 💡 CONTEXTO: La discapacidad ≥33% permite solicitar ayuda hasta los 9 años en lugar de 6.", {
  hijo1_edad: z.any().describe("Edad del primer hijo"),
  hijo1_discapacidad: z.any().optional().describe("Porcentaje de discapacidad del primer hijo (0 si no tiene)"),
  hijo2_edad: z.any().optional().describe("Edad del segundo hijo si existe"),
  hijo2_discapacidad: z.any().optional().describe("Porcentaje de discapacidad del segundo hijo (0 si no tiene)"),
  es_monoparental: z.any().optional().describe("¿Es familia monoparental? (importante para elegir supuesto)")
}, async (params) => {
  try {
    const hijo1_edad = parseNumber(params.hijo1_edad);
    const hijo1_discapacidad = parseNumber(params.hijo1_discapacidad) || 0;
    const hijo2_edad = parseNumber(params.hijo2_edad);
    const hijo2_discapacidad = parseNumber(params.hijo2_discapacidad) || 0;
    const es_monoparental = parseBoolean(params.es_monoparental) || false;

    if (!hijo1_edad) {
      return { content: [{ type: "text", text: "Error: Se requiere la edad del primer hijo" }] };
    }

    const resultado = {
      analisis_discapacidad: {
        hijo1: {
          edad: hijo1_edad,
          discapacidad: hijo1_discapacidad,
          limite_edad_aplicable: hijo1_discapacidad >= 33 ? 9 : 6,
          cumple_limite: hijo1_edad < (hijo1_discapacidad >= 33 ? 9 : 6)
        },
        hijo2: hijo2_edad ? {
          edad: hijo2_edad,
          discapacidad: hijo2_discapacidad,
          limite_edad_aplicable: hijo2_discapacidad >= 33 ? 9 : 6,
          cumple_limite: hijo2_edad < (hijo2_discapacidad >= 33 ? 9 : 6)
        } : null
      },
      recomendaciones: [] as string[]
    };

    // Análisis de elegibilidad
    if (es_monoparental) {
      resultado.recomendaciones.push("Como familia monoparental, evaluar Supuesto E");
    }

    if (hijo1_discapacidad >= 33 || (hijo2_discapacidad && hijo2_discapacidad >= 33)) {
      resultado.recomendaciones.push("Con discapacidad ≥33%, el límite de edad se extiende a 9 años");
    }

    const totalHijos = hijo2_edad ? 2 : 1;
    if (totalHijos >= 3) {
      resultado.recomendaciones.push("Con 3+ hijos, evaluar también Supuesto B");
    }

    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error evaluando caso discapacidad: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("validar_parentesco", 
  "🔍 VALIDADOR: Verifica si una relación familiar es de PRIMER GRADO según normativa Navarra. 💡 PRIMER GRADO (VÁLIDOS): padre, madre, hijo, hija, cónyuge, pareja, esposo, esposa. ❌ NO PRIMER GRADO: hermano, abuelo, tío, cuñado, primo, suegro, etc.", {
  relacion: z.string().describe("Relación familiar a validar (ej: padre, hermano, cuñado, abuelo, etc.)")
}, async ({ relacion }) => {
  try {
    const resultado = calculadora.validarParentescoPrimerGrado(relacion);
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error validando parentesco: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

// Herramienta de evaluación completa
server.tool("evaluacion_completa", "🔄 EVALUACIÓN INTEGRAL: Analiza TODOS los supuestos aplicables simultáneamente. ⚠️ CUÁNDO USAR: Para casos complejos que podrían aplicar a múltiples supuestos o cuando necesitas comparar opciones. 💡 UTILIDAD: Te dice cuál es la MEJOR opción y verifica compatibilidades.", {
  // Supuesto A
  supuestoA_relacionFamiliar: z.any().optional().describe("Relación familiar para supuesto A"),
  supuestoA_tieneEnfermedadGrave: z.any().optional().describe("¿Familiar tiene enfermedad grave? (Supuesto A)"),
  supuestoA_tieneAccidenteGrave: z.any().optional().describe("¿Familiar tiene accidente grave? (Supuesto A)"),
  supuestoA_requiereHospitalizacion: z.any().optional().describe("¿Requiere/requirió hospitalización? (Supuesto A)"),
  supuestoA_requiereCuidadoContinuo: z.any().optional().describe("¿Requiere cuidado continuo? (Supuesto A)"),
  supuestoA_requiereCuidadoPermanente: z.any().optional().describe("¿Requiere cuidado permanente? (Supuesto A)"),
  supuestoA_requiereCuidadoDirecto: z.any().optional().describe("¿Requiere cuidado directo? (Supuesto A)"),

  // Supuesto B
  supuestoB_numeroHijos: z.any().optional().describe("Número total de hijos (Supuesto B)"),
  supuestoB_edadesHijos: z.any().optional().describe("Edades de todos los hijos (Supuesto B)"),
  supuestoB_incluyeRecienNacido: z.any().optional().describe("¿Incluye recién nacido? (Supuesto B)"),

  // Supuesto C
  supuestoC_numeroHijos: z.any().optional().describe("Número total de hijos (Supuesto C)"),
  supuestoC_edadesHijos: z.any().optional().describe("Edades de los hijos (Supuesto C)"),
  supuestoC_tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad (Supuesto C)"),
  supuestoC_tieneDependencia: z.any().optional().describe("Dependencia reconocida por hijo (Supuesto C)"),

  // Supuesto D
  supuestoD_numeroHijos: z.any().optional().describe("Número total de hijos (Supuesto D)"),
  supuestoD_edadesHijos: z.any().optional().describe("Edades de los hijos (Supuesto D)"),
  supuestoD_tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad (Supuesto D)"),
  supuestoD_tieneDependencia: z.any().optional().describe("Dependencia reconocida por hijo (Supuesto D)"),
  supuestoD_esPartoMultiple: z.any().optional().describe("¿Es parto múltiple? (Supuesto D)"),
  supuestoD_esAdopcionMultiple: z.any().optional().describe("¿Es adopción múltiple? (Supuesto D)"),
  supuestoD_esAcogimientoMultiple: z.any().optional().describe("¿Es acogimiento múltiple? (Supuesto D)"),

  // Supuesto E
  supuestoE_esMonoparental: z.any().optional().describe("¿Es familia monoparental? (Supuesto E)"),
  supuestoE_esSituacionMonoparentalidad: z.any().optional().describe("¿Situación de monoparentalidad? (Supuesto E)"),
  supuestoE_numeroHijos: z.any().optional().describe("Número total de hijos (Supuesto E)"),
  supuestoE_edadesHijos: z.any().optional().describe("Edades de los hijos (Supuesto E)"),
  supuestoE_tieneDiscapacidad: z.any().optional().describe("Porcentajes de discapacidad (Supuesto E)"),
  supuestoE_tieneDependencia: z.any().optional().describe("Dependencia reconocida por hijo (Supuesto E)"),

  // Situación actual (compatibilidades)
  tieneOtrasAyudasPublicas: z.any().optional().describe("¿Tiene otras ayudas públicas?"),
  tienePrestacionesSeguridadSocial: z.any().optional().describe("¿Tiene prestaciones de seguridad social?"),
  tieneAyudaDependencia: z.any().optional().describe("¿Tiene ayudas a la dependencia?"),
  tieneConvenioEspecialCuidadores: z.any().optional().describe("¿Tiene convenio especial para cuidadores?"),
  importeOtrasAyudas: z.any().optional().describe("Importe de otras ayudas"),
  importeAyudaDependencia: z.any().optional().describe("Importe de ayuda a la dependencia")
}, async (params) => {
  try {
    const datosCompletos: any = {};

    // Preparar Supuesto A
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

    // Preparar Supuesto B
    if (params.supuestoB_numeroHijos) {
      datosCompletos.supuestoB = {
        numeroHijos: parseNumber(params.supuestoB_numeroHijos),
        edadesHijos: parseArray(params.supuestoB_edadesHijos, parseNumber)?.filter(n => n !== undefined),
        incluyeRecienNacido: parseBoolean(params.supuestoB_incluyeRecienNacido),
      };
    }

    // Preparar Supuesto C
    if (params.supuestoC_numeroHijos) {
      datosCompletos.supuestoC = {
        numeroHijos: parseNumber(params.supuestoC_numeroHijos),
        edadesHijos: parseArray(params.supuestoC_edadesHijos, parseNumber)?.filter(n => n !== undefined),
        tieneDiscapacidad: parseArray(params.supuestoC_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
        tieneDependencia: parseArray(params.supuestoC_tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
      };
    }

    // Preparar Supuesto D
    if (params.supuestoD_numeroHijos) {
      datosCompletos.supuestoD = {
        numeroHijos: parseNumber(params.supuestoD_numeroHijos),
        edadesHijos: parseArray(params.supuestoD_edadesHijos, parseNumber)?.filter(n => n !== undefined),
        tieneDiscapacidad: parseArray(params.supuestoD_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
        tieneDependencia: parseArray(params.supuestoD_tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
        esPartoMultiple: parseBoolean(params.supuestoD_esPartoMultiple),
        esAdopcionMultiple: parseBoolean(params.supuestoD_esAdopcionMultiple),
        esAcogimientoMultiple: parseBoolean(params.supuestoD_esAcogimientoMultiple),
      };
    }

    // Preparar Supuesto E
    if (params.supuestoE_numeroHijos || params.supuestoE_esMonoparental) {
      datosCompletos.supuestoE = {
        esMonoparental: parseBoolean(params.supuestoE_esMonoparental),
        esSituacionMonoparentalidad: parseBoolean(params.supuestoE_esSituacionMonoparentalidad),
        numeroHijos: parseNumber(params.supuestoE_numeroHijos),
        edadesHijos: parseArray(params.supuestoE_edadesHijos, parseNumber)?.filter(n => n !== undefined),
        tieneDiscapacidad: parseArray(params.supuestoE_tieneDiscapacidad, parseNumber)?.filter(n => n !== undefined) || [],
        tieneDependencia: parseArray(params.supuestoE_tieneDependencia, parseBoolean)?.filter(b => b !== undefined) || [],
      };
    }

    // Preparar situación actual
    if (params.tieneOtrasAyudasPublicas !== undefined) {
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
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error en evaluación completa: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

// Setup
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
