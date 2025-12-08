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
// Ajustar dinámicamente altura del header
// ---------------------------------------------------
function updatePanelTop() {
    const header = document.querySelector('.top-bar');
    if (!header) return;

    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', headerHeight + 'px');
}

// ejecutar ahora
updatePanelTop();

// ejecutar cuando cambie el tamaño de pantalla
window.addEventListener('resize', updatePanelTop);

// ---------------------------------------------------
// DETECTAR MÓVIL Y CONTROLAR SCROLL
// ---------------------------------------------------
var isMobile = /Mobi|Android/i.test(navigator.userAgent);

if (isMobile) {
    // impedir que un dedo arrastre el mapa
    map.dragging.disable();
    // pinch-zoom funciona igual
}

// ---------------------------------------------------
// COLOR GRADIENTE
// ---------------------------------------------------
function interpolateColor(value, min, max) {
    value = Math.max(min, Math.min(max, value));
    const ratio = (value - min) / (max - min);

    const r1 = 255, g1 = 255, b1 = 255;
    const r2 = 204, g2 = 16, b2 = 16;

    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
}

// ---------------------------------------------------
let registrosGeoJSON = null;
let capaRegistros = null;
let currentMode = "avg";
let selectedUUID = null;
let selectedLayer = null;

let filtros = {
    horaInicio: null,
    horaFin: null,
    fechaInicio: null,
    fechaFin: null,
    molestiaMin: null,
    molestiaMax: null,
    dbMin: null,
    dbMax: null
};


// ---------------------------------------------------
// PANEL DE INFORMACIÓN
// ---------------------------------------------------
function showInfoPanel(p) {
    const fecha = p.fecha_hora ? p.fecha_hora.split("T")[0] : "";
    const hora = p.fecha_hora ? p.fecha_hora.split("T")[1].split(".")[0] : "";

    document.getElementById("info-title").textContent = "Información del registro";

    document.getElementById("info-content").innerHTML = `
        <b>Título:</b> ${p.titulo || "(sin título)"}<br><br>

        <b>Descripción del evento:</b><br>
        ${p.descripcion || "(sin descripción)"}<br><br>

        <b>Fecha del registro:</b> ${fecha}<br>
        <b>Hora del registro:</b> ${hora}<br><br>

        <b>Fuente(s):</b>
        <ul>
            ${(p.fuente_ruido || "")
                .replace(/m_sica/g, "música")
                .replace(/tr_nsito_vehicular/g, "tránsito vehicular")
                .split(" ")
                .filter(f => f.trim() !== "")
                .map(f => `<li>${f}</li>`).join("")}
        </ul>

        <b>AVG dB:</b> ${p.avg_db}<br>
        <b>Molestia (0–10):</b> ${p.nivel_molestia}
    `;

    document.getElementById("info-panel").classList.add("open");
}

// ---------------------------------------------------
// ESTILO ORIGINAL
// ---------------------------------------------------
function restoreOriginalStyle(layer) {
    if (!layer || !layer.defaultOptions) return;

    layer.setStyle({
        radius: layer.defaultOptions.radius,
        color: layer.defaultOptions.color,
        weight: layer.defaultOptions.weight,
        fillColor: layer.defaultOptions.fillColor,
        fillOpacity: layer.defaultOptions.fillOpacity
    });
}

// ---------------------------------------------------
// RESALTAR SELECCIÓN
// ---------------------------------------------------
function highlightSelected(uuid) {
    if (!capaRegistros) return;

    capaRegistros.eachLayer(l => {
        if (l.feature.properties._uuid === uuid) {

            if (!l.defaultOptions) {
                l.defaultOptions = {
                    radius: l.options.radius,
                    color: l.options.color,
                    weight: l.options.weight,
                    fillColor: l.options.fillColor,
                    fillOpacity: l.options.fillOpacity
                };
            }

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
// RESET SELECCIÓN
// ---------------------------------------------------
function resetHighlight() {
    if (selectedLayer) restoreOriginalStyle(selectedLayer);
    selectedUUID = null;
    selectedLayer = null;
}

// ---------------------------------------------------
// CAPA GEOJSON
// ---------------------------------------------------
function dibujarRegistros(modoColor) {
    if (!registrosGeoJSON) return;

    if (capaRegistros) map.removeLayer(capaRegistros);

    capaRegistros = L.geoJSON(registrosGeoJSON, {

        pointToLayer: function (feature, latlng) {
            const p = feature.properties;
            const color = (modoColor === "avg")
                ? interpolateColor(Number(p.avg_db), 20, 120)
                : interpolateColor(Number(p.nivel_molestia), 0, 10);

            const marker = L.circleMarker(latlng, {
                radius: 7,
                color: "#333",
                weight: 1.4,
                fillColor: color,
                fillOpacity: 1
            });

            marker.defaultOptions = {
                radius: 7,
                color: "#333",
                weight: 1.4,
                fillColor: color,
                fillOpacity: 1
            };

            return marker;
        },

        onEachFeature: function (feature, layer) {
            const p = feature.properties;

            layer.on("click", () => {
                if (selectedLayer) restoreOriginalStyle(selectedLayer);

                selectedUUID = p._uuid;

                showInfoPanel(p);

                highlightSelected(selectedUUID);
            });
        }

    }).addTo(map);

    if (selectedUUID) highlightSelected(selectedUUID);
}

// ---------------------------------------------------
// CERRAR PANEL
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
    });

// ---------------------------------------------------
// SELECTOR DE COLOR
// ---------------------------------------------------
document.getElementById("colorMode").addEventListener("change", function () {
    currentMode = this.value;

    dibujarRegistros(currentMode);
    actualizarLeyenda(currentMode);

    if (selectedUUID) highlightSelected(selectedUUID);
});

// ---------------------------------------------------
// SELECTOR DE MAPA BASE
// ---------------------------------------------------
document.getElementById("basemapSelect").addEventListener("change", function () {
    const v = this.value;

    [osm, carto, voyager, sat].forEach(l => map.removeLayer(l));

    if (v === "osm") osm.addTo(map);
    if (v === "carto") carto.addTo(map);
    if (v === "voyager") voyager.addTo(map);
    if (v === "sat") sat.addTo(map);

    if (capaRegistros) capaRegistros.addTo(map);

    if (selectedUUID) highlightSelected(selectedUUID);
});

// ---------------------------------------------------
// LEYENDA (panel propio)
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
                    <span class="legend-color" style="background:${c}"></span>
                    ${r.l}
                </div>
                <div class="legend-example"><em>${r.e}</em></div>
            `;
        });

        html += `
            <small class="legend-footnote">
                Ejemplos orientativos basados en recomendaciones de la OMS.
            </small>
        `;

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
                    <span class="legend-color" style="background:${c}"></span>
                    ${r.l}
                </div>
            `;
        });

        html += `
            <small class="legend-footnote">
                Escala subjetiva reportada por usuarios.
            </small>
        `;
    }

    html += '</div>';
    return html;
}

function actualizarLeyenda(modo) {
    const container = document.getElementById("legend-content");
    if (!container) return;
    container.innerHTML = generarLeyendaHTML(modo);
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

function pasaFiltros(p) {

    // Hora
    if (filtros.horaInicio || filtros.horaFin) {
        if (p.fecha_hora) {
            const hora = p.fecha_hora.split("T")[1].substring(0,5);

            if (filtros.horaInicio && hora < filtros.horaInicio) return false;
            if (filtros.horaFin && hora > filtros.horaFin) return false;
        }
    }

    // Fecha
    if (filtros.fechaInicio || filtros.fechaFin) {
        if (p.fecha_hora) {
            const fecha = p.fecha_hora.split("T")[0];

            if (filtros.fechaInicio && fecha < filtros.fechaInicio) return false;
            if (filtros.fechaFin && fecha > filtros.fechaFin) return false;
        }
    }

    // Molestia
    if (filtros.molestiaMin !== null && Number(p.nivel_molestia) < filtros.molestiaMin) return false;
    if (filtros.molestiaMax !== null && Number(p.nivel_molestia) > filtros.molestiaMax) return false;

    // dB
    if (filtros.dbMin !== null && Number(p.avg_db) < filtros.dbMin) return false;
    if (filtros.dbMax !== null && Number(p.avg_db) > filtros.dbMax) return false;

    return true;
}

function aplicarFiltros() {

    const filtrados = registrosGeoJSON.features.filter(feat =>
        pasaFiltros(feat.properties)
    );

    capaRegistros.clearLayers();
    capaRegistros.addData(filtrados);

    // Si tenías un punto seleccionado, lo quitamos
    resetHighlight();
}

document.getElementById("aplicarFiltrosBtn").addEventListener("click", () => {

    filtros.horaInicio = document.getElementById("horaInicio").value || null;
    filtros.horaFin    = document.getElementById("horaFin").value || null;

    filtros.fechaInicio = document.getElementById("fechaInicio").value || null;
    filtros.fechaFin    = document.getElementById("fechaFin").value || null;

    filtros.molestiaMin = document.getElementById("molestiaMin").value ? Number(document.getElementById("molestiaMin").value) : null;
    filtros.molestiaMax = document.getElementById("molestiaMax").value ? Number(document.getElementById("molestiaMax").value) : null;

    filtros.dbMin = document.getElementById("dbMin").value ? Number(document.getElementById("dbMin").value) : null;
    filtros.dbMax = document.getElementById("dbMax").value ? Number(document.getElementById("dbMax").value) : null;

    aplicarFiltros();
});

document.getElementById("limpiarFiltrosBtn").addEventListener("click", () => {

    // Reset objeto
    filtros = {
        horaInicio: null,
        horaFin: null,
        fechaInicio: null,
        fechaFin: null,
        molestiaMin: null,
        molestiaMax: null,
        dbMin: null,
        dbMax: null
    };

    // Reset inputs
    document.querySelectorAll("#filters-panel input").forEach(i => i.value = "");

    // Dibujar todos los registros nuevamente
    dibujarRegistros(currentMode);
});


