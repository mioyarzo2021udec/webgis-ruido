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

        // Esta escala no define colores finales, solo valores
        this._colorScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, 1]);
    },

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

    projectPoint: function (lat, lng) {
        return this._map.latLngToLayerPoint([lat, lng]);
    },

    redraw: function () {
        if (!this._map) return;

        const projected = this._data.map(d => {
            const p = this.projectPoint(this._lat(d), this._lng(d));
            return { point: p, data: d };
        });

        const hexbinGen = d3.hexbin()
            .radius(this._radius)
            .x(d => d.point.x)
            .y(d => d.point.y);

        const bins = hexbinGen(projected);

        this._bins = bins;

        const valueFn = this._value;

        const sel = this._rootGroup
            .selectAll("path.hexbin")
            .data(bins);

        sel.enter()
            .append("path")
            .attr("class", "hexbin")
            .merge(sel)
            .attr("d", d => `M${d.x},${d.y}` + hexbinGen.hexagon())
            .attr("fill-opacity", this._opacity);

        sel.exit().remove();

        this.fire("render");
    }
});

L.hexbinLayer = function (options) {
    return new L.HexbinLayer(options);
};
