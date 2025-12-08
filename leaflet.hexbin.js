/*
 Leaflet Hexbin Layer - versión corregida y funcional
*/

L.HexbinLayer = L.Layer.extend({

    initialize: function (options) {
        L.setOptions(this, options);

        this._data = [];
        this._lat = options.lat || (d => d.lat);
        this._lng = options.lng || (d => d.lng);
        this._value = options.value || (d => d.length);
        this._radius = options.radius || 12;
        this._opacity = options.opacity || 0.7;

        this._colorScale = d3.scaleLinear()
            .domain([0, 1])
            .range(["#ffffff", "#ff0000"]);
    },

    // Getter/setter para colorScale
    colorScale: function (scale) {
        if (scale) {
            this._colorScale = scale;
            return this;
        }
        return this._colorScale;
    },

    data: function (data) {
        this._data = data || [];
        this.redraw();
        return this;
    },

    onAdd: function (map) {
        this._map = map;

        this._container = L.svg().addTo(map);
        this._rootGroup = d3.select(this._container._rootGroup);

        map.on("zoomend", this.redraw, this);
        this.redraw();
    },

    onRemove: function (map) {
        map.off("zoomend", this.redraw, this);
        this._container.remove();
        this._map = null;
    },

    // Proyecta lat/lng → coordenadas de la capa SVG
    projectPoint: function (lat, lng) {
        return this._map.latLngToLayerPoint([lat, lng]);
    },

    redraw: function () {
        if (!this._map) return;

        // 1) Convertir puntos a coordenadas proyectadas
        const projected = this._data.map(d => {
            const p = this.projectPoint(this._lat(d), this._lng(d));
            return { point: p, data: d };
        });

        // 2) Generar bins hexagonales
        const hexbinGen = d3.hexbin()
            .radius(this._radius)
            .x(d => d.point.x)
            .y(d => d.point.y);

        const bins = hexbinGen(projected);

        // ←← ESTA LÍNEA ES LA CLAVE: expone los bins
        this._bins = bins;

        const colorScale = this._colorScale;
        const valueFn = this._value;

        // 3) Renderizar hexágonos
        const sel = this._rootGroup
            .selectAll("path.hexbin")
            .data(bins);

        sel.enter()
            .append("path")
            .attr("class", "hexbin")
            .merge(sel)
            .attr("d", d => `M${d.x},${d.y}` + hexbinGen.hexagon())
            .attr("fill", d => colorScale(valueFn(d)))
            .attr("fill-opacity", this._opacity)
            .attr("stroke", "#222")
            .attr("stroke-width", 0.8);

        sel.exit().remove();

        // Disparar evento para etiquetas
        this.fire("render");
    }
});

L.hexbinLayer = function (options) {
    return new L.HexbinLayer(options);
};
