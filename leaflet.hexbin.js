/*
 Leaflet Hexbin Layer - versión reducida y funcional
 basada en Asymmetrik/leaflet-d3 - solo HexbinLayer
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

    colorScale: function () {
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
        this._zoomEnd = map.on("zoomend", this.redraw, this);
        this.redraw();
    },

    onRemove: function (map) {
        if (this._zoomEnd) map.off("zoomend", this.redraw, this);
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

        const hexbin = d3.hexbin()
            .radius(this._radius)
            .x(d => d.point.x)
            .y(d => d.point.y);

        const bins = hexbin(projected);

        const colorValue = this._value;
        const colorScale = this._colorScale;

        const sel = this._rootGroup
            .selectAll("path.hexbin")
            .data(bins);

        sel.enter()
            .append("path")
            .attr("class", "hexbin")
            .merge(sel)
            .attr("d", d => "M" + d.x + "," + d.y + hexbin.hexagon())
            .attr("fill", d => colorScale(colorValue(d)))
            .attr("fill-opacity", this._opacity)
            .attr("stroke", "#333")
            .attr("stroke-width", 1);

        sel.exit().remove();
    }
});

L.hexbinLayer = function (options) {
    return new L.HexbinLayer(options);
};
