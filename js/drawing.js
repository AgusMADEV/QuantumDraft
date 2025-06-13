// ===================================================================
// HERRAMIENTAS DE DIBUJO - Simulador Fotomultiplicador 2D
// ===================================================================

// Estado del dibujo (variable global para accesibilidad)
window.drawingState = {
    isDrawing: false,
    mode: null, // 'rectangle', 'ellipse', 'polygon'
    currentTool: null,
    currentElement: null,
    selectedElement: null,
    startX: 0,
    startY: 0,
    polygonPoints: [],
    shapeProps: {
        fill: '#ffffff',
        border: '#000000'
    }
};

// Inicializar herramientas de dibujo
function initializeDrawingTools() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    // Configurar botones de herramientas
    toolButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Desactivar todos los botones
            toolButtons.forEach(b => b.classList.remove('active'));
            
            // Activar el botón actual
            e.target.classList.add('active');
            
            // Establecer herramienta actual
            drawingState.currentTool = e.target.dataset.tool;
            
            // Mostrar/ocultar panel de propiedades
            const shapeParams = document.getElementById('shape-params');
            shapeParams.style.display = drawingState.currentTool !== 'select' ? 'block' : 'none';
            
            // Cambiar estilo del cursor
            setCursorStyle(drawingState.currentTool);
        });
    });
    
    // Configurar selección de colores
    document.getElementById('shape-fill').addEventListener('input', (e) => {
        drawingState.shapeProps.fill = e.target.value;
        if (drawingState.selectedElement) {
            drawingState.selectedElement.style = {
                ...drawingState.selectedElement.style,
                fill: e.target.value
            };
            engine.render();
        }
    });
    
    document.getElementById('shape-border').addEventListener('input', (e) => {
        drawingState.shapeProps.border = e.target.value;
        if (drawingState.selectedElement) {
            drawingState.selectedElement.style = {
                ...drawingState.selectedElement.style,
                border: e.target.value
            };
            engine.render();
        }
    });
    
    // Event listeners para el canvas
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('click', handleCanvasClick);
}

// Manejar evento mousedown en canvas
function handleCanvasMouseDown(e) {
    if (!drawingState.currentTool) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    drawingState.isDrawing = true;
    drawingState.startX = x;
    drawingState.startY = y;
    
    if (drawingState.currentTool === 'polygon') {
        if (drawingState.polygonPoints.length === 0) {
            // Iniciar nuevo polígono
            drawingState.polygonPoints = [{ x, y }];
        } else {
            // Continuar polígono existente
            drawingState.polygonPoints.push({ x, y });
        }
    } else if (drawingState.currentTool === 'select') {
        drawingState.selectedElement = findElementAtPosition(x, y);
        if (drawingState.selectedElement) {
            // Actualizar controles de colores con valores actuales
            if (drawingState.selectedElement.style) {
                document.getElementById('shape-fill').value = drawingState.selectedElement.style.fill || '#ffffff';
                document.getElementById('shape-border').value = drawingState.selectedElement.style.border || '#000000';
            }
        }
    } else {
        // Para rectangle y ellipse
        drawingState.currentElement = {
            type: drawingState.currentTool,
            x: x,
            y: y,
            w: 0,
            h: 0,
            style: {
                fill: drawingState.shapeProps.fill,
                border: drawingState.shapeProps.border
            }
        };
    }
    
    engine.render();
}

// Manejar evento mousemove en canvas
function handleCanvasMouseMove(e) {
    if (!drawingState.isDrawing || !drawingState.currentTool) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (drawingState.currentTool === 'rectangle' || drawingState.currentTool === 'ellipse') {
        // Actualizar tamaño del elemento
        drawingState.currentElement.w = x - drawingState.startX;
        drawingState.currentElement.h = y - drawingState.startY;
        
        // Dibujar vista previa
        engine.render();
        drawPreview();
    } else if (drawingState.currentTool === 'select' && drawingState.selectedElement) {
        // Mover elemento seleccionado
        const dx = x - drawingState.startX;
        const dy = y - drawingState.startY;
        
        drawingState.startX = x;
        drawingState.startY = y;
        
        drawingState.selectedElement.x += dx;
        drawingState.selectedElement.y += dy;
        
        engine.render();
    }
}

// Manejar evento mouseup en canvas
function handleCanvasMouseUp(e) {
    if (!drawingState.isDrawing || !drawingState.currentTool) return;
    
    if (drawingState.currentTool === 'rectangle' || drawingState.currentTool === 'ellipse') {
        // Finalizar creación de forma
        if (Math.abs(drawingState.currentElement.w) > 5 && Math.abs(drawingState.currentElement.h) > 5) {
            // Normalizar dimensiones negativas
            normalizeShape(drawingState.currentElement);
            
            // Preguntar tipo de elemento
            const elementType = promptElementType();
            if (elementType) {
                // Añadir a la configuración
                addShapeToConfig(drawingState.currentElement, elementType);
            }
        }
        
        drawingState.currentElement = null;
    } else if (drawingState.currentTool === 'polygon') {
        // Continuar, el polígono se finaliza con doble clic
    }
    
    drawingState.isDrawing = false;
    engine.render();
}

// Manejar clicks para polígonos
function handleCanvasClick(e) {
    if (drawingState.currentTool !== 'polygon') return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Detectar doble clic para finalizar polígono
    if (e.detail === 2 && drawingState.polygonPoints.length > 2) {
        const polygon = {
            type: 'polygon',
            points: [...drawingState.polygonPoints],
            style: {
                fill: drawingState.shapeProps.fill,
                border: drawingState.shapeProps.border
            }
        };
        
        // Calcular el rectángulo delimitador
        const bounds = calculatePolygonBounds(polygon.points);
        polygon.x = bounds.x;
        polygon.y = bounds.y;
        polygon.w = bounds.width;
        polygon.h = bounds.height;
        
        // Preguntar tipo de elemento
        const elementType = promptElementType();
        if (elementType) {
            // Añadir a la configuración
            addShapeToConfig(polygon, elementType);
        }
        
        drawingState.polygonPoints = [];
        engine.render();
    } else {
        drawPreviewPolygon();
    }
}

// Dibujar vista previa de la forma actual
function drawPreview() {
    if (!drawingState.currentElement) return;
    
    ctx.save();
    
    ctx.fillStyle = drawingState.currentElement.style.fill;
    ctx.strokeStyle = drawingState.currentElement.style.border;
    ctx.lineWidth = 2;
    
    if (drawingState.currentElement.type === 'rectangle') {
        ctx.fillRect(
            drawingState.currentElement.x, 
            drawingState.currentElement.y, 
            drawingState.currentElement.w, 
            drawingState.currentElement.h
        );
        ctx.strokeRect(
            drawingState.currentElement.x, 
            drawingState.currentElement.y, 
            drawingState.currentElement.w, 
            drawingState.currentElement.h
        );
    } else if (drawingState.currentElement.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(
            drawingState.currentElement.x + drawingState.currentElement.w/2,
            drawingState.currentElement.y + drawingState.currentElement.h/2,
            Math.abs(drawingState.currentElement.w)/2,
            Math.abs(drawingState.currentElement.h)/2,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
    }
    
    ctx.restore();
}

// Dibujar vista previa del polígono
function drawPreviewPolygon() {
    if (drawingState.polygonPoints.length < 2) return;
    
    ctx.save();
    
    ctx.strokeStyle = drawingState.shapeProps.border;
    ctx.fillStyle = drawingState.shapeProps.fill;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(drawingState.polygonPoints[0].x, drawingState.polygonPoints[0].y);
    
    for (let i = 1; i < drawingState.polygonPoints.length; i++) {
        ctx.lineTo(drawingState.polygonPoints[i].x, drawingState.polygonPoints[i].y);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Dibujar puntos de control
    drawingState.polygonPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
    });
    
    ctx.restore();
}

// Encontrar elemento en una posición
function findElementAtPosition(x, y) {
    for (let i = pmtConfig.dynodes.length - 1; i >= 0; i--) {
        const element = pmtConfig.dynodes[i];
        
        if (isPointInShape(element.shape, x, y)) {
            return element.shape;
        }
    }
    
    // Verificar otros elementos (fotocátodo, acelerador, etc.)
    const elements = ['photocathode', 'accelerator', 'grid', 'anode'];
    for (const elementType of elements) {
        if (pmtConfig[elementType] && pmtConfig[elementType].shape) {
            if (isPointInShape(pmtConfig[elementType].shape, x, y)) {
                return pmtConfig[elementType].shape;
            }
        }
    }
    
    return null;
}

// Verificar si un punto está dentro de una forma
function isPointInShape(shape, x, y) {
    if (!shape) return false;
    
    if (shape.type === 'rectangle') {
        return x >= shape.x && x <= shape.x + shape.w &&
               y >= shape.y && y <= shape.y + shape.h;
    } else if (shape.type === 'ellipse') {
        const cx = shape.x + shape.w/2;
        const cy = shape.y + shape.h/2;
        const rx = Math.abs(shape.w)/2;
        const ry = Math.abs(shape.h)/2;
        
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        
        return (dx*dx + dy*dy) <= 1;
    } else if (shape.type === 'polygon' && shape.points) {
        return pointInPolygon(x, y, shape.points);
    }
    
    return false;
}

// Point-in-polygon verificación
function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        
        const intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
        if (intersect) inside = !inside;
    }
    return inside;
}

// Normalizar forma (corregir dimensiones negativas)
function normalizeShape(shape) {
    if (shape.w < 0) {
        shape.x += shape.w;
        shape.w = Math.abs(shape.w);
    }
    
    if (shape.h < 0) {
        shape.y += shape.h;
        shape.h = Math.abs(shape.h);
    }
}

// Calcular límites de un polígono
function calculatePolygonBounds(points) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    });
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Preguntar por el tipo de elemento
function promptElementType() {
    const options = [
        { value: 'photocathode', label: 'Fotocátodo' },
        { value: 'dynode', label: 'Dinodo' },
        { value: 'accelerator', label: 'Acelerador' },
        { value: 'grid', label: 'Grid' },
        { value: 'anode', label: 'Ánodo' }
    ];
    
    let html = '<div style="padding:10px">';
    html += '<p>¿Qué tipo de elemento deseas crear?</p>';
    html += '<select id="element-type-select">';
    options.forEach(opt => {
        html += `<option value="${opt.value}">${opt.label}</option>`;
    });
    html += '</select>';
    html += '</div>';
    
    const dialog = document.createElement('div');
    dialog.innerHTML = html;
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    dialog.style.zIndex = 1000;
    
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = 0;
    backdrop.style.left = 0;
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
    backdrop.style.zIndex = 999;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    return new Promise(resolve => {
        const buttons = document.createElement('div');
        buttons.style.marginTop = '10px';
        buttons.style.textAlign = 'right';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.marginRight = '10px';
        cancelBtn.onclick = () => {
            document.body.removeChild(dialog);
            document.body.removeChild(backdrop);
            resolve(null);
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar';
        confirmBtn.onclick = () => {
            const select = document.getElementById('element-type-select');
            const value = select.value;
            document.body.removeChild(dialog);
            document.body.removeChild(backdrop);
            resolve(value);
        };
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        dialog.appendChild(buttons);
        
        // Cancelar con Escape
        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.body.removeChild(backdrop);
                document.removeEventListener('keydown', handler);
                resolve(null);
            }
        });
    });
}

// Función para aceptar el elemento dibujado actualmente
// Esta función es llamada por el validador para probar la creación de elementos
window.acceptDrawnElement = function() {
    if (!drawingState.currentElement || !drawingState.currentTool) {
        console.warn('No hay un elemento siendo dibujado actualmente');
        return false;
    }
    
    // Normalizar dimensiones del elemento actual
    normalizeShape(drawingState.currentElement);
    
    // Por defecto, crear como el tipo seleccionado (o ánodo si no hay selección)
    const elementType = drawingState.currentElement.type || 'anode';
    
    // Añadir a la configuración
    addShapeToConfig(drawingState.currentElement, elementType);
    
    // Limpiar el estado actual
    drawingState.currentElement = null;
    drawingState.isDrawing = false;
    
    // Actualizar canvas
    engine.render();
    
    console.log(`Elemento ${elementType} aceptado y añadido a la configuración`);
    return true;
};

// Añadir forma a la configuración
function addShapeToConfig(shape, elementType) {
    if (elementType === 'dynode') {
        // Añadir dinodo
        const index = pmtConfig.dynodes.length;
        pmtConfig.dynodes.push({
            id: index,
            type: 'dynode',
            voltage: -100 * (index + 1), // Voltaje por defecto
            position: { x: shape.x, y: shape.y },
            shape: shape
        });
        updateDynodeTable();
    } else {
        // Actualizar elemento principal
        pmtConfig[elementType].shape = shape;
        pmtConfig[elementType].position = { x: shape.x, y: shape.y };
    }
    
    engine.render();
}

// Cambiar estilo del cursor según la herramienta
function setCursorStyle(tool) {
    switch(tool) {
        case 'rectangle':
        case 'ellipse':
        case 'polygon':
            canvas.style.cursor = 'crosshair';
            break;
        case 'select':
            canvas.style.cursor = 'pointer';
            break;
        default:
            canvas.style.cursor = 'default';
    }
}