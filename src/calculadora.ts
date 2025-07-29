// Sistema de Ayudas a personas trabajadoras en excedencia para el cuidado de familiares 2025
// Gobierno de Navarra - Orden Foral 14/2025

interface ParentescoInfo {
  grado: number;
  tipo: string;
  valido: boolean;
}

interface ValidacionParentesco {
  esValido: boolean;
  esPrimerGrado: boolean;
  grado: number | null;
  tipo: string | null;
  relacion: string;
  mensaje: string;
}

interface DatosSupuestoA {
  relacionFamiliar: string;
  tieneEnfermedadGrave?: boolean;
  tieneAccidenteGrave?: boolean;
  requiereHospitalizacion?: boolean;
  requiereCuidadoContinuo?: boolean;
  requiereCuidadoPermanente?: boolean;
  requiereCuidadoDirecto?: boolean;
}

interface DatosSupuestoB {
  numeroHijos?: number;
  edadesHijos?: number[];
  incluyeRecienNacido?: boolean;
}

interface DatosSupuestoC {
  numeroHijos?: number;
  edadesHijos?: number[];
  tieneDiscapacidad?: number[];
  tieneDependencia?: boolean[];
}

interface DatosSupuestoE {
  esMonoparental?: boolean;
  esSituacionMonoparentalidad?: boolean;
  numeroHijos?: number;
  edadesHijos?: number[];
  tieneDiscapacidad?: number[];
  tieneDependencia?: boolean[];
}

interface SituacionActual {
  tieneOtrasAyudasPublicas?: boolean;
  tienePrestacionesSeguridadSocial?: boolean;
  tieneAyudaDependencia?: boolean;
  tieneConvenioEspecialCuidadores?: boolean;
  importeOtrasAyudas?: number;
  importeAyudaDependencia?: number;
}

interface ResultadoEvaluacion {
  supuesto: string;
  es_elegible: boolean;
  validaciones: Record<string, boolean>;
  errores: string[];
  advertencias?: string[];
  parentesco_info?: ValidacionParentesco;
  descripcion: string;
  analisis_edades?: any;
  analisis_discapacidad?: any;
}

interface ResultadoCompatibilidades {
  es_compatible: boolean;
  incompatibilidades: string[];
  compatibilidades: string[];
  limitaciones: string[];
  puede_solicitar: boolean;
}

interface DatosCompletos {
  supuestoA?: DatosSupuestoA;
  supuestoB?: DatosSupuestoB;
  supuestoC?: DatosSupuestoC;
  supuestoE?: DatosSupuestoE;
  situacionActual?: SituacionActual;
}

interface EvaluacionCompleta {
  supuestos_evaluados: ResultadoEvaluacion[];
  supuestos_elegibles: ResultadoEvaluacion[];
  mejor_opcion: ResultadoEvaluacion | null;
  compatibilidades: ResultadoCompatibilidades | null;
  resumen: {
    total_supuestos_elegibles: number;
    puede_solicitar: boolean;
  };
}

export class CalculadoraExcedenciaNavarra2025 {
  private readonly supuestosSubvencionables = {
    CUIDADO_FAMILIAR_PRIMER_GRADO: 'cuidado_familiar_primer_grado',
    CUIDADO_TERCER_HIJO_O_SUCESIVOS: 'cuidado_tercer_hijo_sucesivos',
    CUIDADO_SEGUNDO_HIJO_DISCAPACIDAD: 'cuidado_segundo_hijo_discapacidad',
    CUIDADO_ADOPCION_ACOGIMIENTO: 'cuidado_adopcion_acogimiento',
    CUIDADO_PARTOS_MULTIPLES: 'cuidado_partos_multiples',
    CUIDADO_FAMILIA_MONOPARENTAL: 'cuidado_familia_monoparental'
  };

  private readonly familiarPrimerGrado: Record<string, ParentescoInfo> = {
    'padre': { grado: 1, tipo: 'ascendiente', valido: true },
    'madre': { grado: 1, tipo: 'ascendiente', valido: true },
    'hijo': { grado: 1, tipo: 'descendiente', valido: true },
    'hija': { grado: 1, tipo: 'descendiente', valido: true },
    'conyuge': { grado: 0, tipo: 'afin', valido: true },
    'esposo': { grado: 0, tipo: 'afin', valido: true },
    'esposa': { grado: 0, tipo: 'afin', valido: true },
    'pareja': { grado: 0, tipo: 'afin', valido: true },
    'pareja_de_hecho': { grado: 0, tipo: 'afin', valido: true }
  };

  private readonly familiarNoValido: Record<string, ParentescoInfo> = {
    'abuelo': { grado: 2, tipo: 'ascendiente', valido: false },
    'abuela': { grado: 2, tipo: 'ascendiente', valido: false },
    'hermano': { grado: 2, tipo: 'colateral', valido: false },
    'hermana': { grado: 2, tipo: 'colateral', valido: false },
    'nieto': { grado: 2, tipo: 'descendiente', valido: false },
    'nieta': { grado: 2, tipo: 'descendiente', valido: false },
    'tio': { grado: 3, tipo: 'colateral', valido: false },
    'tia': { grado: 3, tipo: 'colateral', valido: false },
    'primo': { grado: 4, tipo: 'colateral', valido: false },
    'prima': { grado: 4, tipo: 'colateral', valido: false }
  };

  private readonly limitesEdad = {
    menores_6_años: 6,
    menores_9_años_discapacidad: 9,
    discapacidad_minima: 33
  };

  private readonly incompatibilidades = [
    'Otras ayudas públicas para la misma finalidad y período',
    'Prestaciones de seguridad social por cuidado de menores con cáncer u otra enfermedad grave'
  ];

  private readonly compatibilidades = [
    'Ayudas a la dependencia (con limitación de cuantía)',
    'Convenio Especial para Cuidadores no profesionales de la Seguridad Social'
  ];

  /**
   * Valida si una relación familiar es de primer grado según los criterios de Navarra
   */
  validarParentescoPrimerGrado(relacion: string): ValidacionParentesco {
    const relacionNormalizada = relacion.toLowerCase().trim()
      .replace(/[\s\-\_]/g, '_')
      .replace('pareja_de_hecho', 'pareja_de_hecho');

    if (this.familiarPrimerGrado[relacionNormalizada]) {
      const info = this.familiarPrimerGrado[relacionNormalizada];
      return {
        esValido: true,
        esPrimerGrado: true,
        grado: info.grado,
        tipo: info.tipo,
        relacion: relacionNormalizada,
        mensaje: `✅ Parentesco VÁLIDO: ${info.tipo} ${info.grado === 0 ? '(cónyuge/pareja)' : `de ${info.grado}º grado`}`
      };
    }

    if (this.familiarNoValido[relacionNormalizada]) {
      const info = this.familiarNoValido[relacionNormalizada];
      return {
        esValido: false,
        esPrimerGrado: false,
        grado: info.grado,
        tipo: info.tipo,
        relacion: relacionNormalizada,
        mensaje: `❌ Parentesco NO VÁLIDO: ${info.tipo} de ${info.grado}º grado. Solo se admiten familiares de primer grado.`
      };
    }

    return {
      esValido: false,
      esPrimerGrado: false,
      grado: null,
      tipo: null,
      relacion: relacionNormalizada,
      mensaje: `❓ Relación '${relacion}' no reconocida en el sistema.`
    };
  }

  /**
   * Evalúa el supuesto A: Cuidado de familiares de primer grado
   */
  evaluarSupuestoA_CuidadoFamiliarPrimerGrado(datos: DatosSupuestoA): ResultadoEvaluacion {
    const {
      relacionFamiliar,
      tieneEnfermedadGrave = false,
      tieneAccidenteGrave = false,
      requiereHospitalizacion = false,
      requiereCuidadoContinuo = false,
      requiereCuidadoPermanente = false,
      requiereCuidadoDirecto = false
    } = datos;

    const validaciones = {
      parentesco_valido: false,
      enfermedad_o_accidente_grave: false,
      requiere_hospitalizacion: false,
      cuidado_cualificado: false
    };

    const errores: string[] = [];
    const advertencias: string[] = [];

    const parentescoInfo = this.validarParentescoPrimerGrado(relacionFamiliar);
    validaciones.parentesco_valido = parentescoInfo.esValido;
    
    if (!validaciones.parentesco_valido) {
      errores.push(parentescoInfo.mensaje);
    }

    validaciones.enfermedad_o_accidente_grave = tieneEnfermedadGrave || tieneAccidenteGrave;
    if (!validaciones.enfermedad_o_accidente_grave) {
      errores.push('Se requiere enfermedad o accidente grave del familiar');
    }

    validaciones.requiere_hospitalizacion = requiereHospitalizacion;
    if (!validaciones.requiere_hospitalizacion) {
      advertencias.push('Se requiere que haya requerido hospitalización');
    }

    validaciones.cuidado_cualificado = requiereCuidadoDirecto && requiereCuidadoContinuo && requiereCuidadoPermanente;
    if (!validaciones.cuidado_cualificado) {
      const faltantes: string[] = [];
      if (!requiereCuidadoDirecto) faltantes.push('directo');
      if (!requiereCuidadoContinuo) faltantes.push('continuo');
      if (!requiereCuidadoPermanente) faltantes.push('permanente');
      errores.push(`El cuidado debe ser ${faltantes.join(', ')}`);
    }

    const esElegible = Object.values(validaciones).every(v => v === true);

    return {
      supuesto: this.supuestosSubvencionables.CUIDADO_FAMILIAR_PRIMER_GRADO,
      es_elegible: esElegible,
      validaciones,
      errores,
      advertencias,
      parentesco_info: parentescoInfo,
      descripcion: 'Supuesto A: Cuidado de familiares de primer grado con enfermedad/accidente grave'
    };
  }

  /**
   * Evalúa el supuesto B: Cuidado del tercer hijo o sucesivos
   */
  evaluarSupuestoB_TercerHijo(datos: DatosSupuestoB): ResultadoEvaluacion {
    const {
      numeroHijos = 0,
      edadesHijos = [],
      incluyeRecienNacido = false
    } = datos;

    const validaciones = {
      tiene_tres_o_mas_hijos: false,
      al_menos_dos_menores_6_años: false,
      incluye_recien_nacido: false
    };

    const errores: string[] = [];

    validaciones.tiene_tres_o_mas_hijos = numeroHijos >= 3;
    if (!validaciones.tiene_tres_o_mas_hijos) {
      errores.push(`Se requieren al menos 3 hijos. Actual: ${numeroHijos}`);
    }

    const menoresDe6 = edadesHijos.filter(edad => edad < this.limitesEdad.menores_6_años).length;
    validaciones.al_menos_dos_menores_6_años = menoresDe6 >= 2;
    if (!validaciones.al_menos_dos_menores_6_años) {
      errores.push(`Se requieren al menos 2 menores de 6 años (incluido recién nacido). Actual: ${menoresDe6}`);
    }

    validaciones.incluye_recien_nacido = incluyeRecienNacido;
    if (!validaciones.incluye_recien_nacido) {
      errores.push('Debe incluir el recién nacido en el cálculo');
    }

    const esElegible = Object.values(validaciones).every(v => v === true);

    return {
      supuesto: this.supuestosSubvencionables.CUIDADO_TERCER_HIJO_O_SUCESIVOS,
      es_elegible: esElegible,
      validaciones,
      errores,
      descripcion: 'Supuesto B: Cuidado del tercer hijo o sucesivos (2 menores de 6 años)',
      analisis_edades: {
        total_hijos: numeroHijos,
        menores_6_años: menoresDe6,
        edades: edadesHijos
      }
    };
  }

  /**
   * Evalúa el supuesto C: Segundo hijo con discapacidad
   */
  evaluarSupuestoC_SegundoHijoDiscapacidad(datos: DatosSupuestoC): ResultadoEvaluacion {
    const {
      numeroHijos = 0,
      edadesHijos = [],
      tieneDiscapacidad = [],
      tieneDependencia = []
    } = datos;

    const validaciones = {
      tiene_dos_hijos: false,
      ambos_menores_9_años: false,
      uno_con_discapacidad_33_o_dependencia: false
    };

    const errores: string[] = [];

    validaciones.tiene_dos_hijos = numeroHijos === 2;
    if (!validaciones.tiene_dos_hijos) {
      errores.push(`Este supuesto requiere exactamente 2 hijos. Actual: ${numeroHijos}`);
    }

    const todosMenoresDe9 = edadesHijos.every(edad => edad < this.limitesEdad.menores_9_años_discapacidad);
    validaciones.ambos_menores_9_años = todosMenoresDe9 && edadesHijos.length === 2;
    if (!validaciones.ambos_menores_9_años) {
      errores.push('Ambos hijos deben ser menores de 9 años');
    }

    const tieneDiscapacidadValida = tieneDiscapacidad.some(porcentaje => 
      porcentaje >= this.limitesEdad.discapacidad_minima
    );
    const tieneDependenciaReconocida = tieneDependencia.some(dep => dep === true);
    
    validaciones.uno_con_discapacidad_33_o_dependencia = tieneDiscapacidadValida || tieneDependenciaReconocida;
    if (!validaciones.uno_con_discapacidad_33_o_dependencia) {
      errores.push('Uno de los hijos debe tener discapacidad superior al 33% y/o dependencia reconocida');
    }

    const esElegible = Object.values(validaciones).every(v => v === true);

    return {
      supuesto: this.supuestosSubvencionables.CUIDADO_SEGUNDO_HIJO_DISCAPACIDAD,
      es_elegible: esElegible,
      validaciones,
      errores,
      descripcion: 'Supuesto C: Segundo hijo con ambos menores de 9 años y uno con discapacidad/dependencia',
      analisis_discapacidad: {
        discapacidades: tieneDiscapacidad,
        dependencias: tieneDependencia,
        cumple_criterio_discapacidad: tieneDiscapacidadValida,
        cumple_criterio_dependencia: tieneDependenciaReconocida
      }
    };
  }

  /**
   * Evalúa el supuesto E: Familia monoparental
   */
  evaluarSupuestoE_FamiliaMonoparental(datos: DatosSupuestoE): ResultadoEvaluacion {
    const {
      esMonoparental = false,
      esSituacionMonoparentalidad = false,
      numeroHijos = 0,
      edadesHijos = [],
      tieneDiscapacidad = [],
      tieneDependencia = []
    } = datos;

    const validaciones = {
      es_familia_monoparental: false,
      cumple_limite_edad: false
    };

    const errores: string[] = [];

    validaciones.es_familia_monoparental = esMonoparental || esSituacionMonoparentalidad;
    if (!validaciones.es_familia_monoparental) {
      errores.push('Se requiere acreditación como familia monoparental según Ley Foral 5/2019');
    }

    const tieneHijoConDiscapacidad = tieneDiscapacidad.some(porcentaje => 
      porcentaje >= this.limitesEdad.discapacidad_minima
    );
    const tieneHijoConDependencia = tieneDependencia.some(dep => dep === true);
    
    const limiteEdad = (tieneHijoConDiscapacidad || tieneHijoConDependencia) ? 
      this.limitesEdad.menores_9_años_discapacidad : 
      this.limitesEdad.menores_6_años;

    const todosCumplenEdad = edadesHijos.every(edad => edad < limiteEdad);
    validaciones.cumple_limite_edad = todosCumplenEdad;
    
    if (!validaciones.cumple_limite_edad) {
      errores.push(`Todos los hijos deben ser menores de ${limiteEdad} años`);
    }

    const esElegible = Object.values(validaciones).every(v => v === true);

    return {
      supuesto: this.supuestosSubvencionables.CUIDADO_FAMILIA_MONOPARENTAL,
      es_elegible: esElegible,
      validaciones,
      errores,
      descripcion: 'Supuesto E: Familia monoparental para cualquier hijo',
      analisis_edades: {
        limite_edad_aplicable: limiteEdad,
        tiene_discapacidad_dependencia: tieneHijoConDiscapacidad || tieneHijoConDependencia,
        edades_hijos: edadesHijos
      }
    };
  }

  /**
   * Verifica incompatibilidades y compatibilidades
   */
  verificarCompatibilidades(situacionActual: SituacionActual): ResultadoCompatibilidades {
    const {
      tieneOtrasAyudasPublicas = false,
      tienePrestacionesSeguridadSocial = false,
      tieneAyudaDependencia = false,
      tieneConvenioEspecialCuidadores = false,
      importeOtrasAyudas = 0,
      importeAyudaDependencia = 0
    } = situacionActual;

    const incompatible_con: string[] = [];
    const compatible_con: string[] = [];
    const limitaciones: string[] = [];

    if (tieneOtrasAyudasPublicas) {
      incompatible_con.push('Otras ayudas públicas para la misma finalidad');
    }

    if (tienePrestacionesSeguridadSocial) {
      incompatible_con.push('Prestaciones de Seguridad Social por cuidado de menores con cáncer/enfermedad grave');
    }

    if (tieneAyudaDependencia) {
      compatible_con.push('Ayudas a la dependencia');
      if (importeAyudaDependencia > 0) {
        limitaciones.push(
          `La suma de ambas ayudas no puede superar el importe de la mayor (${Math.max(importeOtrasAyudas, importeAyudaDependencia)}€)`
        );
      }
    }

    if (tieneConvenioEspecialCuidadores) {
      compatible_con.push('Convenio Especial para Cuidadores no profesionales de la Seguridad Social');
    }

    return {
      es_compatible: incompatible_con.length === 0,
      incompatibilidades: incompatible_con,
      compatibilidades: compatible_con,
      limitaciones,
      puede_solicitar: incompatible_con.length === 0
    };
  }

  /**
   * Evaluación completa de todos los supuestos
   */
  evaluacionCompleta(datosCompletos: DatosCompletos): EvaluacionCompleta {
    const resultados: EvaluacionCompleta = {
      supuestos_evaluados: [],
      supuestos_elegibles: [],
      mejor_opcion: null,
      compatibilidades: null,
      resumen: {
        total_supuestos_elegibles: 0,
        puede_solicitar: false
      }
    };

    if (datosCompletos.supuestoA) {
      const resultadoA = this.evaluarSupuestoA_CuidadoFamiliarPrimerGrado(datosCompletos.supuestoA);
      resultados.supuestos_evaluados.push(resultadoA);
      if (resultadoA.es_elegible) {
        resultados.supuestos_elegibles.push(resultadoA);
      }
    }

    if (datosCompletos.supuestoB) {
      const resultadoB = this.evaluarSupuestoB_TercerHijo(datosCompletos.supuestoB);
      resultados.supuestos_evaluados.push(resultadoB);
      if (resultadoB.es_elegible) {
        resultados.supuestos_elegibles.push(resultadoB);
      }
    }

    if (datosCompletos.supuestoC) {
      const resultadoC = this.evaluarSupuestoC_SegundoHijoDiscapacidad(datosCompletos.supuestoC);
      resultados.supuestos_evaluados.push(resultadoC);
      if (resultadoC.es_elegible) {
        resultados.supuestos_elegibles.push(resultadoC);
      }
    }

    if (datosCompletos.supuestoE) {
      const resultadoE = this.evaluarSupuestoE_FamiliaMonoparental(datosCompletos.supuestoE);
      resultados.supuestos_evaluados.push(resultadoE);
      if (resultadoE.es_elegible) {
        resultados.supuestos_elegibles.push(resultadoE);
      }
    }

    if (datosCompletos.situacionActual) {
      resultados.compatibilidades = this.verificarCompatibilidades(datosCompletos.situacionActual);
    }

    if (resultados.supuestos_elegibles.length > 0) {
      resultados.mejor_opcion = resultados.supuestos_elegibles[0];
    }

    resultados.resumen.total_supuestos_elegibles = resultados.supuestos_elegibles.length;
    resultados.resumen.puede_solicitar = 
      resultados.supuestos_elegibles.length > 0 && 
      (resultados.compatibilidades ? resultados.compatibilidades.es_compatible : true);

    return resultados;
  }
}