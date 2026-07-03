/**
 * d3-bridge.js — Adaptador de D3.js para X1
 *
 * Visualizacion de datos basada en documentos.
 * Licencia: MIT (D3 Contributors)
 */

(function() {
  'use strict';

  var log = (typeof x1Log === 'function') ? x1Log('D3Bridge') : { info: function(m){console.log('[X1-D3]',m);}, warn: function(m){console.warn('[X1-D3]',m);}, error: function(m){console.error('[X1-D3]',m);} };

  // ─── Scales ───

  var Scales = {
    linear: function(domain, range) {
      var dMin = domain[0], dMax = domain[1], rMin = range[0], rMax = range[1];
      return function(value) { return rMin + (value - dMin) / (dMax - dMin) * (rMax - rMin); };
    },
    ordinal: function(domain, range) {
      return function(value) { var idx = domain.indexOf(value); return range[idx % range.length]; };
    },
    logarithmic: function(domain, range) {
      var dMin = Math.log(domain[0]), dMax = Math.log(domain[1]), rMin = range[0], rMax = range[1];
      return function(value) { return rMin + (Math.log(value) - dMin) / (dMax - dMin) * (rMax - rMin); };
    },
    time: function(domain, range) {
      var dMin = domain[0].getTime(), dMax = domain[1].getTime(), rMin = range[0], rMax = range[1];
      return function(value) { return rMin + (value.getTime() - dMin) / (dMax - dMin) * (rMax - rMin); };
    }
  };

  // ─── Shapes ───

  function line(data, xAccessor, yAccessor, scale) {
    return data.map(function(d, i) {
      var x = xAccessor ? xAccessor(d, i) : i;
      var y = yAccessor ? yAccessor(d, i) : d;
      return { x: scale ? scale.x(x) : x, y: scale ? scale.y(y) : y };
    });
  }

  function area(data, xAccessor, yAccessor, y0, scale) {
    return data.map(function(d, i) {
      var x = xAccessor ? xAccessor(d, i) : i;
      var y1 = yAccessor ? yAccessor(d, i) : d;
      var y0Val = y0 !== undefined ? y0 : 0;
      return { x: scale ? scale.x(x) : x, y1: scale ? scale.y(y1) : y1, y0: scale ? scale.y(y0Val) : y0Val };
    });
  }

  function arc(startAngle, endAngle, innerRadius, outerRadius) {
    var angleDiff = endAngle - startAngle;
    var midAngle = startAngle + angleDiff / 2;
    return {
      startX: Math.cos(startAngle) * outerRadius,
      startY: Math.sin(startAngle) * outerRadius,
      endX: Math.cos(endAngle) * outerRadius,
      endY: Math.sin(endAngle) * outerRadius,
      innerX: Math.cos(endAngle) * innerRadius,
      innerY: Math.sin(endAngle) * innerRadius,
      startInnerX: Math.cos(startAngle) * innerRadius,
      startInnerY: Math.sin(startAngle) * innerRadius,
      largeArc: angleDiff > Math.PI ? 1 : 0
    };
  }

  function pie(data, valueAccessor) {
    var total = data.reduce(function(sum, d) { return sum + (valueAccessor ? valueAccessor(d) : d); }, 0);
    var startAngle = -Math.PI / 2;
    return data.map(function(d) {
      var value = valueAccessor ? valueAccessor(d) : d;
      var angle = (value / total) * 2 * Math.PI;
      var slice = { value: value, startAngle: startAngle, endAngle: startAngle + angle, data: d };
      startAngle += angle;
      return slice;
    });
  }

  function tree(root, options) {
    options = options || {};
    var nodeSize = options.nodeSize || [100, 50];
    var result = [];

    function traverse(node, depth, index) {
      result.push({ data: node, depth: depth, x: index * nodeSize[0], y: depth * nodeSize[1] });
      if (node.children) {
        node.children.forEach(function(child, i) {
          traverse(child, depth + 1, result.length + i);
        });
      }
    }

    traverse(root, 0, 0);
    return result;
  }

  function force(data, options) {
    options = options || {};
    var strength = options.strength || 0.1;
    var result = data.map(function(d, i) {
      return Object.assign({}, d, {
        fx: d.x + (Math.random() - 0.5) * 100 * strength,
        fy: d.y + (Math.random() - 0.5) * 100 * strength,
        vx: 0,
        vy: 0
      });
    });
    return { nodes: result, links: options.links || [] };
  }

  // ─── Colors ───

  function scheme(count) {
    var colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
    var result = [];
    for (var i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  function interpolate(a, b) {
    return function(t) {
      var r1 = parseInt(a.slice(1, 3), 16), g1 = parseInt(a.slice(3, 5), 16), b1 = parseInt(a.slice(5, 7), 16);
      var r2 = parseInt(b.slice(1, 3), 16), g2 = parseInt(b.slice(3, 5), 16), b2 = parseInt(b.slice(5, 7), 16);
      var r = Math.round(r1 + (r2 - r1) * t);
      var g = Math.round(g1 + (g2 - g1) * t);
      var bl = Math.round(b1 + (b2 - b1) * t);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    };
  }

  // ─── SVG Generation ───

  function generateSVG(type, data, options) {
    options = options || {};
    var width = options.width || 400;
    var height = options.height || 300;

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '">';

    if (type === 'bar') {
      var barWidth = width / data.length - 2;
      var maxVal = Math.max.apply(null, data.map(function(d) { return d.value || d; }));
      data.forEach(function(d, i) {
        var val = d.value !== undefined ? d.value : d;
        var barHeight = (val / maxVal) * (height - 40);
        var label = d.label || '';
        svg += '<rect x="' + (i * (barWidth + 2) + 1) + '" y="' + (height - barHeight - 20) + '" width="' + barWidth + '" height="' + barHeight + '" fill="' + (d.color || '#1f77b4') + '"/>';
        svg += '<text x="' + (i * (barWidth + 2) + barWidth / 2 + 1) + '" y="' + (height - 5) + '" text-anchor="middle" font-size="10">' + label + '</text>';
      });
    } else if (type === 'line') {
      var points = data.map(function(d, i) {
        var x = (i / (data.length - 1)) * width;
        var y = height - ((d.value !== undefined ? d.value : d) / Math.max.apply(null, data.map(function(dd) { return dd.value !== undefined ? dd.value : dd; }))) * (height - 40);
        return x + ',' + y;
      }).join(' ');
      svg += '<polyline points="' + points + '" fill="none" stroke="' + (options.color || '#1f77b4') + '" stroke-width="2"/>';
    } else if (type === 'pie') {
      var slices = pie(data, function(d) { return d.value; });
      slices.forEach(function(s) {
        var r = Math.min(width, height) / 2 - 10;
        var cx = width / 2, cy = height / 2;
        var path = arc(s.startAngle - Math.PI / 2, s.endAngle - Math.PI / 2, 0, r);
        svg += '<path d="M ' + cx + ' ' + cy + ' L ' + (cx + path.startX) + ' ' + (cy + path.startY) + ' A ' + r + ' ' + r + ' 0 ' + path.largeArc + ' 1 ' + (cx + path.endX) + ' ' + (cy + path.endY) + ' Z" fill="' + (s.data.color || '#1f77b4') + '"/>';
      });
    }

    svg += '</svg>';
    return svg;
  }

  // ─── Public API ───

  self.X1D3Bridge = {
    version: '1.0.0',
    license: 'MIT',
    source: 'https://github.com/d3/d3',

    Scales: Scales,
    line: line,
    area: area,
    arc: arc,
    pie: pie,
    tree: tree,
    force: force,
    scheme: scheme,
    interpolate: interpolate,
    generateSVG: generateSVG,

    scale: { linear: Scales.linear, ordinal: Scales.ordinal, log: Scales.logarithmic, time: Scales.time },

    healthCheck: function() {
      return Promise.resolve({ ok: true, version: '1.0.0', capabilities: ['scales', 'shapes', 'colors', 'svg'] });
    }
  };

  if (self.X1Integrations) {
    self.X1Integrations.register({
      name: 'd3',
      version: '1.0.0',
      license: 'MIT',
      path: 'background/integrations/d3/',
      description: 'Visualizacion de datos basada en documentos',
      healthCheck: function() { return self.X1D3Bridge.healthCheck(); },
      dependencies: []
    });
  }

  log.info('X1D3Bridge cargado');

})();
