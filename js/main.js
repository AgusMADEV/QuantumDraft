// ===================================================================
// INICIALIZACIÓN DE LA APLICACIÓN - Simulador Fotomultiplicador 2D
// ===================================================================

// Elementos globales
let canvas, ctx;
var engine;

// Estado de la simulación
const simulationState = {
    running: false,
    paused: false,
    time: 0,
    speed: 1.0,
    photons: [],
    statistics: {
        totalPhotons: 0,
        detectedPhotons: 0,
        quantumEfficiency: 0,
        averageGain: 0,
        transitTime: 0,
        emittedPhotons: 0,
        averageEnergy: 0,
        averageVelocity: 0,
        maxGamma: 1.0
    },
    startTime: 0,
    showTrails: true,
    showField: false,
    lastFrameTime: 0,
    timeElapsed: 0,
    isTestEnvironment: (typeof window === 'undefined' || window.isTestEnvironment === true)
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
    // Verificar entorno de pruebas
    if (simulationState.isTestEnvironment) {
        console.log('Entorno de pruebas detectado - Inicialización mínima');
        return;
    }

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
window.addEventListener('resize', () => {
    if (!simulationState.isTestEnvironment) setupCanvas();
});

// Inicializar canvas
function setupCanvas() {
    // Si estamos en entorno de pruebas, usar canvas simulado
    if (simulationState.isTestEnvironment) {
        console.log("Entorno de pruebas: usando canvas simulado");
        
        // Intentar obtener el canvas mock del test-runner
        canvas = document.getElementById('simulation-canvas');
        
        if (!canvas) {
            // Crear un canvas real si no existe
            canvas = document.createElement('canvas');
            canvas.id = 'simulation-canvas';
        }
        
        // Verificar que el canvas tenga el método getContext
        if (typeof canvas.getContext === 'function') {
            try {
                ctx = canvas.getContext('2d');
            } catch (error) {
                console.warn('No se pudo obtener contexto 2D real, usando mock');
                ctx = createMockContext();
            }
        } else {
            console.log('Canvas no tiene getContext, usando contexto mock');
            ctx = createMockContext();
        }
        
        // Asignar dimensiones
        canvas.width = 800;
        canvas.height = 600;
        
        console.log(`Canvas simulado inicializado con dimensiones ${canvas.width}x${canvas.height}`);
        return;
    }
    
    // Funcionamiento normal (no en pruebas)
    canvas = document.getElementById('pmt-canvas');
    
    if (!canvas) {
        console.warn('Canvas no encontrado. La simulación no podrá renderizarse.');
        return;
    }
    
    try {
        ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('No se pudo obtener el contexto 2D del canvas');
            return;
        }
        
        // Ajustar tamaño del canvas
        canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
        canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 600;
        
        console.log(`Canvas inicializado con dimensiones ${canvas.width}x${canvas.height}`);
    } catch (error) {
        console.error('Error al inicializar el canvas:', error);
    }
}

// Función para crear contexto mock
function createMockContext() {
    return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fillText: () => {},
        strokeText: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        setTransform: () => {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        globalAlpha: 1,
        lineCap: 'butt',
        lineJoin: 'miter'
    };
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

// Main.js - Punto de entrada principal
// Integración de todos los componentes del simulador

// Actualizar propiedades adicionales del estado de simulación global
Object.assign(simulationState, {
    simSpeed: 1.0,
    statistics: {
        ...simulationState.statistics,
        emittedPhotons: 0,
        averageEnergy: 0,
        averageVelocity: 0,
        maxGamma: 1.0
    }
});

// Inicializar aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('QuantumDraft - Simulador Fotomultiplicador - Iniciando...');
    
    // Inicializar subsistemas
    initConfig();
    initUI();
    initCanvas();
    initSimulationControls();
    
    // Crear configuración inicial
    createDefaultConfiguration();
    
    // Generar tabla inicial de dinodos
    updateDynodeTable();
    
    console.log('QuantumDraft iniciado correctamente.');
});

// Función principal de actualización (loop de simulación)
function updateSimulation(timestamp) {
    if (!simulationState.running) return;
    
    // Calcular delta time para física independiente de FPS
    if (!simulationState.lastFrameTime) simulationState.lastFrameTime = timestamp;
    let dt = (timestamp - simulationState.lastFrameTime) / 1000; // Delta time en segundos
    simulationState.lastFrameTime = timestamp;
    
    // Aplicar factor de velocidad de simulación
    dt *= simulationState.simSpeed;
    
    // Actualizar tiempo total de simulación
    simulationState.timeElapsed += dt;
    
    // Límite para physics step (evitar saltos por lag)
    const maxPhysicsStep = 0.05; // 50ms máximo
    dt = Math.min(dt, maxPhysicsStep);
    
    // Actualizar cada partícula activa
    let activeCount = 0;
    
    for (const photon of simulationState.photons) {
        if (!photon.isActive) continue;
        
        // Actualizar posición y física
        // IMPORTANTE: Uso del algoritmo Boris Leapfrog en lugar de la actualización simple
        try {
            // Calcular campo eléctrico en la posición actual
            const electricField = ElectricFieldCalculator.getFieldAt(
                photon.position.x, 
                photon.position.y
            );
            
            // Obtener campo magnético si está configurado
            const magneticField = pmtConfig.magneticField || { Bx: 0, By: 0, Bz: 0 };
            
            // Usar el algoritmo Boris para actualización física
            borisUpdate(photon, dt, electricField, magneticField);
            
            // Añadir punto al trail si está activado
            if (simulationState.showTrails) {
                if (photon.trail.length >= photon.trailMaxSize) {
                    photon.trail.shift(); // Eliminar punto más antiguo
                }
                photon.trail.push({ x: photon.position.x, y: photon.position.y });
            }
            
            // Comprobar colisiones
            checkCollisions(photon);
            
            // Verificar si está fuera del canvas
            const canvas = document.getElementById('pmt-canvas');
            if (canvas && (
                photon.position.x < -10 || 
                photon.position.x > canvas.width + 10 ||
                photon.position.y < -10 || 
                photon.position.y > canvas.height + 10
            )) {
                photon.isActive = false;
            }
            
            // Verificar tiempo máximo de vida
            photon.lifetime += dt;
            if (photon.lifetime > 5) { // 5 segundos máximo por partícula
                photon.isActive = false;
            }
            
            // Contar partículas activas
            if (photon.isActive) activeCount++;
            
        } catch (error) {
            console.error('Error en la actualización de partícula:', error);
            photon.isActive = false;
        }
    }
    
    // Actualizar estadísticas y UI
    updateSimulationStats();
    
    // Actualizar contador de fotones activos
    document.getElementById('active-photons').textContent = activeCount;
    
    // Actualizar tiempo de simulación
    document.getElementById('simulation-time').textContent = 
        simulationState.timeElapsed.toFixed(2) + 's';
    
    // Renderizar escena
    renderScene();
    
    // Continuar el loop si la simulación sigue activa
    if (simulationState.running && !simulationState.paused) {
        requestAnimationFrame(updateSimulation);
    }
}

// Actualizar estadísticas de simulación
function updateSimulationStats() {
    const stats = simulationState.statistics;
    
    // Actualizar estadísticas solo si hay partículas
    if (simulationState.photons.length > 0) {
        // Calcular energía y velocidad promedio de partículas activas
        let totalEnergy = 0;
        let totalVelocity = 0;
        let activeCount = 0;
        let totalGain = 0;
        
        for (const photon of simulationState.photons) {
            if (!photon.isActive) continue;
            
            // Sumar energías (ya en eV)
            totalEnergy += photon.energy;
            
            // Calcular velocidad total (magnitud)
            const velocity = Math.sqrt(
                photon.velocity.x * photon.velocity.x + 
                photon.velocity.y * photon.velocity.y
            );
            totalVelocity += velocity;
            
            // Sumar ganancia total
            totalGain += photon.amplification || 1;
            
            activeCount++;
        }
        
        // Actualizar promedios si hay partículas activas
        if (activeCount > 0) {
            stats.averageEnergy = totalEnergy / activeCount;
            stats.averageVelocity = totalVelocity / activeCount;
            stats.averageGain = totalGain / stats.emittedPhotons;
            
            // Calcular factor gamma máximo
            const c = PHYSICS.speedOfLight;
            const maxVelocity = stats.averageVelocity * 3; // Estimación conservadora
            stats.maxGamma = 1 / Math.sqrt(1 - Math.min(0.99, (maxVelocity*maxVelocity)/(c*c)));
        }
        
        // Calcular eficiencia cuántica (detectados / emitidos)
        if (stats.emittedPhotons > 0) {
            stats.quantumEfficiency = (stats.detectedPhotons / stats.emittedPhotons) * 100;
        }
        
        // Estimar tiempo de tránsito promedio basado en tiempo de simulación y partículas activas
        stats.transitTime = simulationState.timeElapsed * 0.7; // Simplificación temporal
    }
    
    // Actualizar UI con estadísticas
    document.getElementById('detected-photons').textContent = stats.detectedPhotons;
    document.getElementById('quantum-efficiency').textContent = stats.quantumEfficiency.toFixed(1) + '%';
    document.getElementById('average-gain').textContent = Math.floor(stats.averageGain);
    document.getElementById('transit-time').textContent = stats.transitTime.toFixed(2) + ' ns';
    document.getElementById('average-energy').textContent = stats.averageEnergy.toFixed(2) + ' eV';
    document.getElementById('average-velocity').textContent = (stats.averageVelocity / 1e6).toFixed(2) + ' Mm/s';
    document.getElementById('max-gamma').textContent = stats.maxGamma.toFixed(3);
    document.getElementById('total-gain').textContent = Math.floor(stats.averageGain * stats.detectedPhotons);
}

// Generar fotones desde el fotocátodo
function emitPhotonsFromCathode(count = 1) {
    if (!pmtConfig.photocathode || !pmtConfig.photocathode.shape) {
        console.error('No se puede emitir fotones: fotocátodo no definido');
        return 0;
    }
    
    // Limpiar fotones anteriores si es necesario
    if (!simulationState.running) {
        resetSimulation();
    }
    
    // Obtener forma del fotocátodo
    const shape = pmtConfig.photocathode.shape;
    
    // Para cada fotón a emitir
    for (let i = 0; i < count; i++) {
        // Generar posición aleatoria dentro del fotocátodo
        let x, y;
        
        // Según el tipo de forma
        if (shape.type === 'rectangle') {
            x = shape.x + Math.random() * shape.w;
            y = shape.y + Math.random() * shape.h;
        } else if (shape.type === 'ellipse') {
            // Generación uniforme dentro de elipse
            const rx = shape.w / 2;
            const ry = shape.h / 2;
            const cx = shape.x + rx;
            const cy = shape.y + ry;
            
            // Método de rechazo para distribución uniforme
            let inside = false;
            while (!inside) {
                x = cx + (Math.random() * 2 - 1) * rx;
                y = cy + (Math.random() * 2 - 1) * ry;
                
                // Verificar si está dentro
                const nx = (x - cx) / rx;
                const ny = (y - cy) / ry;
                inside = (nx*nx + ny*ny <= 1);
            }
        } else if (shape.type === 'polygon' && shape.points) {
            // Aproximación para polígono (simplificada)
            // Obtener el bounding box
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            for (const point of shape.points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
            
            // Método de rechazo
            let inside = false;
            while (!inside) {
                x = minX + Math.random() * (maxX - minX);
                y = minY + Math.random() * (maxY - minY);
                
                inside = isPointInPolygon({x, y}, shape.points);
            }
        } else {
            // Fallback a posición central
            console.warn('Forma de fotocátodo no soportada, usando posición central');
            x = pmtConfig.photocathode.position?.x || 100;
            y = pmtConfig.photocathode.position?.y || 100;
        }
        
        // Crear fotón desde el pool
        const photon = window.photonPool.get();
        if (!photon) continue;
        
        // Configurar fotón inicial
        photon.position = { x, y };
        photon.velocity = { x: 0, y: 0 }; // Sin velocidad inicial
        photon.energy = 1.5; // eV iniciales (ajustable)
        photon.trail = [];
        photon.lifetime = 0;
        photon.color = '#ffff00'; // Amarillo para fotones iniciales
        photon.amplification = 1;
        photon.hitCount = 0;
        
        // Añadir a la simulación
        simulationState.photons.push(photon);
        
        // Contar emisiones
        simulationState.statistics.emittedPhotons++;
    }
    
    return count;
}

// Iniciar simulación
function startSimulation() {
    if (simulationState.running && !simulationState.paused) return;
    
    if (simulationState.paused) {
        // Reanudar simulación pausada
        simulationState.paused = false;
        document.getElementById('status-indicator').textContent = 'Ejecutando';
        document.getElementById('status-indicator').className = 'status running';
        requestAnimationFrame(updateSimulation);
        return;
    }
    
    // Iniciar nueva simulación
    simulationState.running = true;
    simulationState.paused = false;
    simulationState.lastFrameTime = 0;
    
    // Emitir fotones iniciales según configuración
    const photonCount = document.getElementById('photon-count').value || 5;
    emitPhotonsFromCathode(parseInt(photonCount));
    
    // Actualizar UI
    document.getElementById('status-indicator').textContent = 'Ejecutando';
    document.getElementById('status-indicator').className = 'status running';
    
    // Iniciar loop de simulación
    requestAnimationFrame(updateSimulation);
}

// Pausar simulación
function pauseSimulation() {
    if (!simulationState.running) return;
    
    simulationState.paused = true;
    document.getElementById('status-indicator').textContent = 'Pausado';
    document.getElementById('status-indicator').className = 'status paused';
}

// Detener simulación
function stopSimulation() {
    simulationState.running = false;
    simulationState.paused = false;
    
    // Restablecer estadísticas
    resetSimulation();
    
    // Actualizar UI
    document.getElementById('status-indicator').textContent = 'Detenido';
    document.getElementById('status-indicator').className = 'status stopped';
    
    // Renderizar una vez más para limpiar el canvas
    renderScene();
}

// Resetear simulación
function resetSimulation() {
    // Liberar partículas
    for (const photon of simulationState.photons) {
        window.photonPool.release(photon);
    }
    simulationState.photons = [];
    
    // Restablecer tiempo y estadísticas
    simulationState.timeElapsed = 0;
    simulationState.lastFrameTime = 0;
    simulationState.statistics = {
        detectedPhotons: 0,
        emittedPhotons: 0,
        averageGain: 0,
        transitTime: 0,
        quantumEfficiency: 0,
        averageEnergy: 0,
        averageVelocity: 0,
        maxGamma: 1.0
    };
    
    // Actualizar UI
    updateSimulationStats();
    document.getElementById('active-photons').textContent = '0';
    document.getElementById('simulation-time').textContent = '0.00s';
    document.getElementById('total-gain').textContent = '0';
}

// Establecer velocidad de simulación
function setSimulationSpeed(speed) {
    simulationState.simSpeed = parseFloat(speed) || 1.0;
    document.getElementById('speed-value').textContent = simulationState.simSpeed.toFixed(1) + 'x';
}

// Alternar visualización de trazas
function toggleTrails(show) {
    simulationState.showTrails = show;
}

// Alternar visualización del campo eléctrico
function toggleElectricField(show) {
    simulationState.showField = show;
    window.ElectricFieldCalculator.showField = show;
}

// Inicializar controles de simulación
function initSimulationControls() {
    // Botones de control
    document.getElementById('play-simulation').addEventListener('click', startSimulation);
    document.getElementById('pause-simulation').addEventListener('click', pauseSimulation);
    document.getElementById('stop-simulation').addEventListener('click', stopSimulation);
    
    // Control de velocidad
    document.getElementById('sim-speed').addEventListener('input', function() {
        setSimulationSpeed(this.value);
    });
    
    // Checkbox trazas
    document.getElementById('show-trails').addEventListener('change', function() {
        toggleTrails(this.checked);
    });
    
    // Checkbox campo eléctrico
    document.getElementById('show-electric-field').addEventListener('change', function() {
        toggleElectricField(this.checked);
    });
}

// Configurar listeners de eventos
function setupEventListeners() {
    console.log('Configurando listeners de eventos...');
    
    // Para velocidad de simulación
    const speedSlider = document.getElementById('sim-speed');
    if (speedSlider && typeof speedSlider.addEventListener === 'function') {
        speedSlider.addEventListener('input', function() {
            simulationState.simSpeed = parseFloat(this.value);
            const speedValue = document.getElementById('speed-value');
            if (speedValue) {
                speedValue.textContent = simulationState.simSpeed.toFixed(1) + 'x';
            }
        });
    }
    
    // Para mostrar/ocultar trazas
    const trailsCheckbox = document.getElementById('show-trails');
    if (trailsCheckbox && typeof trailsCheckbox.addEventListener === 'function') {
        trailsCheckbox.addEventListener('change', function() {
            simulationState.showTrails = this.checked;
        });
    }
    
    // Para mostrar/ocultar campo eléctrico
    const fieldCheckbox = document.getElementById('show-electric-field');
    if (fieldCheckbox && typeof fieldCheckbox.addEventListener === 'function') {
        fieldCheckbox.addEventListener('change', function() {
            simulationState.showField = this.checked;
            if (window.ElectricFieldCalculator) {
                window.ElectricFieldCalculator.showField = this.checked;
            }
        });
    }
    
    // Botones de control
    const playBtn = document.getElementById('play-simulation');
    if (playBtn && typeof playBtn.addEventListener === 'function') {
        playBtn.addEventListener('click', startSimulation);
    }
    
    const pauseBtn = document.getElementById('pause-simulation');
    if (pauseBtn && typeof pauseBtn.addEventListener === 'function') {
        pauseBtn.addEventListener('click', pauseSimulation);
    }
    
    const stopBtn = document.getElementById('stop-simulation');
    if (stopBtn && typeof stopBtn.addEventListener === 'function') {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    // Cambio en el modelo de amplificación - verificar que existe y tiene addEventListener
    const modelTypeSelect = document.getElementById('model-type');
    if (modelTypeSelect && typeof modelTypeSelect.addEventListener === 'function') {
        modelTypeSelect.addEventListener('change', function() {
            const modelType = this.value;
            pmtConfig.amplificationModel = modelType;
            
            // Mostrar/ocultar controles relevantes
            const advancedControls = document.getElementById('advanced-model-controls');
            const simpleControls = document.getElementById('simple-model-controls');
            
            if (advancedControls && simpleControls) {
                if (modelType === 'advanced') {
                    advancedControls.style.display = 'block';
                    simpleControls.style.display = 'none';
                } else {
                    advancedControls.style.display = 'none';
                    simpleControls.style.display = 'block';
                }
            }
        });
    } else if (modelTypeSelect) {
        console.warn('modelTypeSelect encontrado pero no tiene addEventListener - probablemente es un mock');
    }
    
    console.log('Listeners de eventos configurados');
}

// Crear configuración por defecto
function createDefaultConfiguration() {
    console.log('Creando configuración por defecto...');
    
    // Si ya existe pmtConfig, usarlo como base
    if (typeof window.pmtConfig !== 'undefined') {
        console.log('pmtConfig ya existe, usando configuración existente');
        return;
    }
    
    // Crear configuración por defecto
    window.pmtConfig = {
        photocathode: {
            voltage: -50,
            position: { x: 50, y: 200 },
            shape: { type: 'rectangle', x: 50, y: 200, w: 5, h: 200 },
            color: '#4CAF50',
            required: true
        },
        anode: {
            voltage: 1000,
            position: { x: 700, y: 200 },
            shape: { type: 'rectangle', x: 700, y: 200, w: 5, h: 200 },
            color: '#F44336',
            required: true
        },
        accelerator: {
            enabled: false,
            voltage: -30,
            position: { x: 120, y: 220 },
            shape: { type: 'rectangle', x: 120, y: 220, w: 5, h: 160 },
            color: '#FF9800',
            optional: true
        },
        grid: {
            enabled: false,
            voltage: -20,
            position: { x: 630, y: 220 },
            shape: { type: 'rectangle', x: 630, y: 220, w: 5, h: 160 },
            color: '#9C27B0',
            optional: true
        },
        dynodes: [],
        amplificationModel: 'simple',
        simpleParams: {
            r: 0.2,
            beta: 0.55
        },
        advancedParams: {
            sigma_E: 2.5,
            E_max: 2000,
            sigma_max: 3.5,
            s: 0.35,
            alpha: 0.12,
            delta_0: 0.2,
            E_0: 150,
            theta_m: 1.2
        },
        magneticField: { Bx: 0, By: 0, Bz: 0 }
    };
    
    console.log('Configuración por defecto creada');
}

// Función auxiliar para crear pool de partículas
function createParticlePool(maxSize = 100) {
    const pool = [];
    const inUse = new Set();
    
    return {
        get: function() {
            // Buscar una partícula libre en el pool
            for (let i = 0; i < pool.length; i++) {
                if (!inUse.has(pool[i])) {
                    const particle = pool[i];
                    inUse.add(particle);
                    // Reinicializar propiedades
                    particle.isActive = true;
                    particle.position = { x: 0, y: 0 };
                    particle.velocity = { x: 0, y: 0 };
                    particle.acceleration = { x: 0, y: 0 };
                    particle.trail = [];
                    particle.lifetime = 0;
                    particle.energy = 1.0;
                    particle.amplification = 1;
                    particle.hitCount = 0;
                    return particle;
                }
            }
            
            // Si no hay partículas libres y no hemos alcanzado el máximo, crear una nueva
            if (pool.length < maxSize) {
                const newParticle = {
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 },
                    acceleration: { x: 0, y: 0 },
                    isActive: true,
                    trail: [],
                    lifetime: 0,
                    color: '#ffffff',
                    mass: 9.1093837e-31, // masa del electrón
                    charge: -1.602176634e-19, // carga del electrón
                    energy: 1.0,
                    amplification: 1,
                    hitCount: 0,
                    trailMaxSize: 50,
                    id: pool.length
                };
                
                pool.push(newParticle);
                inUse.add(newParticle);
                return newParticle;
            }
            
            // Pool lleno, no se puede crear más partículas
            console.warn('Pool de partículas lleno, no se puede crear nueva partícula');
            return null;
        },
        
        release: function(particle) {
            if (particle) {
                particle.isActive = false;
                inUse.delete(particle);
            }
        },
        
        getActiveCount: function() {
            return inUse.size;
        },
        
        getTotalCount: function() {
            return pool.length;
        }
    };
}

// Inicializar aplicación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar entorno de pruebas
    if (simulationState.isTestEnvironment) {
        console.log('Entorno de pruebas detectado - Inicialización mínima');
        return;
    }

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
window.addEventListener('resize', () => {
    if (!simulationState.isTestEnvironment) setupCanvas();
});

// Inicializar canvas
function setupCanvas() {
    // Si estamos en entorno de pruebas, usar canvas simulado
    if (simulationState.isTestEnvironment) {
        console.log("Entorno de pruebas: usando canvas simulado");
        
        // Intentar obtener el canvas mock del test-runner
        canvas = document.getElementById('simulation-canvas');
        
        if (!canvas) {
            // Crear un canvas real si no existe
            canvas = document.createElement('canvas');
            canvas.id = 'simulation-canvas';
        }
        
        // Verificar que el canvas tenga el método getContext
        if (typeof canvas.getContext === 'function') {
            try {
                ctx = canvas.getContext('2d');
            } catch (error) {
                console.warn('No se pudo obtener contexto 2D real, usando mock');
                ctx = createMockContext();
            }
        } else {
            console.log('Canvas no tiene getContext, usando contexto mock');
            ctx = createMockContext();
        }
        
        // Asignar dimensiones
        canvas.width = 800;
        canvas.height = 600;
        
        console.log(`Canvas simulado inicializado con dimensiones ${canvas.width}x${canvas.height}`);
        return;
    }
    
    // Funcionamiento normal (no en pruebas)
    canvas = document.getElementById('pmt-canvas');
    
    if (!canvas) {
        console.warn('Canvas no encontrado. La simulación no podrá renderizarse.');
        return;
    }
    
    try {
        ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.error('No se pudo obtener el contexto 2D del canvas');
            return;
        }
        
        // Ajustar tamaño del canvas
        canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
        canvas.height = canvas.parentElement ? canvas.parentElement.clientHeight : 600;
        
        console.log(`Canvas inicializado con dimensiones ${canvas.width}x${canvas.height}`);
    } catch (error) {
        console.error('Error al inicializar el canvas:', error);
    }
}

// Función para crear contexto mock
function createMockContext() {
    return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        fillText: () => {},
        strokeText: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        setTransform: () => {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        globalAlpha: 1,
        lineCap: 'butt',
        lineJoin: 'miter'
    };
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

// Main.js - Punto de entrada principal
// Integración de todos los componentes del simulador

// Actualizar propiedades adicionales del estado de simulación global
Object.assign(simulationState, {
    simSpeed: 1.0,
    statistics: {
        ...simulationState.statistics,
        emittedPhotons: 0,
        averageEnergy: 0,
        averageVelocity: 0,
        maxGamma: 1.0
    }
});

// Inicializar aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('QuantumDraft - Simulador Fotomultiplicador - Iniciando...');
    
    // Inicializar subsistemas
    initConfig();
    initUI();
    initCanvas();
    initSimulationControls();
    
    // Crear configuración inicial
    createDefaultConfiguration();
    
    // Generar tabla inicial de dinodos
    updateDynodeTable();
    
    console.log('QuantumDraft iniciado correctamente.');
});

// Función principal de actualización (loop de simulación)
function updateSimulation(timestamp) {
    if (!simulationState.running) return;
    
    // Calcular delta time para física independiente de FPS
    if (!simulationState.lastFrameTime) simulationState.lastFrameTime = timestamp;
    let dt = (timestamp - simulationState.lastFrameTime) / 1000; // Delta time en segundos
    simulationState.lastFrameTime = timestamp;
    
    // Aplicar factor de velocidad de simulación
    dt *= simulationState.simSpeed;
    
    // Actualizar tiempo total de simulación
    simulationState.timeElapsed += dt;
    
    // Límite para physics step (evitar saltos por lag)
    const maxPhysicsStep = 0.05; // 50ms máximo
    dt = Math.min(dt, maxPhysicsStep);
    
    // Actualizar cada partícula activa
    let activeCount = 0;
    
    for (const photon of simulationState.photons) {
        if (!photon.isActive) continue;
        
        // Actualizar posición y física
        // IMPORTANTE: Uso del algoritmo Boris Leapfrog en lugar de la actualización simple
        try {
            // Calcular campo eléctrico en la posición actual
            const electricField = ElectricFieldCalculator.getFieldAt(
                photon.position.x, 
                photon.position.y
            );
            
            // Obtener campo magnético si está configurado
            const magneticField = pmtConfig.magneticField || { Bx: 0, By: 0, Bz: 0 };
            
            // Usar el algoritmo Boris para actualización física
            borisUpdate(photon, dt, electricField, magneticField);
            
            // Añadir punto al trail si está activado
            if (simulationState.showTrails) {
                if (photon.trail.length >= photon.trailMaxSize) {
                    photon.trail.shift(); // Eliminar punto más antiguo
                }
                photon.trail.push({ x: photon.position.x, y: photon.position.y });
            }
            
            // Comprobar colisiones

            checkCollisions(photon);
            
            // Verificar si está fuera del canvas
            const canvas = document.getElementById('pmt-canvas');
            if (canvas && (
                photon.position.x < -10 || 
                photon.position.x > canvas.width + 10 ||
                photon.position.y < -10 || 
                photon.position.y > canvas.height + 10
            )) {
                photon.isActive = false;
            }
            
            // Verificar tiempo máximo de vida
            photon.lifetime += dt;
            if (photon.lifetime > 5) { // 5 segundos máximo por partícula
                photon.isActive = false;
            }
            
            // Contar partículas activas
            if (photon.isActive) activeCount++;
            
        } catch (error) {
            console.error('Error en la actualización de partícula:', error);
            photon.isActive = false;
        }
    }
    
    // Actualizar estadísticas y UI
    updateSimulationStats();
    
    // Actualizar contador de fotones activos
    document.getElementById('active-photons').textContent = activeCount;
    
    // Actualizar tiempo de simulación
    document.getElementById('simulation-time').textContent = 
        simulationState.timeElapsed.toFixed(2) + 's';
    
    // Renderizar escena
    renderScene();
    
    // Continuar el loop si la simulación sigue activa
    if (simulationState.running && !simulationState.paused) {
        requestAnimationFrame(updateSimulation);
    }
}

// Actualizar estadísticas de simulación
function updateSimulationStats() {
    const stats = simulationState.statistics;
    
    // Actualizar estadísticas solo si hay partículas
    if (simulationState.photons.length > 0) {
        // Calcular energía y velocidad promedio de partículas activas
        let totalEnergy = 0;
        let totalVelocity = 0;
        let activeCount = 0;
        let totalGain = 0;
        
        for (const photon of simulationState.photons) {
            if (!photon.isActive) continue;
            
            // Sumar energías (ya en eV)
            totalEnergy += photon.energy;
            
            // Calcular velocidad total (magnitud)
            const velocity = Math.sqrt(
                photon.velocity.x * photon.velocity.x + 
                photon.velocity.y * photon.velocity.y
            );
            totalVelocity += velocity;
            
            // Sumar ganancia total
            totalGain += photon.amplification || 1;
            
            activeCount++;
        }
        
        // Actualizar promedios si hay partículas activas
        if (activeCount > 0) {
            stats.averageEnergy = totalEnergy / activeCount;
            stats.averageVelocity = totalVelocity / activeCount;
            stats.averageGain = totalGain / stats.emittedPhotons;
            
            // Calcular factor gamma máximo
            const c = PHYSICS.speedOfLight;
            const maxVelocity = stats.averageVelocity * 3; // Estimación conservadora
            stats.maxGamma = 1 / Math.sqrt(1 - Math.min(0.99, (maxVelocity*maxVelocity)/(c*c)));
        }
        
        // Calcular eficiencia cuántica (detectados / emitidos)
        if (stats.emittedPhotons > 0) {
            stats.quantumEfficiency = (stats.detectedPhotons / stats.emittedPhotons) * 100;
        }
        
        // Estimar tiempo de tránsito promedio basado en tiempo de simulación y partículas activas
        stats.transitTime = simulationState.timeElapsed * 0.7; // Simplificación temporal
    }
    
    // Actualizar UI con estadísticas
    document.getElementById('detected-photons').textContent = stats.detectedPhotons;
    document.getElementById('quantum-efficiency').textContent = stats.quantumEfficiency.toFixed(1) + '%';
    document.getElementById('average-gain').textContent = Math.floor(stats.averageGain);
    document.getElementById('transit-time').textContent = stats.transitTime.toFixed(2) + ' ns';
    document.getElementById('average-energy').textContent = stats.averageEnergy.toFixed(2) + ' eV';
    document.getElementById('average-velocity').textContent = (stats.averageVelocity / 1e6).toFixed(2) + ' Mm/s';
    document.getElementById('max-gamma').textContent = stats.maxGamma.toFixed(3);
    document.getElementById('total-gain').textContent = Math.floor(stats.averageGain * stats.detectedPhotons);
}

// Generar fotones desde el fotocátodo
function emitPhotonsFromCathode(count = 1) {
    if (!pmtConfig.photocathode || !pmtConfig.photocathode.shape) {
        console.error('No se puede emitir fotones: fotocátodo no definido');
        return 0;
    }
    
    // Limpiar fotones anteriores si es necesario
    if (!simulationState.running) {
        resetSimulation();
    }
    
    // Obtener forma del fotocátodo
    const shape = pmtConfig.photocathode.shape;
    
    // Para cada fotón a emitir
    for (let i = 0; i < count; i++) {
        // Generar posición aleatoria dentro del fotocátodo
        let x, y;
        
        // Según el tipo de forma
        if (shape.type === 'rectangle') {
            x = shape.x + Math.random() * shape.w;
            y = shape.y + Math.random() * shape.h;
        } else if (shape.type === 'ellipse') {
            // Generación uniforme dentro de elipse
            const rx = shape.w / 2;
            const ry = shape.h / 2;
            const cx = shape.x + rx;
            const cy = shape.y + ry;
            
            // Método de rechazo para distribución uniforme
            let inside = false;
            while (!inside) {
                x = cx + (Math.random() * 2 - 1) * rx;
                y = cy + (Math.random() * 2 - 1) * ry;
                
                // Verificar si está dentro
                const nx = (x - cx) / rx;
                const ny = (y - cy) / ry;
                inside = (nx*nx + ny*ny <= 1);
            }
        } else if (shape.type === 'polygon' && shape.points) {
            // Aproximación para polígono (simplificada)
            // Obtener el bounding box
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            for (const point of shape.points) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            }
            
            // Método de rechazo
            let inside = false;
            while (!inside) {
                x = minX + Math.random() * (maxX - minX);
                y = minY + Math.random() * (maxY - minY);
                
                inside = isPointInPolygon({x, y}, shape.points);
            }
        } else {
            // Fallback a posición central
            console.warn('Forma de fotocátodo no soportada, usando posición central');
            x = pmtConfig.photocathode.position?.x || 100;
            y = pmtConfig.photocathode.position?.y || 100;
        }
        
        // Crear fotón desde el pool
        const photon = window.photonPool.get();
        if (!photon) continue;
        
        // Configurar fotón inicial
        photon.position = { x, y };
        photon.velocity = { x: 0, y: 0 }; // Sin velocidad inicial
        photon.energy = 1.5; // eV iniciales (ajustable)
        photon.trail = [];
        photon.lifetime = 0;
        photon.color = '#ffff00'; // Amarillo para fotones iniciales
        photon.amplification = 1;
        photon.hitCount = 0;
        
        // Añadir a la simulación
        simulationState.photons.push(photon);
        
        // Contar emisiones
        simulationState.statistics.emittedPhotons++;
    }
    
    return count;
}

// Iniciar simulación
function startSimulation() {
    if (simulationState.running && !simulationState.paused) return;
    
    if (simulationState.paused) {
        // Reanudar simulación pausada
        simulationState.paused = false;
        document.getElementById('status-indicator').textContent = 'Ejecutando';
        document.getElementById('status-indicator').className = 'status running';
        requestAnimationFrame(updateSimulation);
        return;
    }
    
    // Iniciar nueva simulación
    simulationState.running = true;
    simulationState.paused = false;
    simulationState.lastFrameTime = 0;
    
    // Emitir fotones iniciales según configuración
    const photonCount = document.getElementById('photon-count').value || 5;
    emitPhotonsFromCathode(parseInt(photonCount));
    
    // Actualizar UI
    document.getElementById('status-indicator').textContent = 'Ejecutando';
    document.getElementById('status-indicator').className = 'status running';
    
    // Iniciar loop de simulación
    requestAnimationFrame(updateSimulation);
}

// Pausar simulación
function pauseSimulation() {
    if (!simulationState.running) return;
    
    simulationState.paused = true;
    document.getElementById('status-indicator').textContent = 'Pausado';
    document.getElementById('status-indicator').className = 'status paused';
}

// Detener simulación
function stopSimulation() {
    simulationState.running = false;
    simulationState.paused = false;
    
    // Restablecer estadísticas
    resetSimulation();
    
    // Actualizar UI
    document.getElementById('status-indicator').textContent = 'Detenido';
    document.getElementById('status-indicator').className = 'status stopped';
    
    // Renderizar una vez más para limpiar el canvas
    renderScene();
}

// Resetear simulación
function resetSimulation() {
    // Liberar partículas
    for (const photon of simulationState.photons) {
        window.photonPool.release(photon);
    }
    simulationState.photons = [];
    
    // Restablecer tiempo y estadísticas
    simulationState.timeElapsed = 0;
    simulationState.lastFrameTime = 0;
    simulationState.statistics = {
        detectedPhotons: 0,
        emittedPhotons: 0,
        averageGain: 0,
        transitTime: 0,
        quantumEfficiency: 0,
        averageEnergy: 0,
        averageVelocity: 0,
        maxGamma: 1.0
    };
    
    // Actualizar UI
    updateSimulationStats();
    document.getElementById('active-photons').textContent = '0';
    document.getElementById('simulation-time').textContent = '0.00s';
    document.getElementById('total-gain').textContent = '0';
}

// Establecer velocidad de simulación
function setSimulationSpeed(speed) {
    simulationState.simSpeed = parseFloat(speed) || 1.0;
    document.getElementById('speed-value').textContent = simulationState.simSpeed.toFixed(1) + 'x';
}

// Alternar visualización de trazas
function toggleTrails(show) {
    simulationState.showTrails = show;
}

// Alternar visualización del campo eléctrico
function toggleElectricField(show) {
    simulationState.showField = show;
    window.ElectricFieldCalculator.showField = show;
}

// Inicializar controles de simulación
function initSimulationControls() {
    // Botones de control
    document.getElementById('play-simulation').addEventListener('click', startSimulation);
    document.getElementById('pause-simulation').addEventListener('click', pauseSimulation);
    document.getElementById('stop-simulation').addEventListener('click', stopSimulation);
    
    // Control de velocidad
    document.getElementById('sim-speed').addEventListener('input', function() {
        setSimulationSpeed(this.value);
    });
    
    // Checkbox trazas
    document.getElementById('show-trails').addEventListener('change', function() {
        toggleTrails(this.checked);
    });
    
    // Checkbox campo eléctrico
    document.getElementById('show-electric-field').addEventListener('change', function() {
        toggleElectricField(this.checked);
    });
}

// Configurar listeners de eventos
function setupEventListeners() {
    console.log('Configurando listeners de eventos...');
    
    // Para velocidad de simulación
    const speedSlider = document.getElementById('sim-speed');
    if (speedSlider && typeof speedSlider.addEventListener === 'function') {
        speedSlider.addEventListener('input', function() {
            simulationState.simSpeed = parseFloat(this.value);
            const speedValue = document.getElementById('speed-value');
            if (speedValue) {
                speedValue.textContent = simulationState.simSpeed.toFixed(1) + 'x';
            }
        });
    }
    
    // Para mostrar/ocultar trazas
    const trailsCheckbox = document.getElementById('show-trails');
    if (trailsCheckbox && typeof trailsCheckbox.addEventListener === 'function') {
        trailsCheckbox.addEventListener('change', function() {
            simulationState.showTrails = this.checked;
        });
    }
    
    // Para mostrar/ocultar campo eléctrico
    const fieldCheckbox = document.getElementById('show-electric-field');
    if (fieldCheckbox && typeof fieldCheckbox.addEventListener === 'function') {
        fieldCheckbox.addEventListener('change', function() {
            simulationState.showField = this.checked;
            if (window.ElectricFieldCalculator) {
                window.ElectricFieldCalculator.showField = this.checked;
            }
        });
    }
    
    // Botones de control
    const playBtn = document.getElementById('play-simulation');
    if (playBtn && typeof playBtn.addEventListener === 'function') {
        playBtn.addEventListener('click', startSimulation);
    }
    
    const pauseBtn = document.getElementById('pause-simulation');
    if (pauseBtn && typeof pauseBtn.addEventListener === 'function') {
        pauseBtn.addEventListener('click', pauseSimulation);
    }
    
    const stopBtn = document.getElementById('stop-simulation');
    if (stopBtn && typeof stopBtn.addEventListener === 'function') {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    // Cambio en el modelo de amplificación - verificar que existe y tiene addEventListener
    const modelTypeSelect = document.getElementById('model-type');
    if (modelTypeSelect && typeof modelTypeSelect.addEventListener === 'function') {
        modelTypeSelect.addEventListener('change', function() {
            const modelType = this.value;
            pmtConfig.amplificationModel = modelType;
            
            // Mostrar/ocultar controles relevantes
            const advancedControls = document.getElementById('advanced-model-controls');
            const simpleControls = document.getElementById('simple-model-controls');
            
            if (advancedControls && simpleControls) {
                if (modelType === 'advanced') {
                    advancedControls.style.display = 'block';
                    simpleControls.style.display = 'none';
                } else {
                    advancedControls.style.display = 'none';
                    simpleControls.style.display = 'block';
                }
            }
        });
    } else if (modelTypeSelect) {
        console.warn('modelTypeSelect encontrado pero no tiene addEventListener - probablemente es un mock');
    }
    
    console.log('Listeners de eventos configurados');
}

// Inicializar configuración
function initConfig() {
    console.log('Inicializando configuración...');
    
    // Cargar configuración desde config.js si está disponible
    if (typeof pmtConfig === 'undefined') {
        console.warn('pmtConfig no está definido, creando configuración por defecto');
        window.pmtConfig = {
            photocathode: {
                voltage: -50,
                position: { x: 0, y: 0 },
                shape: { type: 'rectangle', x: 0, y: 0, w: 5, h: 100 }
            },
            anode: {
                voltage: 1000,
                position: { x: 0, y: 0 },
                shape: { type: 'rectangle', x: 0, y: 0, w: 5, h: 100 }
            },
            accelerator: {
                enabled: false,
                voltage: -30,
                position: { x: 0, y: 0 },
                shape: { type: 'rectangle', x: 0, y: 0, w: 5, h: 80 }
            },
            grid: {
                enabled: false,
                voltage: -20,
                position: { x: 0, y: 0 },
                shape: { type: 'rectangle', x: 0, y: 0, w: 5, h: 80 }
            },
            dynodes: [],
            amplificationModel: 'simple',
            simpleParams: {
                r: 0.2,
                beta: 0.55
            },
            advancedParams: {
                sigma_E: 2.5,
                E_max: 2000,
                sigma_max: 3.5,
                s: 0.35,
                alpha: 0.12,
                delta_0: 0.2,
                E_0: 150,
                theta_m: 1.2
            }
        };
    }
    
    // Sincronizar UI con configuración
    const photocathodeVoltage = document.getElementById('photocathode-voltage');
    if (photocathodeVoltage) {
        photocathodeVoltage.value = pmtConfig.photocathode.voltage;
    }
    
    const anodeVoltage = document.getElementById('anode-voltage');
    if (anodeVoltage) {
        anodeVoltage.value = pmtConfig.anode.voltage;
    }
    
    // Inicializar pool de partículas
    if (!window.photonPool) {
        window.photonPool = createParticlePool(100);
    }
    
    // Inicializar calculador de campo eléctrico
    if (!window.ElectricFieldCalculator) {
        window.ElectricFieldCalculator = {
            getFieldAt: function(x, y) {
                // Implementación simple para evitar error
                return { Ex: 0, Ey: 0 };
            },
            showField: false,
            drawField: function() {
                // Implementación vacía para evitar error
            }
        };
    }
    
    console.log('Configuración inicializada');
}

// Inicializar interfaz de usuario
function initUI() {
    console.log('Inicializando interfaz de usuario...');
    
    // Inicializar pestañas de la interfaz
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabs && tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Ocultar todos los contenidos de pestañas
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // Desactivar todas las pestañas
                tabs.forEach(t => {
                    t.classList.remove('active');
                });
                
                // Mostrar el contenido seleccionado
                const target = document.getElementById(tab.dataset.target);
                if (target) {
                    target.style.display = 'block';
                }
                
                // Activar la pestaña actual
                tab.classList.add('active');
            });
        });
        
        // Activar la primera pestaña por defecto
        if (tabs[0] && tabs[0].dataset.target) {
            const defaultTab = document.getElementById(tabs[0].dataset.target);
            if (defaultTab) {
                defaultTab.style.display = 'block';
            }
            tabs[0].classList.add('active');
        }
    }
    
    // Inicializar selectores
    initSelectElements();
    
    console.log('Interfaz de usuario inicializada');
}

// Configurar listeners de eventos
function setupEventListeners() {
    console.log('Configurando listeners de eventos...');
    
    // Para velocidad de simulación
    const speedSlider = document.getElementById('sim-speed');
    if (speedSlider && typeof speedSlider.addEventListener === 'function') {
        speedSlider.addEventListener('input', function() {
            simulationState.simSpeed = parseFloat(this.value);
            const speedValue = document.getElementById('speed-value');
            if (speedValue) {
                speedValue.textContent = simulationState.simSpeed.toFixed(1) + 'x';
            }
        });
    }
    
    // Para mostrar/ocultar trazas
    const trailsCheckbox = document.getElementById('show-trails');
    if (trailsCheckbox && typeof trailsCheckbox.addEventListener === 'function') {
        trailsCheckbox.addEventListener('change', function() {
            simulationState.showTrails = this.checked;
        });
    }
    
    // Para mostrar/ocultar campo eléctrico
    const fieldCheckbox = document.getElementById('show-electric-field');
    if (fieldCheckbox && typeof fieldCheckbox.addEventListener === 'function') {
        fieldCheckbox.addEventListener('change', function() {
            simulationState.showField = this.checked;
            if (window.ElectricFieldCalculator) {
                window.ElectricFieldCalculator.showField = this.checked;
            }
        });
    }
    
    // Botones de control
    const playBtn = document.getElementById('play-simulation');
    if (playBtn && typeof playBtn.addEventListener === 'function') {
        playBtn.addEventListener('click', startSimulation);
    }
    
    const pauseBtn = document.getElementById('pause-simulation');
    if (pauseBtn && typeof pauseBtn.addEventListener === 'function') {
        pauseBtn.addEventListener('click', pauseSimulation);
    }
    
    const stopBtn = document.getElementById('stop-simulation');
    if (stopBtn && typeof stopBtn.addEventListener === 'function') {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    // Cambio en el modelo de amplificación - verificar que existe y tiene addEventListener
    const modelTypeSelect = document.getElementById('model-type');
    if (modelTypeSelect && typeof modelTypeSelect.addEventListener === 'function') {
        modelTypeSelect.addEventListener('change', function() {
            const modelType = this.value;
            pmtConfig.amplificationModel = modelType;
            
            // Mostrar/ocultar controles relevantes
            const advancedControls = document.getElementById('advanced-model-controls');
            const simpleControls = document.getElementById('simple-model-controls');
            
            if (advancedControls && simpleControls) {
                if (modelType === 'advanced') {
                    advancedControls.style.display = 'block';
                    simpleControls.style.display = 'none';
                } else {
                    advancedControls.style.display = 'none';
                    simpleControls.style.display = 'block';
                }
            }
        });
    } else if (modelTypeSelect) {
        console.warn('modelTypeSelect encontrado pero no tiene addEventListener - probablemente es un mock');
    }
    
    console.log('Listeners de eventos configurados');
}

// Inicializar elementos select
function initSelectElements() {
    // Esta función puede ser implementada más adelante si es necesario
    console.log('Inicializando elementos select...');
}

// Inicializar canvas
function initCanvas() {
    console.log('Inicializando canvas...');
    setupCanvas();
    console.log('Canvas inicializado');
}