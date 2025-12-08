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
// DEGRADADO CONTINUO
// ---------------------------------------------------
function interpolateColor(value, min, max) {
    value = Math.max(min, Math.min(max, value));
    const ratio = (value - min) / (max - min);

    const r = Math.round(255 + (204 - 255) * ratio);
    const g = Math.round(255 + (16 - 255) * ratio);
    const b = Math.round(255 + (16 - 255) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
}

// VARIABLES GLOBALES
let registrosGeoJSON = null;
let capaRegistros = null;
let capaHexbin = null;
let currentMode = "avg"; // avg o molestia

let selectedUUID = null;
let selectedLayer = null;

// ==========================================================
// HEXBIN — Leaflet-D3
// ==========================================================
function crearHexbin(dataFiltrada) {

    // Si ya existe, eliminarla
    if (capaHexbin) {
        map.removeLayer(capaHexbin);
        capaHexbin = null;
    }

    // Si no está activado el checkbox, no dibujar nada
    if (!document.getElementById("hexbinToggle").checked) return;

    // Convertir registros a puntos
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
        radius: 20,
        opacity: 0.85,
        duration: 200
    });

    // === OBLIGATORIO ===
    capaHexbin.latLngAccessor(d => L.latLng(d.lat, d.lng));

    // Rango de color
    if (currentMode === "avg") {
        capaHexbin.colorScaleExtent([20, 120]);
    } else {
        capaHexbin.colorScaleExtent([0, 10]);
    }

    capaHexbin.colorRange(["#fee8c8", "#e34a33"]);

    capaHexbin.colorValue(d => {
        return currentMode === "avg" ? d.avg : d.mol;
    });

    capaHexbin.radiusValue(() => 1);

    capaHexbin.data(puntos);

    capaHexbin.addTo(map);
}

function obtenerFiltradosActuales() {
    return registrosGeoJSON.features.filter(f => pasaFiltros(f.properties));
}

function actualizarHexbin() {
    if (document.getElementById("hexbinToggle").checked) {
        crearHexbin(obtenerFiltradosActuales());
    }
}

document.getElementById("hexbinToggle").addEventListener("change", actualizarHexbin);

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

function restoreOriginalStyle(l) {
    if (!l || !l.defaultOptions) return;
    l.setStyle(l.defaultOptions);
}

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

function resetHighlight() {
    if (selectedLayer) restoreOriginalStyle(selectedLayer);
    selectedLayer = null;
    selectedUUID = null;
}

document.getElementById("info-close").addEventListener("click", () => {
    resetHighlight();
    document.getElementById("info-panel").classList.remove("open");
});

// ---------------------------------------------------
// DIBUJAR REGISTROS
// ---------------------------------------------------
function dibujarRegistros(modo) {
    if (!registrosGeoJSON) return;

    if (capaRegistros) map.removeLayer(capaRegistros);

    capaRegistros = L.geoJSON(registrosGeoJSON, {
        pointToLayer: (feature, latlng) => {
            const p = feature.properties;

            const color = (modo === "avg")
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
    });

// ---------------------------------------------------
// SELECTORES
// ---------------------------------------------------
document.getElementById("colorMode").addEventListener("change", () => {
    currentMode = document.getElementById("colorMode").value;
    dibujarRegistros(currentMode);
    actualizarLeyenda(currentMode);

    actualizarHexbin();
});

document.getElementById("basemapSelect").addEventListener("change", () => {
    const v = document.getElementById("basemapSelect").value;

    [osm, carto, voyager, sat].forEach(l => map.removeLayer(l));
    ({ osm, carto, voyager, sat })[v].addTo(map);

    if (capaRegistros) capaRegistros.addTo(map);

    actualizarHexbin();
});

// ---------------------------------------------------
// LEYENDA (igual que antes, no la cambio)
// ---------------------------------------------------
function generarLeyendaHTML(modo) {
    let html = '<div class="legend">';

    if (modo === "avg") {
        html += "<h4>Niveles de ruido (dB)</h4>";

        const rangos = [
            { l: "Muy bajo (<35 dB)", v: 30 },
            { l: "Bajo (35–50 dB)", v: 40 },
            { l: "Moderado (50–65 dB)", v: 57 },
            { l: "Alto (65–80 dB)", v: 72 },
            { l: "Muy alto (80–100 dB)", v: 90 },
            { l: "Extremo (>100 dB)", v: 110 }
        ];

        rangos.forEach(r => {
            const c = interpolateColor(r.v, 20, 120);

            html += `
                <div class="legend-row">
                    <span class="legend-color" style="background:${c}"></span>${r.l}
                </div>`;
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
                </div>`;
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
// FILTROS
// ---------------------------------------------------
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
    if (filtros.fuentes.length > 0) {
        const fuentesReg = (p.fuente_ruido || "").split(" ").filter(Boolean);
        const coincide = fuentesReg.some(f => filtros.fuentes.includes(f));
        if (!coincide) return false;
    }

    return true;
}

// ---------------------------------------------------
// ACTUALIZAR RESUMEN
// ---------------------------------------------------
function actualizarResumen(filtrados) {
    const ul = document.getElementById("summary-list");
    ul.innerHTML = "";

    if (filtrados.length === 0) {
        ul.innerHTML = "<li>No se encontraron registros para los filtros aplicados.</li>";
        return;
    }

    ul.innerHTML += `<li><b>Registros encontrados:</b> ${filtrados.length}</li>`;
}

// ---------------------------------------------------
// APLICAR FILTROS
// ---------------------------------------------------
document.getElementById("aplicarFiltrosBtn").addEventListener("click", () => {

    filtros.horaInicio = document.getElementById("horaInicio").value || null;
    filtros.horaFin    = document.getElementById("horaFin").value || null;

    filtros.fechaInicio = document.getElementById("fechaInicio").value || null;
    filtros.fechaFin    = document.getElementById("fechaFin").value || null;

    filtros.molestiaMin = document.getElementById("molestiaMin").value ? +document.getElementById("molestiaMin").value : null;
    filtros.molestiaMax = document.getElementById("molestiaMax").value ? +document.getElementById("molestiaMax").value : null;

    filtros.dbMin = document.getElementById("dbMin").value ? +document.getElementById("dbMin").value : null;
    filtros.dbMax = document.getElementById("dbMax").value ? +document.getElementById("dbMax").value : null;

    const checks = document.querySelectorAll('input[name="fuenteFiltro"]:checked');
    filtros.fuentes = Array.from(checks).map(c => c.value);

    const filtrados = obtenerFiltradosActuales();

    capaRegistros.clearLayers();
    capaRegistros.addData(filtrados);

    actualizarResumen(filtrados);
    actualizarHexbin();
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
    actualizarHexbin();
});
