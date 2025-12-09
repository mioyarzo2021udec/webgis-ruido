/* ========================================================= */
/* VARIABLES GLOBALES */
/* ========================================================= */

:root {
    --header-height: 80px;
    color-scheme: light;
}

/* ========================================================= */
/* ESTILO GENERAL */
/* ========================================================= */

body {
    margin: 0;
    font-family: Arial, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #ffffff !important;
    color: #111 !important;
}

/* ========================================================= */
/* HEADER */
/* ========================================================= */

.top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px;
    background-color: #582699;
    border-bottom: 1px solid #3f1475;
    gap: 12px;
    position: relative;
    z-index: 1000;
    min-height: var(--header-height);
    color: white;
}

.header-title-block {
    max-width: 45%;
}

.header-subtext {
    font-size: 13px;
    line-height: 1.3;
    margin: 4px 0 0 0;
    color: #e6e6e6;
}

.top-bar h2 {
    margin: 0;
    font-size: 20px;
}

.control-row {
    display: flex;
    gap: 14px;
    justify-content: center;
    align-items: flex-end;
}

.control-group {
    display: flex;
    flex-direction: column;
    min-width: 130px;
}

.control-group label {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 4px;
    color: white;
}

/* Selects mejor proporcionados */
.control-group select {
    height: 34px;
    padding: 4px 8px;
    font-size: 14px;
    border-radius: 6px;
}

/* Checkbox hexbin más grande */
#hexbinToggle {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

/* Botones principales */
.top-bar button {
    padding: 8px 14px;
    font-size: 15px;
    border: none;
    background-color: #3a4acf;
    color: white;
    border-radius: 6px;
    cursor: pointer;
}

.top-bar button:hover {
    background-color: #323fab;
}

/* Notas */
.btn-note {
    display: block;
    font-size: 12px;
    font-style: italic;
    margin-top: 2px;
    color: #dcdcdc;
}

/* ========================================================= */
/* PANEL IZQUIERDO */
/* ========================================================= */

#legend-panel {
    width: 300px; /* más ancho para que no quede apretado */
    border-right: 1px solid #ccc;
    padding: 12px;
    background: white;
    overflow-y: auto;
}

/* ========================================================= */
/* LEYENDA */
/* ========================================================= */

.legend {
    background: #2c3791;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #2c3791;
    margin-bottom: 22px;
}

.legend-title {
    margin: 0 0 10px 0;
    font-size: 16px;
    font-weight: bold;
    color: white;
}

/* ÚNICO recuadro blanco interno */
#legend-content {
    background: white;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #ddd;

    color: #111; /* letra negra */
    font-size: 13px;

    /* evitar recuadros azules internos */
}

#legend-content h4 {
    font-size: 14px;
    margin: 6px 0 6px 0;
    color: #111;
}

.legend-row {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
}

.legend-color {
    width: 20px;
    height: 12px;
    border: 1px solid #777;
    margin-right: 8px;
}

/* Ejemplo */
.legend-example {
    margin-left: 28px;
    margin-top: 2px;
    margin-bottom: 10px;
    font-size: 12px;
    font-style: italic;
    color: #555; /* gris (Opción C) */
}

/* Nota final */
.legend-footnote {
    margin-top: 18px;
    text-align: center;
    font-size: 12px;
    color: #555; /* gris */
    font-style: italic;
}

/* ========================================================= */
/* FILTROS */
/* ========================================================= */

.panel-box {
    background: #2c3791;
    border-radius: 6px;
    padding: 12px;
    color: white;
    margin-bottom: 22px;
    border: 1px solid #2c3791;
}

.panel-box h3 {
    margin: 0 0 8px 0;
    font-size: 15px;
    font-weight: bold;
}

.panel-inner {
    background: white;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #ddd;
    color: #111;
}

/* Secciones */
.filter-section {
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #ccc;
}

.filter-section h4 {
    font-size: 14px;
    margin: 4px 0 8px 0;
}

/* Inputs */
#filters-panel input {
    width: 100%;
    padding: 6px;
    margin-top: 3px;
    border-radius: 4px;
    border: 1px solid #bbb;
}

/* Checkboxes con texto alineado */
#filters-panel label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    font-size: 13px;
}

/* Botones filtros */
.filter-btn {
    width: 100%;
    padding: 9px;
    margin-top: 8px;
    background: #3a4acf;
    border-radius: 6px;
    border: none;
    color: white;
    font-size: 14px;
}

.filter-btn:hover {
    background: #323fab;
}

.filter-btn.reset {
    background: #777;
}

/* ========================================================= */
/* RESUMEN DE FILTRADOS */
/* ========================================================= */

#summary-list {
    font-size: 13px;
    padding-left: 16px;
}

#summary-list li {
    margin-bottom: 8px;
    line-height: 1.45;
}

/* Mejoramos padding interior */
.panel-inner ul {
    padding-top: 4px;
    padding-bottom: 4px;
}

/* ========================================================= */
/* PANELES DERECHA */
/* ========================================================= */

#info-panel,
#form-panel,
#download-panel {
    position: fixed;
    top: var(--header-height);
    right: 0;
    height: calc(100vh - var(--header-height));
    background: white;
    border-left: 1px solid #ccc;
    display: none;
    flex-direction: column;
    overflow: hidden;
}

/* ANCHOS */
#info-panel { width: 22%; max-width: 300px; }
#download-panel { width: 28%; max-width: 330px; }
#form-panel { width: 32%; max-width: 380px; }

/* Encabezados */
.info-header,
.download-panel-header,
.form-panel-header {
    background: #323fab;
    color: white;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #2c3791;
}

.info-header h3,
.download-panel-header h3,
.form-panel-header h3 {
    margin: 0;
    font-size: 15px;
}

/* Botón cerrar */
.info-header button,
.download-panel-header button,
.form-panel-header button {
    background: transparent;
    border: none;
    font-size: 18px;
    color: white;
    cursor: pointer;
}

/* Padding del panel de información (corregido) */
#info-content {
    padding: 16px;
    padding-top: 18px;
    font-size: 14px;
    line-height: 1.4;
}

#download-content,
#kobo-frame {
    padding: 14px;
    overflow-y: auto;
}

/* ========================================================= */
/* DESCARGA */
/* ========================================================= */

.download-info-box {
    background: #fafafa;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #ddd;
    margin-bottom: 14px;
}

.download-action {
    width: 100%;
    padding: 10px;
    margin-bottom: 12px;
    background: #3a4acf;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
}

.download-action:hover {
    background: #323fab;
}

/* ========================================================= */
/* MAPA */
/* ========================================================= */

#map {
    flex: 1;
    height: 100%;
    min-width: 0;
}

/* ========================================================= */
/* MOBILE */
/* ========================================================= */

@media (max-width: 600px) {
    #legend-panel {
        width: 100%!important;
        max-height: 40vh;
    }

    #info-panel,
    #download-panel,
    #form-panel {
        width: 100%!important;
        max-width: none!important;
    }
}

