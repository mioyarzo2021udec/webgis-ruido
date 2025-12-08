// ---------------------------------------------------
// MAPAS BASE
// ---------------------------------------------------
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
});

var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: "© CartoDB"
});

var voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: "© CartoDB Voyager"
});

var sat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: "© Esri World Imagery" }
);

// Inicializar mapa
var map = L.map('map', {
    center: [-37.469, -72.353],
    zoom: 13,
    layers: [osm]
});

// ---------------------------------------------------
// ALTURA DEL HEADER
// ---------------------------------------------------
function updatePanelTop() {
    const header = document.querySelector('.top-bar');
    if (!header) return;
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
}
updatePanelTop();
window.addEventListener('resize', updatePanelTop);

// ---------------------------------------------------
// MODO MÓVIL
// ---------------------------------------------------
var isMobile = /Mobi|Android/i.test(navigator.userAgent);
if (isMobile) map.dragging.disable();

// ---------------------------------------------------
// DEGRADADO
// ---------------------------------------------------
function interpolateColor(value, min, max) {
    value = Math.max(min, Math.min(max, value));
    const ratio = (value - min) / (max - min);

    const r = Math.round(255 + (204 - 255) * ratio);
    const g = Math.round(255 + (16 - 255) * ratio);
    const b = Math.round(255 + (16 - 255) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------------
let registrosGeoJSON = null;
let capaRegistros = null;
let currentMode = "avg";

// ==========================================================
// HEXBIN — Leaflet-D3
// ==========================================================
let capaHexbin = null;

// Crear capa hexbin
function crearHexbin(dataFiltrada) {

    // Remover si ya existe
    if (capaHexbin) {
        map.removeLayer(capaHexbin);
        capaHexbin = null;
    }

    // Solo generar si está activado
    if (!document.getElementById("hexbinToggle").checked) return;

    // Formato adecuado para hexbin
    const puntos = dataFiltrada.map(f => {
        const c = f.geometry.coordinates;
        return {
            lat: c[1],
            lng: c[0],
            avg: +f.properties.avg_db,
            mol: +f.properties.nivel_molestia
        };
    });

    capaHexbin = L.hexbinLayer({
        radius: 22,
        opacity: 0.85,
        duration: 170
    });

    // Color dinámico según modo
    capaHexbin.colorScaleExtent([1, undefined]);
    capaHexbin.colorRange(["#fee8c8", "#e34a33"]);

    capaHexbin.colorValue(d => {
        return currentMode === "avg" ? d.avg : d.mol;
    });

    capaHexbin.radiusValue(d => 1); 

    capaHexbin.data(puntos);
    capaHexbin.addTo(map);
}

// Mostrar hexbin
function mostrarHexbin() {
    const filtrados = obtenerFiltradosActuales();
    crearHexbin(filtrados);
}

// Ocultar hexbin
function ocultarHexbin() {
    if (capaHexbin) map.removeLayer(capaHexbin);
    capaHexbin = null;
}

// Obtener registros filtrados
function obtenerFiltradosActuales() {
    return registrosGeoJSON.features.filter(f => pasaFiltros(f.properties));
}

// Toggle hexbin
document.getElementById("hexbinToggle").addEventListener("change", () => {
    if (document.getElementById("hexbinToggle").checked) mostrarHexbin();
    else ocultarHexbin();
});


// ---------------------------------------------------
let selectedUUID = null;
let selectedLayer = null;

// OBJETO FILTROS
let filtros = {
    horaInicio: null,
    horaFin: null,
    fechaInicio: null,
    fechaFin: null,
    molestiaMin: null,
    molestiaMax: null,
    dbMin: null,
    dbMax: null,
    fuentes: []
};

// ---------------------------------------------------
// PANEL INFO
// ---------------------------------------------------
function showInfoPanel(p) {
    const fecha = p.fecha_hora ? p.fecha_hora.split("T")[0] : "";
    const hora = p.fecha_hora ? p.fecha_hora.split("T")[1].split(".")[0] : "";

    document.getElementById("info-content").innerHTML = `
        <b>Título:</b> ${p.titulo || "(sin título)"}<br><br>
        <b>Descripción del evento:</b><br>${p.descripcion || "(sin descripción)"}<br><br>
        <b>Fecha del registro:</b> ${fecha}<br>
        <b>Hora del registro:</b> ${hora}<br><br>

        <b>Fuente(s):</b>
        <ul>
            ${(p.fuente_ruido || "")
                .replace(/m_sica/g, "música")
                .replace(/tr_nsito_vehicular/g, "tránsito vehicular")
                .replace(/construcci_n/g, "construcción")
                .split(" ")
                .filter(f => f)
                .map(f => `<li>${f}</li>`).join("")}
        </ul>

        <b>AVG dB:</b> ${p.avg_db}<br>
        <b>Molestia (0–10):</b> ${p.nivel_molestia}
    `;
    document.getElementById("info-panel").classList.add("open");
}

// ---------------------------------------------------
function restoreOriginalStyle(l) {
    if (!l || !l.defaultOptions) return;
    l.setStyle(l.defaultOptions);
}

// ---------------------------------------------------
function highlightSelected(uuid) {
    if (!capaRegistros) return;

    capaRegistros.eachLayer(l => {
        if (l.feature.properties._uuid === uuid) {
            if (!l.defaultOptions) l.defaultOptions = { ...l.options };
            l.setStyle({
                radius: 10,
                color: "#ad8c00",
                weight: 3,
                fillColor: "#ffe040",
                fillOpacity: 1
            });
            selectedLayer = l;
        }
    });
}

// ---------------------------------------------------
function resetHighlight() {
    if (selectedLayer) restoreOriginalStyle(selectedLayer);
    selectedLayer = null;
    selectedUUID = null;
}

// ---------------------------------------------------
function dibujarRegistros(modoColor) {
    if (!registrosGeoJSON) return;

    if (capaRegistros) map.removeLayer(capaRegistros);

    capaRegistros = L.geoJSON(registrosGeoJSON, {
        pointToLayer: (feature, latlng) => {
            const p = feature.properties;
            const color = modoColor === "avg"
                ? interpolateColor(+p.avg_db, 20, 120)
                : interpolateColor(+p.nivel_molestia, 0, 10);

            const m = L.circleMarker(latlng, {
                radius: 7,
                color: "#333",
                weight: 1.4,
                fillColor: color,
                fillOpacity: 1
            });

            m.defaultOptions = { ...m.options };
            return m;
        },

        onEachFeature: (feature, layer) => {
            layer.on("click", () => {
                resetHighlight();
                selectedUUID = feature.properties._uuid;
                showInfoPanel(feature.properties);
                highlightSelected(selectedUUID);
            });
        }
    }).addTo(map);
}

// ---------------------------------------------------
document.getElementById("info-close").addEventListener("click", () => {
    resetHighlight();
    document.getElementById("info-panel").classList.remove("open");
});

// ---------------------------------------------------
// CARGAR GEOJSON
// ---------------------------------------------------
fetch("data/registros.geojson")
    .then(r => r.json())
    .then(data => {
        registrosGeoJSON = Array.isArray(data)
            ? { type: "FeatureCollection", features: data.flatMap(fc => fc.features) }
            : data;

        dibujarRegistros(currentMode);
        actualizarLeyenda(currentMode);
        actualizarResumen(registrosGeoJSON.features);

        if (document.getElementById("hexbinToggle").checked) {
            crearHexbin(registrosGeoJSON.features);
        }
    });



// ---------------------------------------------------
// SELECTORES
// ---------------------------------------------------
document.getElementById("colorMode").addEventListener("change", () => {
    currentMode = document.getElementById("colorMode").value;

    dibujarRegistros(currentMode);
    actualizarLeyenda(currentMode);

    if (selectedUUID) highlightSelected(selectedUUID);

    // Actualizar hexbin con nuevo modo
    if (document.getElementById("hexbinToggle").checked) {
        crearHexbin(obtenerFiltradosActuales());
    }
});

document.getElementById("basemapSelect").addEventListener("change", () => {
    const v = document.getElementById("basemapSelect").value;
    [osm, carto, voyager, sat].forEach(l => map.removeLayer(l));
    ({ osm, carto, voyager, sat })[v].addTo(map);

    if (capaRegistros) capaRegistros.addTo(map);
    if (selectedUUID) highlightSelected(selectedUUID);

    if (document.getElementById("hexbinToggle").checked) {
        crearHexbin(obtenerFiltradosActuales());
    }
});

// ---------------------------------------------------
// LEYENDA
// ---------------------------------------------------
function generarLeyendaHTML(modo) {
    let html = '<div class="legend">';

    if (modo === "avg") {
        html += "<h4>Niveles de ruido (dB)</h4>";

        const rangos = [
            { l: "Muy bajo (<35 dB)", v: 30, e: "Biblioteca, dormitorio silencioso" },
            { l: "Bajo (35–50 dB)", v: 40, e: "Conversación tranquila" },
            { l: "Moderado (50–65 dB)", v: 57, e: "Calle tranquila" },
            { l: "Alto (65–80 dB)", v: 72, e: "Tráfico pesado" },
            { l: "Muy alto (80–100 dB)", v: 90, e: "Discoteca" },
            { l: "Extremo (>100 dB)", v: 110, e: "Sirenas, maquinaria" }
        ];

        rangos.forEach(r => {
            const c = interpolateColor(r.v, 20, 120);
            html += `
                <div class="legend-row">
                    <span class="legend-color" style="background:${c}"></span>${r.l}
                </div>
                <div class="legend-example"><em>${r.e}</em></div>
            `;
        });

        html += `<small class="legend-footnote">Ejemplos orientativos basados en la OMS.</small>`;
    } else {
        html += "<h4>Molestia percibida</h4>";

        const rangos = [
            { l: "Muy baja (0–2)", v: 1 },
            { l: "Baja (3–4)", v: 3.5 },
            { l: "Moderada (5–6)", v: 5.5 },
            { l: "Alta (7–8)", v: 7.5 },
            { l: "Muy alta (9–10)", v: 9.5 }
        ];

        rangos.forEach(r => {
            const c = interpolateColor(r.v, 0, 10);
            html += `
                <div class="legend-row">
                    <span class="legend-color" style="background:${c}"></span>${r.l}
                </div>
            `;
        });

        html += `<small class="legend-footnote">Escala subjetiva reportada por usuarios.</small>`;
    }

    html += "</div>";
    return html;
}

function actualizarLeyenda(modo) {
    document.getElementById("legend-content").innerHTML = generarLeyendaHTML(modo);
}

// ---------------------------------------------------
// FORMULARIO KOBO
// ---------------------------------------------------
document.getElementById("open-form-btn").addEventListener("click", () => {
    document.getElementById("form-panel").classList.add("open");
    document.getElementById("kobo-frame").src = "https://ee.kobotoolbox.org/x/arEl9iyW";
});

document.getElementById("close-form-btn").addEventListener("click", () => {
    document.getElementById("form-panel").classList.remove("open");
});

// ---------------------------------------------------
// LÓGICA DE FILTROS
// ---------------------------------------------------
function pasaFiltros(p) {

    // Hora
    if (filtros.horaInicio || filtros.horaFin) {
        const hora = p.fecha_hora ? p.fecha_hora.split("T")[1].substring(0, 5) : null;
        if (filtros.horaInicio && hora && hora < filtros.horaInicio) return false;
        if (filtros.horaFin && hora && hora > filtros.horaFin) return false;
    }

    // Fecha
    if (filtros.fechaInicio || filtros.fechaFin) {
        const fecha = p.fecha_hora ? p.fecha_hora.split("T")[0] : null;
        if (filtros.fechaInicio && fecha && fecha < filtros.fechaInicio) return false;
        if (filtros.fechaFin && fecha && fecha > filtros.fechaFin) return false;
    }

    // Molestia
    if (filtros.molestiaMin !== null && +p.nivel_molestia < filtros.molestiaMin) return false;
    if (filtros.molestiaMax !== null && +p.nivel_molestia > filtros.molestiaMax) return false;

    // dB
    if (filtros.dbMin !== null && +p.avg_db < filtros.dbMin) return false;
    if (filtros.dbMax !== null && +p.avg_db > filtros.dbMax) return false;

    // Fuentes
    if (filtros.fuentes && filtros.fuentes.length > 0) {
        const fuentesReg = (p.fuente_ruido || "").split(" ").filter(Boolean);
        const coincide = fuentesReg.some(f => filtros.fuentes.includes(f));
        if (!coincide) return false;
    }

    return true;
}

// ---------------------------------------------------
// RESUMEN DE FILTRADOS
// ---------------------------------------------------
function actualizarResumen(filtrados) {
    const ul = document.getElementById("summary-list");
    ul.innerHTML = "";

    if (!filtrados || filtrados.length === 0) {
        ul.innerHTML = "<li>No se encontraron registros para los filtros aplicados.</li>";
        return;
    }

    ul.innerHTML += `<li><b>Registros encontrados:</b> ${filtrados.length}</li>`;

    let minFecha = null, maxFecha = null;
    let minHora = null, maxHora = null;
    let minMol = null, maxMol = null;
    let minDb = null, maxDb = null;
    const fuentesSet = new Set();

    filtrados.forEach(f => {
        const p = f.properties;

        if (p.fecha_hora) {
            const [fechaRaw, horaRawFull] = p.fecha_hora.split("T");
            const fecha = fechaRaw || null;
            const hora = horaRawFull ? horaRawFull.substring(0, 5) : null;

            if (fecha) {
                if (!minFecha || fecha < minFecha) minFecha = fecha;
                if (!maxFecha || fecha > maxFecha) maxFecha = fecha;
            }
            if (hora) {
                if (!minHora || hora < minHora) minHora = hora;
                if (!maxHora || hora > maxHora) maxHora = hora;
            }
        }

        const mol = Number(p.nivel_molestia);
        if (!Number.isNaN(mol)) {
            if (minMol === null || mol < minMol) minMol = mol;
            if (maxMol === null || mol > maxMol) maxMol = mol;
        }

        const db = Number(p.avg_db);
        if (!Number.isNaN(db)) {
            if (minDb === null || db < minDb) minDb = db;
            if (maxDb === null || db > maxDb) maxDb = db;
        }

        const fuentesRegistro = (p.fuente_ruido || "").split(" ").filter(Boolean);
        fuentesRegistro.forEach(ft => fuentesSet.add(ft));
    });

    if (filtros.fechaInicio || filtros.fechaFin) {
        ul.innerHTML += `<li><b>Periodo filtrado:</b> ${filtros.fechaInicio || "—"} a ${filtros.fechaFin || "—"}</li>`;
    }

    if (minFecha && maxFecha) {
        ul.innerHTML += `<li><b>Periodo observado:</b> ${minFecha} a ${maxFecha}</li>`;
    }

    if (filtros.horaInicio || filtros.horaFin) {
        ul.innerHTML += `<li><b>Franja horaria filtrada:</b> ${filtros.horaInicio || "—"} a ${filtros.horaFin || "—"}</li>`;
    }

    if (minHora && maxHora) {
        ul.innerHTML += `<li><b>Franja horaria observada:</b> ${minHora} a ${maxHora}</li>`;
    }

    if (filtros.molestiaMin !== null || filtros.molestiaMax !== null) {
        ul.innerHTML += `<li><b>Molestia filtrada:</b> ${filtros.molestiaMin ?? "—"} a ${filtros.molestiaMax ?? "—"}</li>`;
    }

    if (minMol !== null && maxMol !== null) {
        ul.innerHTML += `<li><b>Molestia observada:</b> ${minMol} a ${maxMol}</li>`;
    }

    if (filtros.dbMin !== null || filtros.dbMax !== null) {
        ul.innerHTML += `<li><b>Nivel de ruido filtrado (dB):</b> ${filtros.dbMin ?? "—"} a ${filtros.dbMax ?? "—"}</li>`;
    }

    if (minDb !== null && maxDb !== null) {
        ul.innerHTML += `<li><b>Nivel de ruido observado (dB):</b> ${minDb.toFixed(1)} a ${maxDb.toFixed(1)}</li>`;
    }

    if (fuentesSet.size > 0) {
        const etiquetasFuentes = {
            "tr_nsito_vehicular": "Tránsito vehicular",
            "m_sica": "Música",
            "industria": "Industria",
            "construcci_n": "Construcción",
            "personas": "Personas",
            "otro": "Otro"
        };

        const listaFuentes = Array.from(fuentesSet)
            .map(cod => etiquetasFuentes[cod] || cod)
            .join(", ");

        ul.innerHTML += `<li><b>Fuentes observadas en los resultados:</b> ${listaFuentes}</li>`;
    }
}

// ---------------------------------------------------
// APLICAR FILTROS
// ---------------------------------------------------
document.getElementById("aplicarFiltrosBtn").addEventListener("click", () => {

    filtros.horaInicio = document.getElementById("horaInicio").value || null;
    filtros.horaFin    = document.getElementById("horaFin").value || null;

    filtros.fechaInicio = document.getElementById("fechaInicio").value || null;
    filtros.fechaFin    = document.getElementById("fechaFin").value || null;

    filtros.molestiaMin = document.getElementById("molestiaMin").value
        ? +document.getElementById("molestiaMin").value
        : null;
    filtros.molestiaMax = document.getElementById("molestiaMax").value
        ? +document.getElementById("molestiaMax").value
        : null;

    filtros.dbMin = document.getElementById("dbMin").value
        ? +document.getElementById("dbMin").value
        : null;
    filtros.dbMax = document.getElementById("dbMax").value
        ? +document.getElementById("dbMax").value
        : null;

    const checks = document.querySelectorAll('input[name="fuenteFiltro"]:checked');
    filtros.fuentes = Array.from(checks).map(c => c.value);

    const filtrados = registrosGeoJSON.features.filter(f => pasaFiltros(f.properties));

    capaRegistros.clearLayers();
    capaRegistros.addData(filtrados);

    if (document.getElementById("hexbinToggle").checked) {
        crearHexbin(filtrados);
    }

    resetHighlight();
    actualizarResumen(filtrados);
});

// ---------------------------------------------------
// LIMPIAR FILTROS
// ---------------------------------------------------
document.getElementById("limpiarFiltrosBtn").addEventListener("click", () => {

    filtros = {
        horaInicio: null,
        horaFin: null,
        fechaInicio: null,
        fechaFin: null,
        molestiaMin: null,
        molestiaMax: null,
        dbMin: null,
        dbMax: null,
        fuentes: []
    };

    document.querySelectorAll("#filters-panel input").forEach(i => {
        if (i.type === "checkbox") i.checked = false;
        else i.value = "";
    });

    dibujarRegistros(currentMode);
    actualizarResumen(registrosGeoJSON.features);

    if (document.getElementById("hexbinToggle").checked) {
        crearHexbin(registrosGeoJSON.features);
    }
});
