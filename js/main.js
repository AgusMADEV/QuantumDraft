// ===================================================================
// INICIALIZACIÓN DE LA APLICACIÓN - Simulador Fotomultiplicador 2D
// ===================================================================

// Elementos globales
let canvas, ctx;
var engine;
// Configuración PMT (solo si no existe)
/* Se elimina la redefinición de pmtConfig en main.js, se utiliza la configuración proveniente de config.js */

// Estado de la simulación
simulationState = {
    running: false,
    time: 0,
    speed: 1.0,
    photons: [],
    statistics: {
        totalPhotons: 0,
        detectedPhotons: 0,
        quantumEfficiency: 0,
        averageGain: 0,
        transitTime: 0
    },
    startTime: 0
};

// Constantes

// Constantes físicas
/* comment out redeclaration of PHYSICS, use global from config.js
const PHYSICS = {
    electronMass: 9.1093837e-31, // kg
    electronCharge: -1.602176634e-19, // C
    speedOfLight: 299792458, // m/s
    planckConstant: 6.62607015e-34, // J·s
    eVtoJoules: 1.602176634e-19, // 1 eV = 1.602176634×10^-19 J
    pixelToMeter: 1e-3, // 1 pixel = 1 mm
    Wpk: 1.5, // eV - Función trabajo fotocátodo
    Wsec: 1.0, // eV - Energía de electrones secundarios
};
*/

// Inicializar aplicación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    setupEventListeners();
    initSimulation();  // Crear engine antes de configurar elementos
    initializeMainElements();
    generateDefaultDynodes();
    updateDynodeTable();
    initializeDrawingTools();
    if (engine && typeof engine.render === 'function') engine.render();
});

// Ajustar canvas al redimensionar ventana
window.addEventListener('resize', setupCanvas);

// Inicializar canvas
function setupCanvas() {
    canvas = document.getElementById('pmt-canvas');
    ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

// Inicializar simulación
function initSimulation() {
    // Crear motor de simulación
    engine = {
        start: function() {
            if (!simulationState.running) {
                simulationState.running = true;
                simulationState.startTime = performance.now();
                requestAnimationFrame(gameLoop);
                
                // Notificar inicio de la simulación
                document.getElementById('status-indicator').textContent = 'Ejecutando';
                document.getElementById('status-indicator').className = 'status running';
            }
        },
        pause: function() {
            simulationState.running = false;
            
            // Notificar pausa de la simulación
            document.getElementById('status-indicator').textContent = 'Pausado';
            document.getElementById('status-indicator').className = 'status paused';
        },
        stop: function() {
            simulationState.running = false;
            simulationState.time = 0;
            simulationState.photons.forEach(p => {
                if (p.isActive) photonPool.release(p);
            });
            simulationState.photons = [];
            updateUIStatistics();
            this.render();
            
            // Notificar detención de la simulación
            document.getElementById('status-indicator').textContent = 'Detenido';
            document.getElementById('status-indicator').className = 'status stopped';
        },
        render: function() {
            // Limpiar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar elementos
            drawElements();
            
            // Dibujar campo eléctrico si está activado
            ElectricFieldCalculator.drawField(ctx);
            
            // Dibujar partículas activas
            const activePhotons = simulationState.photons.filter(p => p.isActive);
            console.log(`Renderizando ${activePhotons.length} fotones activos`);
            
            activePhotons.forEach(p => {
                try {
                    Photon.draw.call(p, ctx);
                } catch (error) {
                    console.error('Error al dibujar fotón:', error);
                }
            });
            
            // Dibujar estadísticas en pantalla
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText(`Fotones activos: ${activePhotons.length}`, 10, 20);
            ctx.fillText(`Tiempo: ${simulationState.time.toFixed(2)}s`, 10, 40);
            
            // Actualizar contador de partículas activas en la UI
            document.getElementById('active-photons').textContent = activePhotons.length;
        },
        generatePhotons: function(count) {
            // Verificar que photonPool esté disponible
            if (!window.photonPool) {
                console.error('Error: photonPool no está disponible');
                return;
            }
            
            // Ubicación del fotocátodo
            const photocathode = pmtConfig.photocathode;
            if (!photocathode.position || !photocathode.shape) {
                console.error('Error: El fotocátodo no está posicionado correctamente');
                console.log('Posición del fotocátodo:', photocathode.position);
                console.log('Forma del fotocátodo:', photocathode.shape);
                return;
            }
            
            console.log(`Generando ${count} fotones desde el fotocátodo:`, photocathode);
            
            // Generar fotones en la parte derecha del fotocátodo (para que no estén dentro)
            for (let i = 0; i < count; i++) {
                // Posición específica para evitar colisiones: a la derecha del fotocátodo
                const x = photocathode.position.x + photocathode.shape.w + 5; // 5px a la derecha del fotocátodo
                const y = photocathode.position.y + Math.random() * photocathode.shape.h;
                
                // Crear fotón
                const photon = window.photonPool.get();
                
                // Inicializar propiedades
                photon.position.x = x;
                photon.position.y = y;
                photon.isActive = true;
                photon.lifetime = 0;
                photon.trail = [];
                
                // Velocidad inicial (simplificación física: hacia la derecha)
                const initialEnergy = 1.5; // eV
                // Calcular velocidad en píxeles por segundo
                photon.velocity.x = 100; // Valor fijo para pruebas, simplifica el problema
                photon.velocity.y = (Math.random() - 0.5) * 20; // Pequeña dispersión
                
                // Asignar ID único para seguimiento
                photon.id = simulationState.statistics.totalPhotons + i;
                photon.color = '#2196F3'; // Color azul para fotones iniciales
                
                // Añadir a lista de partículas activas
                simulationState.photons.push(photon);
                
                console.log(`Fotón #${photon.id} creado en posición (${x}, ${y}) con velocidad (${photon.velocity.x}, ${photon.velocity.y})`);
            }
            
            // Actualizar estadística
            simulationState.statistics.totalPhotons += count;
            
            // Actualizar número de fotones activos en la UI
            const activeElem = document.getElementById('active-photons');
            if (activeElem) {
                activeElem.textContent = simulationState.photons.filter(p => p.isActive).length;
            }
        },
        update: function(dt) {
            // Solo actualizar si hay partículas activas
            const activePhotons = simulationState.photons.filter(p => p.isActive);
            if (activePhotons.length === 0 && simulationState.photons.length > 0) {
                // Si no hay partículas activas pero había antes, actualizar estadísticas finales
                updateUIStatistics();
                return;
            }
            
            // Actualizar partículas activas con el delta time ajustado por velocidad de simulación
            const adjustedDt = dt * simulationState.speed;
            simulationState.photons.forEach(p => {
                if (p.isActive) {
                    // Usar método de update de la clase Photon, pasando también referencia a config
                    Photon.update(p, adjustedDt);
                }
            });
            
            // Actualizar tiempo de simulación
            simulationState.time += adjustedDt;
            
            // Actualizar estadísticas cada 0.3 segundos (más frecuente para mejor respuesta)
            const elapsedSecs = (performance.now() - simulationState.startTime) / 1000;
            if (elapsedSecs > 0.3) {
                updateUIStatistics();
                simulationState.startTime = performance.now();
            }
            
            // Limpieza de partículas inactivas cuando hay demasiadas (para mejorar rendimiento)
            if (simulationState.photons.length > MAX_PARTICLES) {
                // Conservar partículas activas y algunas inactivas recientes para estadísticas
                const inactivePhotons = simulationState.photons.filter(p => !p.isActive);
                if (inactivePhotons.length > MAX_PARTICLES * 0.5) {
                    // Eliminar la mitad más antigua de las partículas inactivas
                    simulationState.photons = [
                        ...activePhotons,
                        ...inactivePhotons.slice(-Math.floor(MAX_PARTICLES * 0.2))
                    ];
                }
            }
        }
    };
    
    // Renderización inicial
    engine.render();
}

// Loop principal
function gameLoop(timestamp) {
    if (simulationState.running) {
        // Calcular delta time (en segundos)
        const now = timestamp;
        const dt = Math.min(0.016, (now - (simulationState.lastTimestamp || now)) / 1000);
        simulationState.lastTimestamp = now;
        
        // Actualizar y renderizar
        engine.update(dt);
        engine.render();
        
        // Continuar loop
        requestAnimationFrame(gameLoop);
    }
}

// Generar configuración de dinodos por defecto
function generateDefaultDynodes() {
    const canvas = document.getElementById('pmt-canvas');
    const count = parseInt(document.getElementById('dynode-count').value) || 8;
    
    // Limpiar dinodos existentes
    pmtConfig.dynodes = [];
    
    // Validar número (4-20)
    const dynodeCount = Math.min(20, Math.max(4, count));
    
    // Posiciones iniciales
    const startX = canvas.width * 0.1;
    const endX = canvas.width * 0.9;
    const midY = canvas.height / 2;
    const height = canvas.height * 0.5;
    
    // Tamaño de dinodos
    const width = 5;
    const dynodeHeight = height * 0.7;
    
    // Calcular voltajes distribuidos
    const anodeVoltage = pmtConfig.anode.voltage || 1000;
    const initialVoltage = pmtConfig.photocathode.voltage || 0;
    const voltageDrop = anodeVoltage - initialVoltage;
    const deltaVoltage = voltageDrop / (dynodeCount + 1);
    
    // Generar dinodos
    for (let i = 0; i < dynodeCount; i++) {
        const x = startX + (endX - startX) * (i + 1) / (dynodeCount + 1);
        const y = midY - dynodeHeight / 2 + (i % 2 === 0 ? -20 : 20);
        const voltage = initialVoltage + deltaVoltage * (i + 1);
        
        pmtConfig.dynodes.push({
            type: 'dynode',
            voltage: voltage,
            position: { x, y },
            shape: { type: 'rectangle', x, y, w: width, h: dynodeHeight },
            hit: false
        });
    }
    
    // Posicionar también el fotocátodo y ánodo
    pmtConfig.photocathode.position = { x: startX - width * 2, y: midY - height / 2 };
    pmtConfig.photocathode.shape = { 
        type: 'rectangle', 
        x: pmtConfig.photocathode.position.x, 
        y: pmtConfig.photocathode.position.y, 
        w: width, 
        h: height 
    };
    
    pmtConfig.anode.position = { x: endX + width, y: midY - height / 2 };
    pmtConfig.anode.shape = { 
        type: 'rectangle', 
        x: pmtConfig.anode.position.x, 
        y: pmtConfig.anode.position.y, 
        w: width, 
        h: height 
    };
    
    // Actualizar tabla y canvas
    updateDynodeTable();
    engine.render();
}

// Inicializar elementos principales del PMT
function initializeMainElements() {
    const canvas = document.getElementById('pmt-canvas');
    if (!canvas) return;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Posiciones iniciales
    const startX = canvasWidth * 0.1;
    const endX = canvasWidth * 0.9;
    const midY = canvasHeight / 2;
    const height = canvasHeight * 0.5;
    const width = 5;
    
    // Inicializar fotocátodo (izquierda)
    pmtConfig.photocathode.position = { x: startX - width * 2, y: midY - height / 2 };
    pmtConfig.photocathode.shape = {
        type: 'rectangle',
        x: pmtConfig.photocathode.position.x,
        y: pmtConfig.photocathode.position.y,
        w: width,
        h: height
    };
    
    // Inicializar ánodo (derecha)
    pmtConfig.anode.position = { x: endX + width, y: midY - height / 2 };
    pmtConfig.anode.shape = {
        type: 'rectangle',
        x: pmtConfig.anode.position.x,
        y: pmtConfig.anode.position.y,
        w: width,
        h: height
    };
    
    // Inicializar acelerador (opcional, entre fotocátodo y primer dinodo)
    pmtConfig.accelerator.position = { x: startX + width * 2, y: midY - height / 2 };
    pmtConfig.accelerator.shape = {
        type: 'rectangle',
        x: pmtConfig.accelerator.position.x,
        y: pmtConfig.accelerator.position.y,
        w: width,
        h: height * 0.7
    };
    
    // Inicializar grid (opcional, entre último dinodo y ánodo)
    pmtConfig.grid.position = { x: endX - width * 2, y: midY - height / 2 };
    pmtConfig.grid.shape = {
        type: 'rectangle',
        x: pmtConfig.grid.position.x,
        y: pmtConfig.grid.position.y,
        w: width,
        h: height * 0.7
    };
    
    // Sincronizar checkboxes
    document.getElementById('accelerator-enabled').checked = pmtConfig.accelerator.enabled;
    document.getElementById('grid-enabled').checked = pmtConfig.grid.enabled;
}

// Actualizar elemento en configuración
function updateElementConfiguration(element) {
    const ele = pmtConfig[element];
    if (!ele) return;
    
    // Si el elemento no está habilitado, omitir actualización
    if (ele.optional && !ele.enabled) return;
    
    // Ajustar propiedades gráficas si es necesario
    if (ele.position && ele.shape) {
        // Actualizar visualización si fuera necesario
    }
    
    // Renderizar cambio
    engine.render();
}

// Dibujar elementos del PMT
function drawElements() {
    // Dibujar elementos principales
    ['photocathode', 'accelerator', 'grid', 'anode'].forEach(elementName => {
        const element = pmtConfig[elementName];
        if (element && (element.required || element.enabled) && element.shape) {
            drawElement(element);
        }
    });
    
    // Dibujar dinodos
    pmtConfig.dynodes.forEach(dynode => {
        drawElement(dynode);
    });
}

// Dibujar un elemento individual
function drawElement(element) {
    if (!element.shape) return;
    
    // Estilo base
    ctx.fillStyle = element.color || '#cccccc';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    // Efectos visuales de impacto
    if (element.hit) {
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#ffffff';
    }
    
    // Dibujar según tipo de forma
    if (element.shape.type === 'rectangle') {
        ctx.fillRect(element.shape.x, element.shape.y, element.shape.w, element.shape.h);
        ctx.strokeRect(element.shape.x, element.shape.y, element.shape.w, element.shape.h);
    } else if (element.shape.type === 'ellipse') {
        const rx = element.shape.w / 2;
        const ry = element.shape.h / 2;
        const cx = element.shape.x + rx;
        const cy = element.shape.y + ry;
        
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (element.shape.type === 'polygon' && element.shape.points) {
        ctx.beginPath();
        ctx.moveTo(element.shape.points[0].x, element.shape.points[0].y);
        
        for (let i = 1; i < element.shape.points.length; i++) {
            ctx.lineTo(element.shape.points[i].x, element.shape.points[i].y);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    // Visualizar voltaje si está especificado
    if (typeof element.voltage === 'number') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(
            `${element.voltage}V`, 
            element.shape.x + (element.shape.w || 0) + 5, 
            element.shape.y + 10
        );
    }
}

// Actualizar estadísticas en la UI
function updateUIStatistics() {
    // Calcular estadísticas
    const totalPhotons = simulationState.statistics.totalPhotons;
    const detectedPhotons = simulationState.statistics.detectedPhotons;
    
    // Eficiencia cuántica
    const qe = totalPhotons > 0 ? (detectedPhotons / totalPhotons) * 100 : 0;
    
    // Ganancia total (multiplicación de todas las ganancias)
    let totalGain = 1;
    const dynodes = pmtConfig.dynodes.filter(d => d.type === 'dynode');
    
    // Calcular ganancia solo para dinodos reales (no elementos principales)
    dynodes.forEach((dynode, index) => {
        // Usar el voltage del dinodo anterior para calculos más precisos
        const prevVoltage = index > 0 ? dynodes[index-1].voltage : pmtConfig.photocathode.voltage;
        
        // Para mayor precisión, considerar la diferencia de voltaje real
        const voltageDiff = Math.abs(dynode.voltage - prevVoltage);
        
        // Obtener ganancia según el modelo seleccionado
        let gain = 1.0;
        
        if (pmtConfig.amplificationModel === 'simple') {
            const { r, beta } = pmtConfig.simpleParams;
            gain = r * Math.pow(voltageDiff, beta);
        } else {
            // Modelo avanzado, usar los parámetros configurados
            const { sigma_E, E_max, sigma_max, s, alpha, delta_0, E_0, theta_m } = pmtConfig.advancedParams;
            
            // Implementar cálculo según paper
            const x = voltageDiff / E_0;
            gain = delta_0 * x * Math.exp(1 - x);
            gain *= (1 + alpha * Math.pow(index, 0.5));
        }
        
        // Aplicar ganancia a la multiplicación total
        totalGain *= Math.max(1.0, gain);
        
        // Mostrar ganancia actual de cada dinodo (para debugging)
        if (document.getElementById(`gain-${index}`)) {
            document.getElementById(`gain-${index}`).textContent = Math.max(1.0, gain).toFixed(2);
        }
    });
    
    // Tiempo de tránsito promedio (considerar solo partículas activas)
    const activePhotons = simulationState.photons.filter(p => p.isActive);
    const avgTransitTime = activePhotons.length > 0 ? 
        activePhotons.reduce((sum, p) => sum + p.lifetime, 0) / activePhotons.length * 1e9 : 0; // en nanosegundos
    
    // Contar partículas activas
    const activeParticles = simulationState.photons.filter(p => p.isActive).length;
    
    // Actualizar estadísticas globales
    simulationState.statistics.quantumEfficiency = qe;
    simulationState.statistics.averageGain = totalGain;
    simulationState.statistics.transitTime = avgTransitTime;
    simulationState.statistics.activeParticles = activeParticles;
    
    // Actualizar interfaz
    document.getElementById('simulation-time').textContent = simulationState.time.toFixed(2) + 's';
    document.getElementById('total-gain').textContent = totalGain.toFixed(2);
    document.getElementById('detected-photons').textContent = detectedPhotons;
    document.getElementById('quantum-efficiency').textContent = qe.toFixed(2) + '%';
    document.getElementById('average-gain').textContent = totalGain.toFixed(2);
    document.getElementById('transit-time').textContent = avgTransitTime.toFixed(2) + ' ns';
    document.getElementById('active-photons').textContent = activeParticles;
    
    // Actualizar visualizaciones gráficas si existen
    if (window.updateStatisticsGraph) {
        window.updateStatisticsGraph(simulationState.statistics);
    }
}