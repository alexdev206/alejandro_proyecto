/**
 * ==============================================================================
 * SISVAN & SALUD CAPITAL - SCRIPT AUTOCONTENIDO DE CONSOLA (F12)
 * ==============================================================================
 * Diseñado para ejecutarse directamente en la consola de Google Chrome (F12)
 * en el dominio: https://appb.saludcapital.gov.co
 *
 * Portales soportados:
 *  - PAI Menores:       /pai/vacunacion/datosBasicos.aspx?pag=2
 *  - PAI Mayores:       /pai/vacunacion/datosBasicos.aspx?pag=3
 *  - PAI Auto:          Prueba primero Menores (pag=2) y si no existe busca en Mayores (pag=3)
 *  - Comprobador:       /comprobadordederechos/Consulta.aspx (Contributivo / BUDA / Subsidiado)
 *
 * Características:
 *  - 100% Vanilla JavaScript (cero dependencias externas, cero librerías, cero CDN).
 *  - Cero llamadas a servidores externos (máxima privacidad y seguridad hospitalaria).
 *  - Interfaz flotante inyectada con controles de inicio, pausa/detener, métricas y descarga CSV.
 *  - Ejecución en iframe interno de mismo origen (evita que la recarga de página mate el script).
 *  - Parser y generador de CSV con BOM UTF-8 y delimitador punto y coma (;).
 *  - Cronómetro de tiempo real con cálculo de velocidad (regs/min) y estimación de fin.
 *  - Mini-diagnóstico integrado invocable desde el panel o escribiendo diagnostico() en la consola.
 * ==============================================================================
 */

(function () {
  'use strict';

  // Si ya existía una instancia previa del panel, retirarla limpiamente
  const PREV_PANEL = document.getElementById('sisvan-console-root');
  if (PREV_PANEL) {
    try {
      PREV_PANEL.remove();
    } catch (_e) {}
  }

  // ============================================================================
  // 1. CONFIGURACIÓN, CATÁLOGOS Y SELECTORES ASP.NET WEBFORMS
  // ============================================================================
  const HOST_ESPERADO = 'appb.saludcapital.gov.co';
  const ES_ORIGEN_OFICIAL = window.location.hostname.includes('saludcapital.gov.co');

  const URLS = {
    paiMenores: '/pai/vacunacion/datosBasicos.aspx?pag=2',
    paiMayores: '/pai/vacunacion/datosBasicos.aspx?pag=3',
    paiLogin: '/pai/inicio/login.aspx',
    comprobador: '/comprobadordederechos/Consulta.aspx',
  };

  const CAMPOS_PAI_CATALOGO = [
    { id: 'td', label: 'Tipo Documento', sel: '#ContentPlaceHolder1_ddl_TipoIdentificacion, #ContentPlaceHolder1_txb_TipoIdentificacion', tipo: 'select', grupo: 'basico' },
    { id: 'nombre1', label: 'Primer Nombre', sel: '#ContentPlaceHolder1_txb_Nombre1', tipo: 'input', grupo: 'basico', fijo: true },
    { id: 'nombre2', label: 'Segundo Nombre', sel: '#ContentPlaceHolder1_txb_Nombre2', tipo: 'input', grupo: 'basico' },
    { id: 'apellido1', label: 'Primer Apellido', sel: '#ContentPlaceHolder1_txb_Apellido1', tipo: 'input', grupo: 'basico', fijo: true },
    { id: 'apellido2', label: 'Segundo Apellido', sel: '#ContentPlaceHolder1_txb_Apellido2', tipo: 'input', grupo: 'basico' },
    { id: 'fecha_nacimiento', label: 'Fecha Nacimiento', sel: '#ContentPlaceHolder1_txb_FechaNacimiento', tipo: 'input', grupo: 'basico' },
    { id: 'sexo', label: 'Sexo Biológico', sel: '#ContentPlaceHolder1_ddl_Sexo, #ContentPlaceHolder1_txb_Sexo', tipo: 'select', grupo: 'basico' },
    { id: 'genero', label: 'Género', sel: '#ContentPlaceHolder1_ddl_Genero', tipo: 'select', grupo: 'basico' },
    { id: 'telefono1', label: 'Teléfono Principal', sel: '#ContentPlaceHolder1_txb_Telefono, #ContentPlaceHolder1_txb_Telefono1', tipo: 'input', grupo: 'contacto' },
    { id: 'telefono2', label: 'Teléfono Secundario', sel: '#ContentPlaceHolder1_txb_Telefono2, #ContentPlaceHolder1_txb_Celular', tipo: 'input', grupo: 'contacto' },
    { id: 'direccion', label: 'Dirección Residencia', sel: '#ContentPlaceHolder1_txb_Direccion', tipo: 'input', grupo: 'ubicacion' },
    { id: 'direccionadicional', label: 'Dirección Adicional', sel: '#ContentPlaceHolder1_txb_DireccionAdicional', tipo: 'input', grupo: 'ubicacion' },
    { id: 'departamento', label: 'Departamento', sel: '#ContentPlaceHolder1_ddl_Departamento', tipo: 'select', grupo: 'ubicacion' },
    { id: 'municipio', label: 'Municipio', sel: '#ContentPlaceHolder1_ddl_Municipio', tipo: 'select', grupo: 'ubicacion' },
    { id: 'localidad', label: 'Localidad', sel: '#ContentPlaceHolder1_ddl_Localidad', tipo: 'select', grupo: 'ubicacion' },
    { id: 'upz', label: 'UPZ', sel: '#ContentPlaceHolder1_ddl_Upz, #ContentPlaceHolder1_txb_Upz', tipo: 'select', grupo: 'ubicacion' },
    { id: 'barrio', label: 'Barrio', sel: '#ContentPlaceHolder1_ddl_Barrio, #ContentPlaceHolder1_txb_Barrio', tipo: 'select', grupo: 'ubicacion' },
    { id: 'eapb', label: 'EAPB / Aseguradora EPS', sel: '#ContentPlaceHolder1_ddl_Aseguradora, #ContentPlaceHolder1_ddl_EAPB, #ContentPlaceHolder1_txb_Eapb', tipo: 'select', grupo: 'aseguramiento' },
    { id: 'regimen', label: 'Régimen Afiliación', sel: '#ContentPlaceHolder1_ddl_Regimen', tipo: 'select', grupo: 'aseguramiento' },
    { id: 'tdmadre', label: 'Tipo Doc Madre', sel: '#ContentPlaceHolder1_ddl_TipoIdentificacionMadre', tipo: 'select', grupo: 'madre' },
    { id: 'docmadre', label: 'Número Doc Madre', sel: '#ContentPlaceHolder1_txb_NumeroIdentificacionMadre', tipo: 'input', grupo: 'madre' },
    { id: 'nombrem1', label: 'Primer Nombre Madre', sel: '#ContentPlaceHolder1_txb_PrimerNombreMadre', tipo: 'input', grupo: 'madre' },
    { id: 'nombrem2', label: 'Segundo Nombre Madre', sel: '#ContentPlaceHolder1_txb_SegundoNombreMadre', tipo: 'input', grupo: 'madre' },
    { id: 'apellidomadre1', label: 'Primer Apellido Madre', sel: '#ContentPlaceHolder1_txb_PrimerApellidoMadre', tipo: 'input', grupo: 'madre' },
    { id: 'apellidomadre2', label: 'Segundo Apellido Madre', sel: '#ContentPlaceHolder1_txb_SegundoApellidoMadre', tipo: 'input', grupo: 'madre' }
  ];

  const CAMPOS_COMPROBADOR_DEFAULT = [
    { id: 'tabla_origen', label: 'Tabla Origen (Contributivo / BUDA)', checked: true },
    { id: 'estado', label: 'Estado de Afiliación', checked: true },
    { id: 'entidad', label: 'Entidad / EPS', checked: true },
    { id: 'regimen', label: 'Régimen', checked: true },
    { id: 'tipo_afiliado', label: 'Tipo Afiliado (Cotizante / Beneficiario)', checked: true },
    { id: 'departamento', label: 'Departamento Afiliación', checked: true },
    { id: 'municipio', label: 'Municipio Afiliación', checked: true },
    { id: 'sexo_detalle', label: 'Sexo (Consultar Detalle)', checked: true }
  ];

  // ============================================================================
  // 2. ESTADO GLOBAL DEL SCRIPT
  // ============================================================================
  const STATE = {
    portal: 'pai_menores', // 'pai_menores' | 'pai_mayores' | 'pai_auto' | 'comprobador'
    registros: [],        // [{ consecutivo, codigo, originalRow }]
    resultados: [],       // registros enriquecidos
    camposSeleccionadosPai: ['td', 'nombre2', 'apellido2', 'fecha_nacimiento', 'sexo', 'telefono1', 'direccion', 'localidad', 'barrio', 'eapb', 'regimen'],
    camposComprobador: {
      tabla_origen: true,
      estado: true,
      entidad: true,
      regimen: true,
      tipo_afiliado: true,
      departamento: true,
      municipio: true,
      sexo_detalle: true
    },
    ejecutando: false,
    detenerSolicitado: false,
    indiceActual: 0,
    startTime: 0,
    timerInterval: null,
    stats: {
      total: 0,
      exitosos: 0,
      noEncontrados: 0,
      errores: 0
    },
    retardoMs: 500,
    workerIframe: null
  };

  // ============================================================================
  // 3. UTILIDADES: CSV PARSER, EXPORTER Y FORMATTERS
  // ============================================================================

  /**
   * Parsea un texto CSV detectando automáticamente separador (; o ,) y limpiando BOM
   */
  function parsearCSV(texto) {
    if (!texto) return [];
    // Quitar BOM UTF-8 si viene en el archivo
    let clean = texto.replace(/^\uFEFF/, '').trim();
    if (!clean) return [];

    const lineas = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lineas.length === 0) return [];

    // Detectar separador por frecuencia en la primera línea
    const comaCount = (lineas[0].match(/,/g) || []).length;
    const puntoComaCount = (lineas[0].match(/;/g) || []).length;
    const tabCount = (lineas[0].match(/\t/g) || []).length;
    let sep = ';';
    if (tabCount > puntoComaCount && tabCount > comaCount) sep = '\t';
    else if (comaCount > puntoComaCount) sep = ',';

    const parseLinea = (linea) => {
      const valores = [];
      let dentroComillas = false;
      let valorActual = '';
      for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        if (char === '"') {
          if (dentroComillas && linea[i + 1] === '"') {
            valorActual += '"';
            i++;
          } else {
            dentroComillas = !dentroComillas;
          }
        } else if (char === sep && !dentroComillas) {
          valores.push(valorActual.trim());
          valorActual = '';
        } else {
          valorActual += char;
        }
      }
      valores.push(valorActual.trim());
      return valores;
    };

    const header = parseLinea(lineas[0]).map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''));
    
    // Buscar columnas 'consecutivo' y 'codigo'
    let idxConsecutivo = header.findIndex(h => h.includes('consecutivo') || h === 'id' || h === 'item' || h === 'nro' || h === 'num');
    let idxCodigo = header.findIndex(h => h.includes('codigo') || h.includes('identificacion') || h.includes('documento') || h.includes('cedula') || h === 'doc' || h === 'numero');

    // Si no encuentra por nombre, asumir por defecto: col 0 = consecutivo, col 1 = codigo (o si solo hay 1 col, col 0 = codigo)
    let tieneHeader = true;
    if (idxCodigo === -1) {
      if (header.length === 1) {
        idxCodigo = 0;
        idxConsecutivo = -1;
        // Comprobar si la primera línea ya era un número
        if (/^\d+$/.test(header[0])) tieneHeader = false;
      } else {
        idxConsecutivo = 0;
        idxCodigo = 1;
        if (/^\d+$/.test(header[0]) || /^\d+$/.test(header[1])) tieneHeader = false;
      }
    }

    const registros = [];
    const inicioFila = tieneHeader ? 1 : 0;

    for (let i = inicioFila; i < lineas.length; i++) {
      const cols = parseLinea(lineas[i]);
      if (cols.length === 0 || cols.every(c => !c)) continue;

      let consecutivo = (idxConsecutivo >= 0 && cols[idxConsecutivo]) ? cols[idxConsecutivo] : String(registros.length + 1);
      let codigo = (idxCodigo >= 0 && cols[idxCodigo]) ? cols[idxCodigo] : (cols[0] || '');

      // Limpiar caracteres extraños del código (dejar números o letras limpias)
      codigo = String(codigo).replace(/["']/g, '').trim();

      if (codigo) {
        registros.push({
          consecutivo: consecutivo,
          codigo: codigo,
          filaOriginal: i + 1
        });
      }
    }

    return registros;
  }

  /**
   * Genera y descarga el archivo CSV con BOM UTF-8 y delimitador punto y coma
   */
  function exportarResultadosCSV() {
    if (!STATE.resultados || STATE.resultados.length === 0) {
      alert('Aún no hay resultados para exportar.');
      return;
    }

    // Reunir todas las columnas presentes en los resultados
    const columnasFijas = ['CONSECUTIVO', 'CODIGO_BUSCADO', 'ESTADO_CONSULTA', 'PORTAL_CONSULTADO', 'DETALLE_RESPUESTA', 'FECHA_CONSULTA'];
    const columnasDinamicasSet = new Set();

    STATE.resultados.forEach(res => {
      if (res.data) {
        Object.keys(res.data).forEach(k => columnasDinamicasSet.add(k));
      }
    });

    const columnasDinamicas = Array.from(columnasDinamicasSet);
    const todasLasColumnas = [...columnasFijas, ...columnasDinamicas];

    const escapeCSV = (val) => {
      if (val === undefined || val === null) return '';
      const str = String(val).replace(/\r?\n/g, ' ').trim();
      if (str.includes(';') || str.includes('"') || str.includes(',')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lineas = [];
    // Encabezado
    lineas.push(todasLasColumnas.map(escapeCSV).join(';'));

    // Filas
    STATE.resultados.forEach(res => {
      const fila = [];
      fila.push(escapeCSV(res.consecutivo));
      fila.push(escapeCSV(res.codigo));
      fila.push(escapeCSV(res.estado));
      fila.push(escapeCSV(res.portal));
      fila.push(escapeCSV(res.mensaje));
      fila.push(escapeCSV(res.fechaHora));

      columnasDinamicas.forEach(col => {
        fila.push(escapeCSV(res.data ? res.data[col] : ''));
      });

      lineas.push(fila.join(';'));
    });

    // Agregar BOM UTF-8 (\uFEFF) para compatibilidad nativa con Excel en Windows
    const contenidoCSV = '\uFEFF' + lineas.join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const fechaStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `consulta_${STATE.portal}_${fechaStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    agregarLog(`Archivo CSV exportado exitosamente (${STATE.resultados.length} filas procesadas).`, 'info');
  }

  // ============================================================================
  // 4. MOTOR DE AUTOMATIZACIÓN DOM E IFRAME
  // ============================================================================

  /**
   * Crea o reutiliza el iframe de ejecución bajo el mismo origen
   */
  function obtenerIframeWorker() {
    let iframe = document.getElementById('sisvan-worker-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'sisvan-worker-iframe';
      iframe.name = 'sisvan-worker-iframe';
      iframe.style.width = '100%';
      iframe.style.height = '180px';
      iframe.style.border = '1px solid #cbd5e1';
      iframe.style.borderRadius = '6px';
      iframe.style.backgroundColor = '#ffffff';

      const container = document.getElementById('sisvan-iframe-container');
      if (container) {
        container.appendChild(iframe);
      } else {
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
    }
    STATE.workerIframe = iframe;
    return iframe;
  }

  /**
   * Espera a que un iframe termine de cargar completamente y el WebForms PageRequestManager termine
   */
  function esperarCargaIframe(iframe, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let intervalId;

      const limpiar = () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };

      timeoutId = setTimeout(() => {
        limpiar();
        resolve(); // Continuar incluso si agota tiempo, el selector siguiente validará
      }, timeoutMs);

      intervalId = setInterval(() => {
        try {
          const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
          if (!doc) return;

          const docListo = doc.readyState === 'complete';
          const win = iframe.contentWindow;
          let prmListo = true;
          if (win && win.Sys && win.Sys.WebForms && win.Sys.WebForms.PageRequestManager) {
            try {
              prmListo = !win.Sys.WebForms.PageRequestManager.getInstance().get_isInAsyncPostBack();
            } catch (_e) {
              prmListo = true;
            }
          }

          if (docListo && prmListo) {
            limpiar();
            resolve();
          }
        } catch (_err) {
          limpiar();
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Navega el iframe a una URL relativa y espera que esté listo
   */
  async function navegarIframe(url) {
    const iframe = obtenerIframeWorker();
    const docActual = iframe.contentDocument;
    if (docActual && docActual.location.pathname === url) {
      return; // Ya está en la página correcta
    }

    iframe.src = url;
    await esperarCargaIframe(iframe);
    await new Promise(r => setTimeout(r, 400));
  }

  /**
   * Espera a que un selector exista en el documento del iframe
   */
  function esperarSelector(doc, selector, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const elInmediato = doc.querySelector(selector);
      if (elInmediato) return resolve(elInmediato);

      const timer = setInterval(() => {
        const el = doc.querySelector(selector);
        if (el) {
          clearInterval(timer);
          return resolve(el);
        }
        if (Date.now() - inicio > timeoutMs) {
          clearInterval(timer);
          return resolve(null);
        }
      }, 150);
    });
  }

  /**
   * Espera a que un elemento tenga un valor o texto no vacío
   */
  function esperarValor(doc, selector, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const timer = setInterval(() => {
        const el = doc.querySelector(selector);
        if (el) {
          const val = el.value !== undefined ? el.value.trim() : (el.innerText || '').trim();
          if (val.length > 0) {
            clearInterval(timer);
            return resolve(val);
          }
        }
        if (Date.now() - inicio > timeoutMs) {
          clearInterval(timer);
          return resolve('');
        }
      }, 150);
    });
  }

  /**
   * Lee el valor seleccionado de un <select> o input
   */
  function leerControl(doc, selector) {
    if (!doc || !selector) return '';
    const el = doc.querySelector(selector);
    if (!el) return '';
    if (el.tagName.toLowerCase() === 'select') {
      const selectEl = el;
      if (selectEl.selectedIndex >= 0 && selectEl.options[selectEl.selectedIndex]) {
        return selectEl.options[selectEl.selectedIndex].text.trim();
      }
      return '';
    }
    return (el.value || el.innerText || '').trim();
  }

  /**
   * Ejecuta una acción que detona un UpdatePanel / PostBack de ASP.NET y espera su resolución
   */
  async function ejecutarAccionYEsperar(iframe, fnAccion, timeoutMs = 15000) {
    const win = iframe.contentWindow;
    let prm = null;
    try {
      if (win && win.Sys && win.Sys.WebForms && win.Sys.WebForms.PageRequestManager) {
        prm = win.Sys.WebForms.PageRequestManager.getInstance();
      }
    } catch (_e) {}

    fnAccion();

    await new Promise(r => setTimeout(r, 300));

    // Esperar a que el UpdatePanel termine el postback
    const inicio = Date.now();
    while (Date.now() - inicio < timeoutMs) {
      let ocupado = false;
      try {
        if (prm && prm.get_isInAsyncPostBack()) {
          ocupado = true;
        }
      } catch (_e) {}

      if (!ocupado) {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // ============================================================================
  // 5. CONSULTA EN PORTAL PAI (MENORES / MAYORES)
  // ============================================================================

  async function consultarCodigoEnPai(codigo, modo = 'menores') {
    const iframe = obtenerIframeWorker();
    const targetUrl = modo === 'menores' ? URLS.paiMenores : URLS.paiMayores;

    await navegarIframe(targetUrl);
    const doc = iframe.contentDocument;

    // Verificar si la sesión expiró o redirigió a login
    if (doc.location.href.toLowerCase().includes('login.aspx') || doc.querySelector('#txb_Usuario')) {
      throw new Error('SESION_REQUERIDA');
    }

    const inputBusqueda = await esperarSelector(doc, '#ContentPlaceHolder1_txb_NumeroIdentificacionBusqueda', 10000);
    if (!inputBusqueda) {
      throw new Error('No se encontró el campo de búsqueda #ContentPlaceHolder1_txb_NumeroIdentificacionBusqueda.');
    }

    // 1. Limpiar y colocar el código
    inputBusqueda.value = '';
    inputBusqueda.focus();
    inputBusqueda.value = codigo;
    inputBusqueda.dispatchEvent(new Event('input', { bubbles: true }));
    inputBusqueda.dispatchEvent(new Event('change', { bubbles: true }));

    // 2. Disparar búsqueda (Enter o botón buscar)
    await ejecutarAccionYEsperar(iframe, () => {
      const btnBuscar = doc.querySelector('#ContentPlaceHolder1_btnBuscar, #ContentPlaceHolder1_btn_Buscar, #ContentPlaceHolder1_btnConsultar');
      if (btnBuscar) {
        btnBuscar.click();
      } else {
        // Simular Enter
        const enterEv = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        inputBusqueda.dispatchEvent(enterEv);
        // Si WebForms tiene form, submit
        const form = doc.forms[0];
        if (form && typeof form.__doPostBack === 'function') {
          try {
            form.__doPostBack('ctl00$ContentPlaceHolder1$txb_NumeroIdentificacionBusqueda', '');
          } catch (_e) {}
        }
      }
    });

    // 3. Esperar enlace de la grilla gdvResultadoBusqueda
    const linkGrilla = await esperarSelector(doc, 'a[href*="gdvResultadoBusqueda"][href*="Select$0"]', 8000);
    if (!linkGrilla) {
      return {
        encontrado: false,
        mensaje: 'No registrado en PAIWEB.',
        data: {}
      };
    }

    // 4. Hacer clic en el enlace para abrir el formulario del paciente
    await ejecutarAccionYEsperar(iframe, () => {
      linkGrilla.click();
    });

    // 5. Esperar a que se popule el campo de identificación
    await esperarValor(doc, '#ContentPlaceHolder1_txb_Identificacion', 10000);

    // 6. Extraer campos
    const datos = {};
    const pNom = leerControl(doc, '#ContentPlaceHolder1_txb_Nombre1');
    const sNom = leerControl(doc, '#ContentPlaceHolder1_txb_Nombre2');
    const pApe = leerControl(doc, '#ContentPlaceHolder1_txb_Apellido1');
    const sApe = leerControl(doc, '#ContentPlaceHolder1_txb_Apellido2');

    datos['PAI_PRIMER_NOMBRE'] = pNom;
    datos['PAI_SEGUNDO_NOMBRE'] = sNom;
    datos['PAI_PRIMER_APELLIDO'] = pApe;
    datos['PAI_SEGUNDO_APELLIDO'] = sApe;
    datos['PAI_NOMBRE_COMPLETO'] = `${pNom} ${sNom} ${pApe} ${sApe}`.replace(/\s+/g, ' ').trim();
    datos['PAI_MODO_CONSULTA'] = modo.toUpperCase();

    // Extraer los campos solicitados por los checkboxes del panel
    for (const campo of CAMPOS_PAI_CATALOGO) {
      if (STATE.camposSeleccionadosPai.includes(campo.id)) {
        const val = leerControl(doc, campo.sel);
        datos[`PAI_${campo.id.toUpperCase()}`] = val;
      }
    }

    return {
      encontrado: true,
      mensaje: `Verificado en PAIWEB (${modo.toUpperCase()}).`,
      data: datos
    };
  }

  // ============================================================================
  // 6. CONSULTA EN COMPROBADOR DE DERECHOS (ADRES / BUDA / CONTRIBUTIVO)
  // ============================================================================

  async function consultarCodigoEnComprobador(codigo) {
    const iframe = obtenerIframeWorker();
    await navegarIframe(URLS.comprobador);
    const doc = iframe.contentDocument;

    const inputNoId = await esperarSelector(doc, '#MainContent_txtNoId', 10000);
    if (!inputNoId) {
      throw new Error('No se encontró el campo de documento #MainContent_txtNoId.');
    }

    inputNoId.value = '';
    inputNoId.focus();
    inputNoId.value = codigo;
    inputNoId.dispatchEvent(new Event('input', { bubbles: true }));
    inputNoId.dispatchEvent(new Event('change', { bubbles: true }));

    // Disparar consulta
    await ejecutarAccionYEsperar(iframe, () => {
      const btnConsultar = doc.querySelector('#MainContent_btnConsultar, #MainContent_cmdConsultar, input[type="submit"]');
      if (btnConsultar) {
        btnConsultar.click();
      } else {
        const enterEv = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        inputNoId.dispatchEvent(enterEv);
      }
    });

    // Revisar si fue redirigido a NoAutorizado.aspx
    if (doc.location.href.toLowerCase().includes('noautorizado.aspx')) {
      for (let reintento = 0; reintento < 3; reintento++) {
        const cmdInicio = doc.querySelector('#MainContent_cmdInicio');
        if (cmdInicio) {
          await ejecutarAccionYEsperar(iframe, () => cmdInicio.click());
          await esperarSelector(doc, '#MainContent_txtNoId', 6000);
          const reInput = doc.querySelector('#MainContent_txtNoId');
          if (reInput) {
            reInput.value = codigo;
            await ejecutarAccionYEsperar(iframe, () => {
              const b = doc.querySelector('#MainContent_btnConsultar, #MainContent_cmdConsultar, input[type="submit"]');
              if (b) b.click();
            });
          }
        }
        if (!doc.location.href.toLowerCase().includes('noautorizado.aspx')) {
          break;
        }
      }

      if (doc.location.href.toLowerCase().includes('noautorizado.aspx')) {
        return {
          encontrado: false,
          mensaje: 'Portal distrital reportó No Autorizado.',
          data: {}
        };
      }
    }

    // Detectar tabla Contributivo o BUDA
    const tabla = doc.querySelector('#MainContent_grdContributivo, #MainContent_grdBUDA, #MainContent_grdSubsidiado');
    if (!tabla) {
      return {
        encontrado: false,
        mensaje: 'No encontrado en Comprobador de Derechos.',
        data: {}
      };
    }

    const esContributivo = !!doc.querySelector('#MainContent_grdContributivo');
    const tablaOrigen = esContributivo ? 'Contributivo' : 'BUDA';

    // Parsear tabla HTML
    const headers = Array.from(tabla.querySelectorAll('th')).map(th => (th.textContent || '').trim());
    const filas = Array.from(tabla.querySelectorAll('tr'));
    const filaDatos = filas.find(r => r.querySelector('td'));

    const datosExtraidos = {};
    if (STATE.camposComprobador.tabla_origen) {
      datosExtraidos['ADRES_TABLA_ORIGEN'] = tablaOrigen;
    }

    if (filaDatos) {
      const celdas = Array.from(filaDatos.querySelectorAll('td')).map(td => (td.textContent || '').trim());
      headers.forEach((h, i) => {
        if (h && celdas[i] !== undefined) {
          const colKey = `ADRES_${h.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')}`;
          datosExtraidos[colKey] = celdas[i];
        }
      });
    }

    // Si se solicitó Sexo en Detalle
    if (STATE.camposComprobador.sexo_detalle) {
      try {
        const linkDetalle = tabla.querySelector('a[href*="Select$0"]');
        if (linkDetalle) {
          await ejecutarAccionYEsperar(iframe, () => linkDetalle.click());
          const lblSexo = doc.querySelector('#MainContent_lblSexo');
          if (lblSexo) {
            datosExtraidos['ADRES_SEXO'] = (lblSexo.textContent || lblSexo.innerText || '').trim();
          }
        }
      } catch (_e) {}
    }

    // Botón volver a nueva consulta
    try {
      const btnNueva = doc.querySelector('#MainContent_cmdNuevaConsulta, #MainContent_cmdNueConsulta, #MainContent_cmdInicio');
      if (btnNueva) {
        await ejecutarAccionYEsperar(iframe, () => btnNueva.click());
      }
    } catch (_e) {}

    return {
      encontrado: true,
      mensaje: `Verificado en ${tablaOrigen}.`,
      data: datosExtraidos
    };
  }

  // ============================================================================
  // 7. ORQUESTADOR DE CONSULTA MASIVA
  // ============================================================================

  async function iniciarProcesamiento() {
    if (STATE.registros.length === 0) {
      alert('Por favor carga un archivo CSV con columnas "consecutivo" y "codigo" antes de iniciar.');
      return;
    }

    if (STATE.ejecutando) return;

    STATE.ejecutando = true;
    STATE.detenerSolicitado = false;
    STATE.resultados = [];
    STATE.indiceActual = 0;
    STATE.stats = { total: STATE.registros.length, exitosos: 0, noEncontrados: 0, errores: 0 };
    STATE.startTime = Date.now();

    actualizarBotonesUI(true);
    iniciarCronometro();
    agregarLog(`Iniciando lote de ${STATE.registros.length} registros en modo "${STATE.portal}"...`, 'info');

    // Comprobar dominio y alertar si es necesario
    if (!ES_ORIGEN_OFICIAL) {
      agregarLog(`⚠️ Aviso: Estás ejecutando en "${window.location.hostname}". Para conectar con el portal real de Secretaría de Salud debes estar en appb.saludcapital.gov.co.`, 'warn');
    }

    for (let i = 0; i < STATE.registros.length; i++) {
      if (STATE.detenerSolicitado) {
        agregarLog(`Proceso detenido por el usuario en el registro ${i} de ${STATE.registros.length}.`, 'warn');
        break;
      }

      STATE.indiceActual = i + 1;
      const item = STATE.registros[i];
      actualizarProgresoUI();

      try {
        let res;

        if (STATE.portal === 'pai_menores') {
          res = await consultarCodigoEnPai(item.codigo, 'menores');
        } else if (STATE.portal === 'pai_mayores') {
          res = await consultarCodigoEnPai(item.codigo, 'mayores');
        } else if (STATE.portal === 'pai_auto') {
          // Primero prueba Menores
          res = await consultarCodigoEnPai(item.codigo, 'menores');
          if (!res.encontrado) {
            // Reintenta en Mayores
            res = await consultarCodigoEnPai(item.codigo, 'mayores');
          }
        } else if (STATE.portal === 'comprobador') {
          res = await consultarCodigoEnComprobador(item.codigo);
        }

        const registroResultado = {
          consecutivo: item.consecutivo,
          codigo: item.codigo,
          estado: res.encontrado ? 'ENCONTRADO' : 'NO ENCONTRADO',
          portal: STATE.portal.toUpperCase(),
          mensaje: res.mensaje,
          fechaHora: new Date().toLocaleString(),
          data: res.data || {}
        };

        STATE.resultados.push(registroResultado);

        if (res.encontrado) {
          STATE.stats.exitosos++;
          agregarLog(`[${i + 1}/${STATE.registros.length}] Registro procesado exitosamente: ${res.mensaje}`, 'success');
        } else {
          STATE.stats.noEncontrados++;
          agregarLog(`[${i + 1}/${STATE.registros.length}] ${res.mensaje}`, 'warn');
        }
      } catch (err) {
        if (err.message === 'SESION_REQUERIDA') {
          STATE.stats.errores++;
          agregarLog(`🚨 ERROR DE SESIÓN: El portal PAI requiere iniciar sesión. Por favor inicia sesión manualmente en la pestaña y pulsa Iniciar nuevamente.`, 'error');
          break;
        }

        STATE.stats.errores++;
        STATE.resultados.push({
          consecutivo: item.consecutivo,
          codigo: item.codigo,
          estado: 'ERROR',
          portal: STATE.portal.toUpperCase(),
          mensaje: err.message || 'Error desconocido en la consulta',
          fechaHora: new Date().toLocaleString(),
          data: {}
        });
        agregarLog(`[${i + 1}/${STATE.registros.length}] Error en consulta: ${err.message}`, 'error');
      }

      // Pausa configurable entre consultas para no sobrecargar el servidor institucional
      if (STATE.retardoMs > 0 && i < STATE.registros.length - 1) {
        await new Promise(r => setTimeout(r, STATE.retardoMs));
      }
    }

    finalizarProcesamiento();
  }

  function detenerProcesamiento() {
    if (!STATE.ejecutando) return;
    STATE.detenerSolicitado = true;
    agregarLog('Solicitud de detención recibida. Finalizando consulta en curso...', 'warn');
  }

  function finalizarProcesamiento() {
    STATE.ejecutando = false;
    detenerCronometro();
    actualizarBotonesUI(false);
    actualizarProgresoUI();

    const duracionSeg = Math.round((Date.now() - STATE.startTime) / 1000);
    agregarLog(`🏁 Lote finalizado en ${duracionSeg}s. Total: ${STATE.stats.total} | Exitosos: ${STATE.stats.exitosos} | No Encontrados: ${STATE.stats.noEncontrados} | Errores: ${STATE.stats.errores}`, 'info');

    // Habilitar botón de descarga
    const btnDescargar = document.getElementById('sisvan-btn-descargar');
    if (btnDescargar && STATE.resultados.length > 0) {
      btnDescargar.style.opacity = '1';
      btnDescargar.style.pointerEvents = 'auto';
    }
  }

  // ============================================================================
  // 8. CRONÓMETRO Y ESTADÍSTICAS EN TIEMPO REAL
  // ============================================================================

  function iniciarCronometro() {
    detenerCronometro();
    STATE.timerInterval = setInterval(() => {
      const transcurridoMs = Date.now() - STATE.startTime;
      const segTotales = Math.floor(transcurridoMs / 1000);
      const min = Math.floor(segTotales / 60);
      const seg = segTotales % 60;
      const tiempoStr = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;

      const elTimer = document.getElementById('sisvan-timer');
      if (elTimer) elTimer.textContent = tiempoStr;

      // Calcular velocidad (registros por minuto) y tiempo estimado restante
      if (STATE.indiceActual > 0 && segTotales > 2) {
        const regsPorMin = Math.round((STATE.indiceActual / segTotales) * 60);
        const restantes = STATE.registros.length - STATE.indiceActual;
        const segRestantes = Math.round(restantes / (STATE.indiceActual / segTotales));
        const minRest = Math.floor(segRestantes / 60);
        const segRest = segRestantes % 60;
        const estStr = `~${minRest}m ${segRest}s rest. (${regsPorMin} reg/min)`;

        const elVel = document.getElementById('sisvan-velocidad');
        if (elVel) elVel.textContent = estStr;
      }
    }, 500);
  }

  function detenerCronometro() {
    if (STATE.timerInterval) {
      clearInterval(STATE.timerInterval);
      STATE.timerInterval = null;
    }
  }

  // ============================================================================
  // 9. FUNCIÓN DE DIAGNÓSTICO DEL ENTORNO
  // ============================================================================

  async function ejecutarDiagnostico() {
    agregarLog('==================================================', 'info');
    agregarLog('INICIANDO DIAGNÓSTICO TÉCNICO DE CONECTIVIDAD...', 'info');
    agregarLog('==================================================', 'info');

    const diag = {
      timestamp: new Date().toISOString(),
      urlActual: window.location.href,
      hostname: window.location.hostname,
      esDominioOficial: ES_ORIGEN_OFICIAL,
      cookiesHabilitadas: navigator.cookieEnabled,
      userAgent: navigator.userAgent
    };

    agregarLog(`• Host actual: ${diag.hostname} (${diag.esDominioOficial ? 'CORRECTO: saludcapital.gov.co' : 'ADVERTENCIA: No es el portal de Salud Capital'})`, diag.esDominioOficial ? 'success' : 'warn');

    // Probar iframe
    try {
      const iframe = obtenerIframeWorker();
      diag.iframeCreado = !!iframe;
      agregarLog(`• Creación de iframe worker: OK`, 'success');
    } catch (e) {
      diag.iframeCreado = false;
      diag.iframeError = e.message;
      agregarLog(`• Creación de iframe worker: ERROR (${e.message})`, 'error');
    }

    // Probar alcance de rutas si estamos en el mismo origen
    if (ES_ORIGEN_OFICIAL) {
      // 1. Probar Comprobador
      try {
        const respComprobador = await fetch(URLS.comprobador, { method: 'HEAD', credentials: 'same-origin' });
        diag.comprobadorStatus = respComprobador.status;
        agregarLog(`• Ruta Comprobador (${URLS.comprobador}): HTTP ${respComprobador.status}`, respComprobador.ok ? 'success' : 'warn');
      } catch (e) {
        diag.comprobadorError = e.message;
        agregarLog(`• Ruta Comprobador: Error de red (${e.message})`, 'error');
      }

      // 2. Probar PAI Datos Básicos
      try {
        const respPai = await fetch(URLS.paiMenores, { method: 'HEAD', credentials: 'same-origin' });
        diag.paiStatus = respPai.status;
        agregarLog(`• Ruta PAI Menores (${URLS.paiMenores}): HTTP ${respPai.status}`, respPai.ok ? 'success' : 'warn');
      } catch (e) {
        diag.paiError = e.message;
        agregarLog(`• Ruta PAI: Error de red (${e.message})`, 'error');
      }
    } else {
      agregarLog(`• Aviso: Para diagnósticos de red completos, ejecuta este script en una pestaña con la URL https://${HOST_ESPERADO}`, 'warn');
    }

    agregarLog('DIAGNÓSTICO COMPLETADO CON ÉXITO.', 'success');
    return diag;
  }

  // Exponer la función en window para que el usuario pueda escribir diagnostico() en la consola
  window.diagnostico = ejecutarDiagnostico;
  window.SISVAN_PAI_CONSOLE = {
    version: '2.5.0',
    state: STATE,
    diagnostico: ejecutarDiagnostico,
    iniciar: iniciarProcesamiento,
    detener: detenerProcesamiento,
    exportarCSV: exportarResultadosCSV
  };

  // ============================================================================
  // 10. CONSTRUCCIÓN DE LA INTERFAZ FLOTANTE (PANEL FLOTANTE)
  // ============================================================================

  function crearPanelFlotante() {
    const root = document.createElement('div');
    root.id = 'sisvan-console-root';
    root.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 440px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 32px);
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      border-radius: 14px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: height 0.2s ease, width 0.2s ease;
    `;

    root.innerHTML = `
      <!-- ENCABEZADO DRAGGABLE -->
      <div id="sisvan-drag-header" style="
        background: linear-gradient(135deg, #1e293b, #0f172a);
        padding: 12px 14px;
        border-bottom: 1px solid #334155;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        user-select: none;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></div>
          <span style="font-weight: 700; font-size: 13px; letter-spacing: 0.3px;">SISVAN · Consulta Consola</span>
          <span style="font-size: 10px; background: #3b82f6; color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 600;">v2.5</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button id="sisvan-btn-min" title="Minimizar / Restaurar" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px;">_</button>
          <button id="sisvan-btn-cerrar" title="Cerrar panel" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px;">✕</button>
        </div>
      </div>

      <!-- CUERPO PRINCIPAL DEL PANEL -->
      <div id="sisvan-panel-body" style="padding: 12px 14px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px;">

        <!-- ALERTA DE DOMINIO SI NO ESTÁ EN SALUDCAPITAL -->
        ${!ES_ORIGEN_OFICIAL ? `
          <div style="background: #451a03; border: 1px solid #b45309; color: #fde68a; padding: 8px 10px; border-radius: 8px; font-size: 11px;">
            ⚠️ <b>Aviso de Dominio:</b> Estás en <i>${window.location.hostname}</i>. Para consultar los datos reales de la Secretaría de Salud de Bogotá, pega este script en <b>https://appb.saludcapital.gov.co</b>.
          </div>
        ` : `
          <div style="background: #064e3b; border: 1px solid #059669; color: #a7f3d0; padding: 6px 10px; border-radius: 8px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
            <span>🛡️ <b>Conectado al origen oficial:</b> appb.saludcapital.gov.co</span>
          </div>
        `}

        <!-- SELECCIÓN DE ARCHIVO CSV -->
        <div>
          <label style="font-weight: 600; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">1. Archivo CSV con Códigos</label>
          <div id="sisvan-dropzone" style="
            border: 2px dashed #475569;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            background: #1e293b;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <input type="file" id="sisvan-file-input" accept=".csv,.txt" style="display: none;" />
            <div id="sisvan-dropzone-text" style="font-size: 12px; color: #cbd5e1;">
              📄 <b style="color: #38bdf8;">Haz clic para seleccionar CSV</b> o arrástralo aquí
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              Columnas requeridas: <code>consecutivo</code> y <code>codigo</code> (sep: <b>;</b> o <b>,</b>)
            </div>
          </div>
          <div id="sisvan-csv-info" style="font-size: 11px; color: #10b981; margin-top: 4px; display: none; font-weight: 500;"></div>
        </div>

        <!-- SELECTOR DE PORTAL -->
        <div>
          <label style="font-weight: 600; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">2. Portal de Consulta</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 6px; background: #1e293b; padding: 7px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #334155; font-size: 12px;">
              <input type="radio" name="sisvan-portal" value="pai_menores" checked />
              <span>PAI Menores (pag=2)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; background: #1e293b; padding: 7px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #334155; font-size: 12px;">
              <input type="radio" name="sisvan-portal" value="pai_mayores" />
              <span>PAI Mayores (pag=3)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; background: #1e293b; padding: 7px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #334155; font-size: 12px;">
              <input type="radio" name="sisvan-portal" value="pai_auto" />
              <span>PAI Auto (2 → 3)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; background: #1e293b; padding: 7px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #334155; font-size: 12px;">
              <input type="radio" name="sisvan-portal" value="comprobador" />
              <span>Comprobador (ADRES)</span>
            </label>
          </div>
        </div>

        <!-- SELECTOR DE CAMPOS (COLLAPSIBLE) -->
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 10px;">
          <div id="sisvan-toggle-campos" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
            <span style="font-weight: 600; font-size: 11px; color: #94a3b8; text-transform: uppercase;">3. Campos a Extraer</span>
            <span id="sisvan-campos-indicator" style="font-size: 10px; color: #38bdf8;">Configurar ▾</span>
          </div>

          <div id="sisvan-campos-wrapper" style="display: none; margin-top: 8px; border-top: 1px solid #334155; padding-top: 8px; max-height: 140px; overflow-y: auto;">
            <!-- Contenido dinámico según portal -->
            <div id="sisvan-campos-checkboxes" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;"></div>
          </div>
        </div>

        <!-- VELOCIDAD / PAUSA ENTRE CONSULTAS -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: #1e293b; padding: 6px 10px; border-radius: 8px; border: 1px solid #334155;">
          <span style="font-size: 11px; color: #94a3b8;">Pausa entre consultas:</span>
          <select id="sisvan-select-retardo" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; padding: 2px 6px; font-size: 11px;">
            <option value="200">200 ms (Rápido)</option>
            <option value="500" selected>500 ms (Recomendado)</option>
            <option value="1000">1.0 s (Seguro)</option>
            <option value="2000">2.0 s (Lento)</option>
          </select>
        </div>

        <!-- BOTONES DE ACCIÓN PRINCIPALES -->
        <div style="display: grid; grid-template-columns: 1.2fr 1fr 0.8fr; gap: 6px;">
          <button id="sisvan-btn-iniciar" style="
            background: #10b981;
            color: #ffffff;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">
            ▶ Iniciar
          </button>

          <button id="sisvan-btn-detener" disabled style="
            background: #ef4444;
            color: #ffffff;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            opacity: 0.5;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">
            ⏹ Detener
          </button>

          <button id="sisvan-btn-diag" style="
            background: #475569;
            color: #ffffff;
            border: none;
            padding: 8px 10px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          " title="Ejecutar diagnóstico técnico">
            🔍 Diag
          </button>
        </div>

        <!-- BARRA DE PROGRESO Y CRONÓMETRO -->
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span id="sisvan-progreso-label" style="font-weight: 600; color: #cbd5e1;">Progreso: 0 / 0</span>
            <span id="sisvan-timer" style="font-family: monospace; font-weight: 700; color: #38bdf8;">00:00</span>
          </div>
          <div style="background: #0f172a; height: 8px; border-radius: 4px; overflow: hidden;">
            <div id="sisvan-progreso-bar" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.2s ease;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px;">
            <span id="sisvan-velocidad">Listo para iniciar</span>
            <span id="sisvan-porcentaje">0%</span>
          </div>
        </div>

        <!-- CONTADORES DE ESTADO -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center;">
          <div style="background: #1e293b; padding: 6px; border-radius: 6px; border: 1px solid #334155;">
            <div style="font-size: 10px; color: #94a3b8;">Total</div>
            <div id="sisvan-stat-total" style="font-size: 14px; font-weight: 700; color: #f8fafc;">0</div>
          </div>
          <div style="background: #1e293b; padding: 6px; border-radius: 6px; border: 1px solid #334155;">
            <div style="font-size: 10px; color: #10b981;">Éxito</div>
            <div id="sisvan-stat-exitos" style="font-size: 14px; font-weight: 700; color: #10b981;">0</div>
          </div>
          <div style="background: #1e293b; padding: 6px; border-radius: 6px; border: 1px solid #334155;">
            <div style="font-size: 10px; color: #f59e0b;">No Encontrado</div>
            <div id="sisvan-stat-noenc" style="font-size: 14px; font-weight: 700; color: #f59e0b;">0</div>
          </div>
          <div style="background: #1e293b; padding: 6px; border-radius: 6px; border: 1px solid #334155;">
            <div style="font-size: 10px; color: #ef4444;">Error</div>
            <div id="sisvan-stat-err" style="font-size: 14px; font-weight: 700; color: #ef4444;">0</div>
          </div>
        </div>

        <!-- REGISTRO DE ACTIVIDAD (LOG VISUAL) -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 11px; color: #94a3b8; text-transform: uppercase;">Registro de Actividad</span>
            <button id="sisvan-btn-limpiar-log" style="background: transparent; border: none; color: #64748b; font-size: 10px; cursor: pointer;">Limpiar</button>
          </div>
          <div id="sisvan-log-container" style="
            background: #090d16;
            border: 1px solid #1e293b;
            border-radius: 6px;
            padding: 6px 8px;
            height: 90px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 10.5px;
            display: flex;
            flex-direction: column;
            gap: 2px;
          ">
            <div style="color: #64748b;">[${new Date().toLocaleTimeString()}] Panel SISVAN cargado. Selecciona un archivo CSV para empezar.</div>
          </div>
        </div>

        <!-- BOTÓN DESCARGAR RESULTADOS -->
        <button id="sisvan-btn-descargar" style="
          background: #3b82f6;
          color: #ffffff;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          opacity: 0.5;
          pointer-events: none;
        ">
          📥 Descargar CSV de Resultados
        </button>

        <!-- CONTENEDOR COLLAPSIBLE DE IFRAME EN VIVO (OPCIONAL) -->
        <div>
          <button id="sisvan-toggle-live-iframe" style="background: transparent; border: none; color: #64748b; font-size: 10px; cursor: pointer; text-decoration: underline; width: 100%; text-align: right;">
            👁️ Ver portal en vivo (inspección)
          </button>
          <div id="sisvan-iframe-container" style="display: none; margin-top: 6px;"></div>
        </div>

      </div>
    `;

    document.body.appendChild(root);
    enlazarEventosPanel(root);
    renderizarCheckboxesCampos();
  }

  // ============================================================================
  // 11. GESTIÓN DE EVENTOS DE LA INTERFAZ
  // ============================================================================

  function agregarLog(mensaje, tipo = 'info') {
    const container = document.getElementById('sisvan-log-container');
    if (!container) return;

    const linea = document.createElement('div');
    const hora = new Date().toLocaleTimeString();

    let color = '#94a3b8';
    if (tipo === 'success') color = '#34d399';
    else if (tipo === 'warn') color = '#fbbf24';
    else if (tipo === 'error') color = '#f87171';

    linea.style.color = color;
    linea.textContent = `[${hora}] ${mensaje}`;
    container.appendChild(linea);
    container.scrollTop = container.scrollHeight;

    // Solo loguear métricas no sensibles en console.log (nunca documentos ni nombres)
    if (mensaje.includes('Registro') || mensaje.includes('Lote') || mensaje.includes('DIAGNÓSTICO')) {
      console.log(`%c[SISVAN] ${mensaje}`, `color: ${color}`);
    }
  }

  function renderizarCheckboxesCampos() {
    const container = document.getElementById('sisvan-campos-checkboxes');
    if (!container) return;
    container.innerHTML = '';

    if (STATE.portal === 'comprobador') {
      CAMPOS_COMPROBADOR_DEFAULT.forEach(c => {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display: flex; align-items: center; gap: 4px; cursor: pointer; color: #cbd5e1;';
        lbl.innerHTML = `
          <input type="checkbox" data-campo="${c.id}" ${STATE.camposComprobador[c.id] ? 'checked' : ''} />
          <span>${c.label}</span>
        `;
        lbl.querySelector('input').addEventListener('change', (e) => {
          STATE.camposComprobador[c.id] = e.target.checked;
        });
        container.appendChild(lbl);
      });
    } else {
      CAMPOS_PAI_CATALOGO.forEach(c => {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display: flex; align-items: center; gap: 4px; cursor: pointer; color: #cbd5e1;';
        const isChecked = c.fijo || STATE.camposSeleccionadosPai.includes(c.id);
        lbl.innerHTML = `
          <input type="checkbox" data-campo="${c.id}" ${isChecked ? 'checked' : ''} ${c.fijo ? 'disabled' : ''} />
          <span>${c.label}</span>
        `;
        if (!c.fijo) {
          lbl.querySelector('input').addEventListener('change', (e) => {
            if (e.target.checked) {
              if (!STATE.camposSeleccionadosPai.includes(c.id)) STATE.camposSeleccionadosPai.push(c.id);
            } else {
              STATE.camposSeleccionadosPai = STATE.camposSeleccionadosPai.filter(id => id !== c.id);
            }
          });
        }
        container.appendChild(lbl);
      });
    }
  }

  function enlazarEventosPanel(root) {
    // 1. Arrastrar panel
    const header = document.getElementById('sisvan-drag-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = root.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      root.style.left = `${Math.max(10, Math.min(window.innerWidth - 450, startLeft + deltaX))}px`;
      root.style.top = `${Math.max(10, Math.min(window.innerHeight - 100, startTop + deltaY))}px`;
      root.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // 2. Minimizar / Cerrar
    let minimizado = false;
    document.getElementById('sisvan-btn-min').addEventListener('click', () => {
      minimizado = !minimizado;
      const body = document.getElementById('sisvan-panel-body');
      body.style.display = minimizado ? 'none' : 'flex';
      root.style.width = minimizado ? '280px' : '440px';
    });

    document.getElementById('sisvan-btn-cerrar').addEventListener('click', () => {
      if (confirm('¿Deseas cerrar el panel SISVAN de la consola?')) {
        detenerProcesamiento();
        root.remove();
      }
    });

    // 3. Dropzone & File Input
    const dropzone = document.getElementById('sisvan-dropzone');
    const fileInput = document.getElementById('sisvan-file-input');
    const csvInfo = document.getElementById('sisvan-csv-info');

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
      dropzone.style.background = '#0f172a';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#475569';
      dropzone.style.background = '#1e293b';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#475569';
      dropzone.style.background = '#1e293b';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        cargarArchivoCSV(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        cargarArchivoCSV(e.target.files[0]);
      }
    });

    function cargarArchivoCSV(file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const registros = parsearCSV(evt.target.result);
          if (registros.length === 0) {
            alert('No se encontraron registros válidos en el CSV. Asegúrate de incluir columnas "consecutivo" y "codigo".');
            return;
          }
          STATE.registros = registros;
          STATE.stats.total = registros.length;
          document.getElementById('sisvan-stat-total').textContent = registros.length;
          document.getElementById('sisvan-progreso-label').textContent = `Progreso: 0 / ${registros.length}`;
          csvInfo.style.display = 'block';
          csvInfo.textContent = `✓ ${registros.length} registros cargados desde "${file.name}".`;
          agregarLog(`Archivo cargado: "${file.name}" con ${registros.length} registros listos.`, 'success');
        } catch (err) {
          alert('Error al leer el archivo CSV: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    // 4. Selector de Portal
    root.querySelectorAll('input[name="sisvan-portal"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        STATE.portal = e.target.value;
        agregarLog(`Portal cambiado a: ${STATE.portal.toUpperCase()}`, 'info');
        renderizarCheckboxesCampos();
      });
    });

    // 5. Acordeón de Campos
    const toggleCampos = document.getElementById('sisvan-toggle-campos');
    const wrapperCampos = document.getElementById('sisvan-campos-wrapper');
    const indCampos = document.getElementById('sisvan-campos-indicator');
    let camposAbierto = false;
    toggleCampos.addEventListener('click', () => {
      camposAbierto = !camposAbierto;
      wrapperCampos.style.display = camposAbierto ? 'block' : 'none';
      indCampos.textContent = camposAbierto ? 'Ocultar ▴' : 'Configurar ▾';
    });

    // 6. Retardo
    document.getElementById('sisvan-select-retardo').addEventListener('change', (e) => {
      STATE.retardoMs = parseInt(e.target.value, 10) || 500;
    });

    // 7. Botones de acción
    document.getElementById('sisvan-btn-iniciar').addEventListener('click', iniciarProcesamiento);
    document.getElementById('sisvan-btn-detener').addEventListener('click', detenerProcesamiento);
    document.getElementById('sisvan-btn-diag').addEventListener('click', ejecutarDiagnostico);
    document.getElementById('sisvan-btn-descargar').addEventListener('click', exportarResultadosCSV);
    document.getElementById('sisvan-btn-limpiar-log').addEventListener('click', () => {
      const container = document.getElementById('sisvan-log-container');
      if (container) container.innerHTML = '';
    });

    // 8. Toggle iframe en vivo
    let iframeVisible = false;
    document.getElementById('sisvan-toggle-live-iframe').addEventListener('click', () => {
      iframeVisible = !iframeVisible;
      const cont = document.getElementById('sisvan-iframe-container');
      cont.style.display = iframeVisible ? 'block' : 'none';
      if (iframeVisible) {
        obtenerIframeWorker();
      }
    });
  }

  function actualizarBotonesUI(enEjecucion) {
    const btnIniciar = document.getElementById('sisvan-btn-iniciar');
    const btnDetener = document.getElementById('sisvan-btn-detener');
    if (btnIniciar) {
      btnIniciar.disabled = enEjecucion;
      btnIniciar.style.opacity = enEjecucion ? '0.5' : '1';
    }
    if (btnDetener) {
      btnDetener.disabled = !enEjecucion;
      btnDetener.style.opacity = enEjecucion ? '1' : '0.5';
    }
  }

  function actualizarProgresoUI() {
    const total = STATE.registros.length;
    const actual = STATE.indiceActual;
    const pct = total > 0 ? Math.round((actual / total) * 100) : 0;

    const bar = document.getElementById('sisvan-progreso-bar');
    if (bar) bar.style.width = `${pct}%`;

    const lbl = document.getElementById('sisvan-progreso-label');
    if (lbl) lbl.textContent = `Progreso: ${actual} / ${total}`;

    const lblPct = document.getElementById('sisvan-porcentaje');
    if (lblPct) lblPct.textContent = `${pct}%`;

    const sEx = document.getElementById('sisvan-stat-exitos');
    if (sEx) sEx.textContent = STATE.stats.exitosos;

    const sNo = document.getElementById('sisvan-stat-noenc');
    if (sNo) sNo.textContent = STATE.stats.noEncontrados;

    const sErr = document.getElementById('sisvan-stat-err');
    if (sErr) sErr.textContent = STATE.stats.errores;
  }

  // ============================================================================
  // 12. INICIALIZACIÓN
  // ============================================================================
  crearPanelFlotante();
  console.log('%c[SISVAN] Panel de consola inyectado exitosamente.', 'color: #10b981; font-weight: bold; font-size: 13px;');
  console.log('%cPara ejecutar el diagnóstico escribe: diagnostico()', 'color: #38bdf8;');
})();
