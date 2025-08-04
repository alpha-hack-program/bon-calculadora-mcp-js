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

// Herramienta para evaluar elegibilidad básica y orientar hacia el supuesto correcto
// Agregar al archivo index.ts después de las otras herramientas

server.tool("evaluar_elegibilidad_basica", 
  "Evalúa elegibilidad básica y recomienda qué supuesto específico evaluar. USAR SIEMPRE PRIMERO antes de evaluar supuestos específicos.", {
  situacion: z.string().describe("Descripción completa de la situación (ej: 'padre soltero con 5 hijos', 'cuñada embarazada', 'tercer hijo recién nacido')"),
  tieneHijosNacidos: z.any().optional().describe("¿Ya tiene hijos nacidos? (no embarazo)"),
  esMonoparental: z.any().optional().describe("¿Es familia monoparental o padre/madre soltero/a?"),
  numeroHijos: z.any().optional().describe("Número total de hijos ya nacidos"),
  relacionFamiliar: z.string().optional().describe("Si es cuidado de familiar: relación (padre, madre, hijo, etc.)")
}, async (params) => {
  try {
    const situacion = params.situacion.toLowerCase();
    const tieneHijos = parseBoolean(params.tieneHijosNacidos);
    const esMonoparental = parseBoolean(params.esMonoparental);
    const numeroHijos = parseNumber(params.numeroHijos) || 0;
    const relacionFamiliar = params.relacionFamiliar?.toLowerCase() || '';
    
    const resultado = {
      es_elegible_general: false,
      razon_principal: '',
      supuestos_recomendados: [] as string[],
      herramientas_a_usar: [] as string[],
      parametros_sugeridos: {} as any,
      advertencias: [] as string[]
    };

    // 1. CASO: EMBARAZO SIN HIJOS NACIDOS
    if (situacion.includes('embarazada') && (tieneHijos === false || numeroHijos === 0)) {
      resultado.es_elegible_general = false;
      resultado.razon_principal = 'Las ayudas por excedencia requieren hijos YA NACIDOS. Durante el embarazo no se puede solicitar.';
      resultado.advertencias.push('Podrá solicitar la ayuda DESPUÉS del parto si cumple los requisitos');
      resultado.supuestos_recomendados = ['Evaluar después del nacimiento'];
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 2. CASO: CUIDADO DE FAMILIAR ADULTO
    if (relacionFamiliar && !['hijo', 'hija'].includes(relacionFamiliar)) {
      const parentescoValido = calculadora.validarParentescoPrimerGrado(relacionFamiliar);
      
      if (!parentescoValido.esValido) {
        resultado.es_elegible_general = false;
        resultado.razon_principal = `Relación '${relacionFamiliar}' no es familiar de primer grado según normativa Navarra`;
        resultado.advertencias.push('Solo se admiten: padre, madre, hijo, hija, cónyuge, pareja');
        return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
      }

      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Familiar de primer grado válido - evaluar Supuesto A';
      resultado.supuestos_recomendados = ['Supuesto A: Cuidado familiar primer grado'];
      resultado.herramientas_a_usar = ['evaluar_supuesto_a'];
      resultado.parametros_sugeridos = {
        relacionFamiliar: relacionFamiliar,
        requiere_completar: ['tieneEnfermedadGrave', 'tieneAccidenteGrave', 'requiereHospitalizacion', 'requiereCuidadoContinuo', 'requiereCuidadoPermanente', 'requiereCuidadoDirecto']
      };
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 3. CASO: NO TIENE HIJOS NACIDOS
    if (tieneHijos === false || numeroHijos === 0) {
      resultado.es_elegible_general = false;
      resultado.razon_principal = 'Se requieren hijos ya nacidos para solicitar excedencia por cuidado de hijos';
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 4. CASO: FAMILIA MONOPARENTAL (PRIORIDAD ALTA)
    if (esMonoparental === true || 
        situacion.includes('soltero') || 
        situacion.includes('soltera') || 
        situacion.includes('monoparental') ||
        situacion.includes('padre solo') ||
        situacion.includes('madre sola')) {
      
      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Familia monoparental detectada - usar SUPUESTO E (válido para cualquier hijo: 1º, 2º, 3º...)';
      resultado.supuestos_recomendados = ['Supuesto E: Familia monoparental'];
      resultado.herramientas_a_usar = ['evaluar_supuesto_e'];
      resultado.parametros_sugeridos = {
        esMonoparental: true,
        numeroHijos: numeroHijos,
        requiere_completar: ['edadesHijos']
      };
      resultado.advertencias.push('IMPORTANTE: Para familias monoparentales usar SIEMPRE Supuesto E, NO Supuesto B');
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 5. CASO: TERCER HIJO O MÁS (solo si NO es monoparental)
    if (numeroHijos >= 3 || situacion.includes('tercer hijo') || situacion.includes('3 hijos')) {
      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Tercer hijo o más detectado - evaluar Supuesto B';
      resultado.supuestos_recomendados = ['Supuesto B: Tercer hijo o sucesivos'];
      resultado.herramientas_a_usar = ['evaluar_supuesto_b'];
      resultado.parametros_sugeridos = {
        numeroHijos: numeroHijos,
        incluyeRecienNacido: true,
        requiere_completar: ['edadesHijos']
      };
      resultado.advertencias.push('Requiere recién nacido + al menos 2 menores de 6 años');
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 6. CASO: ADOPCIÓN/ACOGIMIENTO
    if (situacion.includes('adopc') || situacion.includes('acogimiento')) {
      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Adopción o acogimiento detectado - evaluar Supuesto C';
      resultado.supuestos_recomendados = ['Supuesto C: Adopción/Acogimiento'];
      resultado.herramientas_a_usar = ['evaluar_supuesto_c'];
      resultado.advertencias.push('Requiere duración prevista superior a 1 año');
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 7. CASO: PARTO MÚLTIPLE
    if (situacion.includes('gemelos') || situacion.includes('mellizos') || situacion.includes('múltiple')) {
      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Parto múltiple detectado - evaluar Supuesto D';
      resultado.supuestos_recomendados = ['Supuesto D: Partos múltiples'];
      resultado.herramientas_a_usar = ['evaluar_supuesto_d'];
      resultado.parametros_sugeridos = {
        esPartoMultiple: true
      };
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 8. CASO: SITUACIÓN NO CLARA - PEDIR MÁS INFORMACIÓN
    if (numeroHijos > 0) {
      resultado.es_elegible_general = true;
      resultado.razon_principal = 'Tiene hijos nacidos - necesita más información para determinar supuesto exacto';
      resultado.supuestos_recomendados = ['Requiere clarificación'];
      resultado.advertencias.push('Especificar: ¿Es familia monoparental? ¿Cuántos hijos? ¿Adopción/acogimiento?');
      return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
    }

    // 9. CASO POR DEFECTO - NO ELEGIBLE
    resultado.es_elegible_general = false;
    resultado.razon_principal = 'No se puede determinar elegibilidad con la información proporcionada';
    resultado.advertencias.push('Proporcionar más detalles sobre la situación familiar');

    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };

  } catch (error) {
    return { 
      content: [{ 
        type: "text", 
        text: `Error evaluando elegibilidad básica: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      }] 
    };
  }
});


server.tool("validar_parentesco", "Valida si una relación familiar es de primer grado según los criterios de Navarra", {
  relacion: z.string().describe("Tipo de relación familiar (ej: madre, padre, hijo, conyuge)")
}, async ({ relacion }) => {
  try {
    const resultado = calculadora.validarParentescoPrimerGrado(relacion);
    return { content: [{ type: "text", text: JSON.stringify(resultado, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error validando parentesco: ${error instanceof Error ? error.message : 'Error desconocido'}` }] };
  }
});

server.tool("evaluar_supuesto_a", "Evalúa el Supuesto A: Cuidado de familiares de primer grado con enfermedad/accidente grave", {
  relacionFamiliar: z.string().describe("Relación familiar (madre, padre, hijo, conyuge, etc.)"),
  tieneEnfermedadGrave: z.any().describe("¿Tiene enfermedad grave?"),
  tieneAccidenteGrave: z.any().describe("¿Tiene accidente grave?"),
  requiereHospitalizacion: z.any().describe("¿Requiere/requirió hospitalización?"),
  requiereCuidadoContinuo: z.any().describe("¿Requiere cuidado continuo?"),
  requiereCuidadoPermanente: z.any().describe("¿Requiere cuidado permanente?"),
  requiereCuidadoDirecto: z.any().describe("¿Requiere cuidado directo?")
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

server.tool("evaluar_supuesto_b", "Evalúa el Supuesto B: Cuidado del tercer hijo o sucesivos", {
  numeroHijos: z.any().describe("Número total de hijos"),
  edadesHijos: z.any().describe("Edades de todos los hijos (array)"),
  incluyeRecienNacido: z.any().describe("¿Incluye recién nacido?")
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

server.tool("evaluar_supuesto_e", "Evalúa el Supuesto E: Familia monoparental", {
  esMonoparental: z.any().describe("¿Es familia monoparental acreditada?"),
  esSituacionMonoparentalidad: z.any().describe("¿Situación de monoparentalidad?"),
  numeroHijos: z.any().describe("Número total de hijos"),
  edadesHijos: z.any().describe("Edades de los hijos"),
  tieneDiscapacidad: z.any().describe("Porcentajes de discapacidad por hijo"),
  tieneDependencia: z.any().describe("Dependencia reconocida por hijo")
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
