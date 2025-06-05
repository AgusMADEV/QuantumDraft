// --- Inicialización ---
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');

let currentTool = 'pencil',
    isDrawing = false;
let startX = 0, startY = 0, lastX = 0, lastY = 0;
let strokeColor = document.getElementById('color-picker').value;
let fillColor   = document.getElementById('shape-fill').value;
let borderColor = document.getElementById('shape-border').value;
let lineWidth   = document.getElementById('size-slider').value;

let shapes = [],
    polygonPoints = [],
    pathPoints = [],
    freehandPoints = [];
let photons = [];
let selectedShape = null,
    action = null,
    handleIndex = -1;

const selectParams = document.getElementById('selection-params');
const inputWidth    = document.getElementById('select-width');
const inputHeight   = document.getElementById('select-height');

// Lista de opciones para “Tipo de componente”
const COMPONENT_TYPES = [
  'dinodo',
  'photocathode',
  'grid',
  'accelerator',
  'ánodo',
  'otro'
];

// --- Clase Photon (POO) ---
class Photon {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.color = 'yellow';
    // Futuras propiedades: velocidad, energía, etc.
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

// --- Ajuste del canvas al contenedor ---
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width  = c.clientWidth;
  canvas.height = c.clientWidth * 0.47;
  redrawAll();
  updateShapesInfoTable();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Cálculo de bounding box ---
function getBoundingBox(s) {
  if (s.type === 'rectangle' || s.type === 'ellipse') {
    return { x: s.x, y: s.y, w: s.w, h: s.h };
  } else {
    const xs = s.points.map(p => p.x),
          ys = s.points.map(p => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys)
    };
  }
}

// --- Transformación de clic para formas rotadas ---
function unrotatePoint(x, y, cx, cy, angle) {
  const dx = x - cx, dy = y - cy;
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

// --- Detección de handles en coordenadas sin rotar ---
function detectHandle(x, y, box, angle = 0) {
  const size = 8;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const p = unrotatePoint(x, y, cx, cy, angle);
  const corners = [
    { x: box.x,         y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x,         y: box.y + box.h }
  ];
  for (let i = 0; i < corners.length; i++) {
    if (
      Math.abs(p.x - corners[i].x) <= size &&
      Math.abs(p.y - corners[i].y) <= size
    ) {
      return i;
    }
  }
  return -1;
}

function isOnRotateHandle(x, y, box, angle = 0) {
  const size = 6;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const handle = { x: cx, y: cy - 20 };
  const p = unrotatePoint(x, y, cx, cy, angle);
  return Math.hypot(p.x - handle.x, p.y - handle.y) <= size;
}

// --- Dibujado de handles con transformaciones ---
function drawHandles(box, angle = 0) {
  const size = 8;
  const corners = [
    { x: box.x,         y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x + box.w, y: box.y + box.h },
    { x: box.x,         y: box.y + box.h }
  ];
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  corners.forEach(c => {
    ctx.fillRect(c.x - size / 2, c.y - size / 2, size, size);
    ctx.strokeRect(c.x - size / 2, c.y - size / 2, size, size);
  });
  ctx.restore();
}

function drawRotateHandle(box, angle = 0) {
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, -20, 6, 0, 2 * Math.PI);
  ctx.fillStyle = 'yellow';
  ctx.fill();
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.restore();
}

// --- Actualizar UI de selección ---
function updateSelectionUI() {
  const s = shapes[selectedShape];
  if (!s) return;
  if (['rectangle','ellipse','polygon','path'].includes(s.type)) {
    document.getElementById('shape-params').style.display = 'flex';
    document.getElementById('global-color').style.display = 'none';
    document.getElementById('shape-fill').value   = s.fill   || '#000000';
    document.getElementById('shape-border').value = s.border || '#000000';
    selectParams.style.display = 'block';
    inputWidth.value  = Math.abs(s.w) || 0;
    inputHeight.value = Math.abs(s.h) || 0;
  } else {
    document.getElementById('shape-params').style.display = 'none';
    document.getElementById('global-color').style.display = 'block';
    selectParams.style.display = 'none';
    document.getElementById('color-picker').value = s.strokeColor || '#000000';
    document.getElementById('size-slider').value  = s.lineWidth   || 5;
  }
}

// --- Listeners de controles de color y grosor ---
document.getElementById('shape-fill').addEventListener('input', e => {
  if (selectedShape != null) {
    shapes[selectedShape].fill = e.target.value;
    redrawAll();
    updateShapesInfoTable();
  } else {
    fillColor = e.target.value;
  }
});
document.getElementById('shape-border').addEventListener('input', e => {
  if (selectedShape != null) {
    shapes[selectedShape].border = e.target.value;
    redrawAll();
    updateShapesInfoTable();
  } else {
    borderColor = e.target.value;
  }
});
document.getElementById('color-picker').addEventListener('input', e => {
  if (selectedShape != null) {
    shapes[selectedShape].strokeColor = e.target.value;
    redrawAll();
    updateShapesInfoTable();
  } else {
    strokeColor = e.target.value;
  }
});
document.getElementById('size-slider').addEventListener('input', e => {
  if (selectedShape != null) {
    shapes[selectedShape].lineWidth = e.target.value;
    redrawAll();
    updateShapesInfoTable();
  } else {
    lineWidth = e.target.value;
  }
});

// --- Botón “Limpiar Canvas” ---
document.getElementById('clear-btn').addEventListener('click', () => {
  shapes = [];
  polygonPoints = [];
  pathPoints = [];
  freehandPoints = [];
  photons = [];
  selectedShape = null;
  document.getElementById('shape-params').style.display = 'none';
  document.getElementById('global-color').style.display = 'block';
  selectParams.style.display = 'none';
  redrawAll();
  updateShapesInfoTable();
});

// --- Botones de selección de herramienta ---
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentTool = btn.dataset.tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Mostrar/ocultar paneles según herramienta
    if (['rectangle','ellipse','polygon','path'].includes(currentTool)) {
      document.getElementById('shape-params').style.display = 'flex';
      document.getElementById('global-color').style.display = 'none';
      selectParams.style.display = 'none';
    } else if (currentTool === 'select') {
      document.getElementById('shape-params').style.display = 'none';
      document.getElementById('global-color').style.display = 'none';
      selectParams.style.display = 'block';
    } else {
      document.getElementById('shape-params').style.display = 'none';
      document.getElementById('global-color').style.display = 'block';
      selectParams.style.display = 'none';
    }
    if (currentTool !== 'select') selectedShape = null;
    redrawAll();
  });
});

// --- Ajuste de ancho/alto al seleccionar una forma ---
inputWidth.addEventListener('input', () => {
  if (selectedShape != null) {
    const s = shapes[selectedShape];
    s.w = (s.w < 0 ? -1 : 1) * parseInt(inputWidth.value, 10);
    redrawAll();
    updateShapesInfoTable();
  }
});
inputHeight.addEventListener('input', () => {
  if (selectedShape != null) {
    const s = shapes[selectedShape];
    s.h = (s.h < 0 ? -1 : 1) * parseInt(inputHeight.value, 10);
    redrawAll();
    updateShapesInfoTable();
  }
});

// --- Detección de figura bajo el cursor ---
function hitTest(x, y) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    const box = getBoundingBox(s);
    if (s.angle) {
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const p = unrotatePoint(x, y, cx, cy, s.angle);
      if (
        p.x >= Math.min(box.x, box.x + box.w) &&
        p.x <= Math.max(box.x, box.x + box.w) &&
        p.y >= Math.min(box.y, box.y + box.h) &&
        p.y <= Math.max(box.y, box.y + box.h)
      ) {
        return i;
      }
    } else {
      if (
        x >= Math.min(box.x, box.x + box.w) &&
        x <= Math.max(box.x, box.x + box.w) &&
        y >= Math.min(box.y, box.y + box.h) &&
        y <= Math.max(box.y, box.y + box.h)
      ) {
        return i;
      }
    }
  }
  return null;
}

// --- Eventos del canvas ---
canvas.addEventListener('mousedown', e => {
  const x = e.offsetX, y = e.offsetY;
  startX = lastX = x;
  startY = lastY = y;

  if (currentTool === 'select') {
    selectedShape = hitTest(x, y);
    if (selectedShape != null) {
      updateSelectionUI();
      const s = shapes[selectedShape];
      const box = getBoundingBox(s);
      const angle = s.angle || 0;
      handleIndex = detectHandle(x, y, box, angle);
      if (handleIndex >= 0) action = 'resize';
      else if (isOnRotateHandle(x, y, box, angle)) action = 'rotate';
      else action = 'move';
    }
    redrawAll();
    return;
  }

  if (['pencil','eraser','rectangle','ellipse','path'].includes(currentTool)) {
    isDrawing = true;
  }
  if (currentTool === 'pencil' || currentTool === 'eraser') {
    freehandPoints = [{ x, y }];
  }
  if (currentTool === 'path') {
    pathPoints = [{ x, y }];
  }
  if (currentTool === 'polygon') {
    polygonPoints.push({ x, y });
    ctx.save();
      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    ctx.restore();
    if (polygonPoints.length > 2 && confirm('¿Cerrar polígono?')) {
      shapes.push({
        type: 'polygon',
        points: [...polygonPoints],
        fill: fillColor,
        border: borderColor,
        lineWidth,
        angle: 0,
        componentType: 'desconocido'
      });
      polygonPoints = [];
      redrawAll();
      updateShapesInfoTable();
    }
  }
});

canvas.addEventListener('mousemove', e => {
  const x = e.offsetX, y = e.offsetY;
  if (action && selectedShape != null) {
    const s = shapes[selectedShape];
    const dx = x - startX, dy = y - startY;
    const box = getBoundingBox(s);

    if (action === 'move') {
      if (s.points) {
        s.points.forEach(p => { p.x += dx; p.y += dy; });
      } else {
        s.x += dx; s.y += dy;
      }

    } else if (action === 'resize') {
      let newW, newH;
      switch (handleIndex) {
        case 0: newW = box.w - dx; newH = box.h - dy; break;
        case 1: newW = box.w + dx; newH = box.h - dy; break;
        case 2: newW = box.w + dx; newH = box.h + dy; break;
        case 3: newW = box.w - dx; newH = box.h + dy; break;
      }
      const scaleX = newW / box.w, scaleY = newH / box.h;
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      if (s.points) {
        s.points = s.points.map(p => ({
          x: cx + (p.x - cx) * scaleX,
          y: cy + (p.y - cy) * scaleY
        }));
      } else {
        s.w *= scaleX; s.h *= scaleY;
        s.x = cx - s.w / 2; s.y = cy - s.h / 2;
      }
      inputWidth.value  = Math.abs(s.w);
      inputHeight.value = Math.abs(s.h);

    } else if (action === 'rotate') {
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      const ang1 = Math.atan2(startY - cy, startX - cx);
      const ang2 = Math.atan2(y - cy, x - cx);
      const delta = ang2 - ang1;
      if (s.points) {
        s.points = s.points.map(p => ({
          x: cx + (p.x - cx) * Math.cos(delta) - (p.y - cy) * Math.sin(delta),
          y: cy + (p.x - cx) * Math.sin(delta) + (p.y - cy) * Math.cos(delta)
        }));
      } else {
        s.angle = (s.angle || 0) + delta;
      }
    }

    startX = x; startY = y;
    redrawAll();
    updateShapesInfoTable();
    return;
  }

  if (!isDrawing) return;

  if (currentTool === 'pencil' || currentTool === 'eraser') {
    ctx.save();
      if (currentTool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth   = lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
    ctx.restore();
    freehandPoints.push({ x, y });
    lastX = x; lastY = y;

  } else if (currentTool === 'path') {
    // Añadimos el nuevo punto al arreglo
    pathPoints.push({ x, y });

    // Redibujamos todo y luego la previsualización de la ruta cerrada
    redrawAll();
    ctx.save();
      ctx.fillStyle   = fillColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth   = lineWidth;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      pathPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    ctx.restore();

  } else {
    // Preview rect / ellipse
    redrawAll();
    ctx.save();
      ctx.fillStyle   = fillColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth   = lineWidth;
      ctx.beginPath();
      if (currentTool === 'rectangle') {
        ctx.rect(startX, startY, x - startX, y - startY);
      } else {
        ctx.ellipse(
          startX + (x - startX) / 2,
          startY + (y - startY) / 2,
          Math.abs(x - startX) / 2,
          Math.abs(y - startY) / 2,
          0, 0, 2 * Math.PI
        );
      }
      ctx.fill();
      ctx.stroke();
    ctx.restore();
  }
});

canvas.addEventListener('mouseup', e => {
  const x = e.offsetX, y = e.offsetY;

  if (isDrawing && (currentTool === 'pencil' || currentTool === 'eraser')) {
    shapes.push({
      type: 'freehand',
      points: [...freehandPoints],
      strokeColor,
      lineWidth,
      composite: currentTool === 'eraser' ? 'destination-out' : 'source-over',
      componentType: 'desconocido'
    });
    redrawAll();
    updateShapesInfoTable();
  }

  if (isDrawing && currentTool === 'path') {
    // Añadimos el punto final para que no se pierda el último trazo
    pathPoints.push({ x, y });
    shapes.push({
      type: 'path',
      points: [...pathPoints],
      fill: fillColor,
      border: borderColor,
      lineWidth,
      angle: 0,
      componentType: 'desconocido'
    });
    redrawAll();
    updateShapesInfoTable();
  }

  if (isDrawing && (currentTool === 'rectangle' || currentTool === 'ellipse')) {
    shapes.push({
      type: currentTool,
      x: startX,
      y: startY,
      w: x - startX,
      h: y - startY,
      fill: fillColor,
      border: borderColor,
      lineWidth,
      angle: 0,
      componentType: 'desconocido'
    });
    redrawAll();
    updateShapesInfoTable();
  }

  isDrawing      = false;
  action         = null;
  handleIndex    = -1;
  pathPoints     = [];
  freehandPoints = [];
});

// --- Renderizado final ---
function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1) Dibujar todas las formas existentes
  shapes.forEach((s, i) => {
    const box = getBoundingBox(s);
    ctx.save();

    // Aplicar rotación si existe
    if (s.angle) {
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(s.angle);
      ctx.translate(-cx, -cy);
    }

    // Dibujar cada tipo
    if (s.type === 'freehand') {
      ctx.globalCompositeOperation = s.composite;
      ctx.strokeStyle = s.strokeColor;
      ctx.lineWidth   = s.lineWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';

    } else if (s.type === 'rectangle') {
      ctx.fillStyle   = s.fill;
      ctx.strokeStyle = s.border;
      ctx.lineWidth   = s.lineWidth;
      ctx.beginPath();
      ctx.rect(s.x, s.y, s.w, s.h);
      ctx.fill();
      ctx.stroke();

    } else if (s.type === 'ellipse') {
      ctx.fillStyle   = s.fill;
      ctx.strokeStyle = s.border;
      ctx.lineWidth   = s.lineWidth;
      ctx.beginPath();
      ctx.ellipse(
        s.x + s.w / 2,
        s.y + s.h / 2,
        Math.abs(s.w) / 2,
        Math.abs(s.h) / 2,
        0, 0, 2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();

    } else if (s.type === 'polygon' || s.type === 'path') {
      ctx.fillStyle   = s.fill;
      ctx.strokeStyle = s.border;
      ctx.lineWidth   = s.lineWidth;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Si está seleccionado, dibujar bounding box y handles
    if (i === selectedShape) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      drawHandles(box, s.angle || 0);
      drawRotateHandle(box, s.angle || 0);
    }

    ctx.restore();
  });

  // 2) Dibujar fotones (array photons)
  photons.forEach(p => {
    p.draw(ctx);
  });
}

// --- Guardar dibujo en servidor ---
document.getElementById('save-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('drawing-name').value.trim();
  if (!nameInput) {
    return alert("Por favor, introduce un nombre para el dibujo.");
  }
  const imageData = canvas.toDataURL('image/png');
  fetch('save_canvas.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData, name: nameInput })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(`Dibujo guardado como ${data.filename}`);
    } else {
      alert("Error al guardar: " + data.error);
    }
  })
  .catch(err => alert("Error de conexión: " + err.message));
});

// --- Listener para “Play”: crear fotones ---
document.getElementById('play-photons-btn').addEventListener('click', () => {
  const countInput = document.getElementById('photon-count');
  let n = parseInt(countInput.value, 10);
  if (isNaN(n) || n < 0) n = 0;
  if (n > 5) n = 5;

  photons = [];

  for (let i = 0; i < n; i++) {
    const margin = 10;
    const px = Math.random() * (canvas.width - 2 * margin) + margin;
    const py = Math.random() * (canvas.height - 2 * margin) + margin;
    const p = new Photon(px, py);
    photons.push(p);
  }

  redrawAll();
});

// ---------------------------
//  FUNCIONES DE LA TABLA
// ---------------------------
function updateShapesInfoTable() {
  const tbody = document
    .getElementById('shapes-info-table')
    .querySelector('tbody');
  
  // Vaciar contenido previo
  tbody.innerHTML = '';

  shapes.forEach((s, index) => {
    const tr = document.createElement('tr');

    // --- Columna índice ---
    const tdIndex = document.createElement('td');
    tdIndex.textContent = index + 1;
    tr.appendChild(tdIndex);

    // --- Columna tipo de componente (select) ---
    const tdType = document.createElement('td');
    const select = document.createElement('select');
    // Llenar opciones:
    COMPONENT_TYPES.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
    // Establecer valor actual (o 'desconocido' si no existe)
    select.value = s.componentType || 'desconocido';
    // Listener para actualizar shapes[index].componentType al cambiar:
    select.addEventListener('change', () => {
      shapes[index].componentType = select.value;
      // No necesitamos redrawAll() porque el componente no afecta al canvas
    });
    tdType.appendChild(select);
    tr.appendChild(tdType);

    // --- Columna color de relleno (input[type="color"]) ---
    const tdColor = document.createElement('td');
    if (s.fill !== undefined) {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = s.fill;
      // Cuando cambie, actualizamos shapes[index].fill y redibujamos
      colorInput.addEventListener('input', () => {
        shapes[index].fill = colorInput.value;
        redrawAll();
      });
      tdColor.appendChild(colorInput);
    } else {
      // Si no tiene fill (freehand, etc.), mostramos “—”
      const dash = document.createElement('span');
      dash.textContent = '—';
      tdColor.appendChild(dash);
    }
    tr.appendChild(tdColor);

    tbody.appendChild(tr);
  });
}
