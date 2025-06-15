// ===================================================================
// PHYSICS - Simulador Fotomultiplicador 2D
// ===================================================================

// Constantes físicas globales para uso en todo el sistema
const PHYSICS = {
    // Constantes fundamentales
    electronMass: 9.1093837e-31, // kg
    electronCharge: -1.602176634e-19, // C
    eVtoJoules: 1.602176634e-19, // J/eV
    coulomb: 8.9875e9, // N·m²/C²
    speedOfLight: 299792458, // m/s
    
    // Materiales de dinodos según el paper
    MATERIALS: {
        'CuBeO': {
            delta_0: 0.5,         // SEY a bajas energías
            E_0: 400,             // eV
            delta_max: 2.5,       // SEY máximo
            E_max: 1500,          // eV (energía para SEY máximo)
            s: 1.35,              // Factor de rugosidad
            alpha: 0.9,           // Factor angular
            k_rough: 1,           // Factor k de rugosidad
            v_rough: 1            // Factor v de rugosidad
        },
        'Cs3Sb': {
            delta_0: 0.6,         // SEY a bajas energías
            E_0: 350,             // eV
            delta_max: 3.0,       // SEY máximo
            E_max: 1300,          // eV (energía para SEY máximo)
            s: 1.35,              // Factor de rugosidad
            alpha: 0.9,           // Factor angular
            k_rough: 1,           // Factor k de rugosidad
            v_rough: 1            // Factor v de rugosidad
        }
    }
};

// Object Pooling para gestión optimizada de partículas
class ObjectPool {
    constructor(objectFactory, initialSize = 100) {
        this.objectFactory = objectFactory;
        this.pool = [];
        
        // Pre-crear objetos iniciales
        this.expandPool(initialSize);
    }
    
    expandPool(count) {
        for (let i = 0; i < count; i++) {
            const obj = this.objectFactory();
            obj.isActive = false;
            this.pool.push(obj);
        }
    }
    
    get() {
        // Buscar un objeto disponible
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isActive) {
                this.pool[i].isActive = true;
                return this.pool[i];
            }
        }
        
        // Si no hay objetos disponibles, expandir pool
        console.log('Expandiendo pool de objetos');
        this.expandPool(Math.ceil(this.pool.length * 0.5)); // Expandir 50%
        return this.get();
    }
    
    release(object) {
        object.isActive = false;
        // Restablecer propiedades críticas
        if (object.reset && typeof object.reset === 'function') {
            object.reset();
        }
    }
}

// Clase Photon - Representación de partícula física
class Photon {
    constructor(x, y) {
        this.reset();
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.isActive = true;
    }
    
    reset() {
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.mass = 9.1093837e-31; // kg (masa del electrón)
        this.charge = -1.602176634e-19; // C (carga del electrón)
        this.energy = 1.5; // eV (energía inicial, ajustable)
        this.trail = [];
        this.trailMaxSize = 20;
        this.isActive = false;
        this.lifetime = 0; // tiempo de vida en segundos
        this.color = '#ffffff';
        this.amplification = 1;
        this.hitCount = 0;
    }
    
    // Métodos para dibujar
    static draw(ctx) {
        if (!this.isActive) return;
        
        console.log(`Dibujando fotón en posición (${this.position.x}, ${this.position.y})`);
        
        // Dibujar trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color || '#00ff00'; // Verde por defecto si no hay color definido
            ctx.lineWidth = 2; // Aumentar grosor para mejor visibilidad
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            
            ctx.stroke();
        }
        
        // Dibujar partícula con tamaño aumentado
        ctx.fillStyle = this.color || '#00ff00';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 4, 0, Math.PI * 2); // Aumentar tamaño de 2 a 4
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke(); // Añadir borde blanco para mejorar visibilidad
    }
    
    // Actualización física
    static update(photon, dt) {
        if (!photon.isActive) return;
        
        // Incrementar tiempo de vida
        photon.lifetime += dt;
        
        // Añadir posición actual al trail
        if (photon.trail.length >= photon.trailMaxSize) {
            photon.trail.shift(); // Eliminar punto más antiguo
        }
        photon.trail.push({ x: photon.position.x, y: photon.position.y });
        
        try {
            // Calcular fuerza eléctrica
            const electricField = window.ElectricFieldCalculator.getFieldAt(photon.position.x, photon.position.y);
            
            console.log(`Campo en posición (${photon.position.x}, ${photon.position.y}): Ex=${electricField.Ex}, Ey=${electricField.Ey}`);
            
            // IMPORTANTE: Factor de escala para evitar aceleraciones extremas
            const scaleFactor = 0.1; // Factor de escala para la simulación
            
            // Usar valores normalizados para la simulación visual
            const acceleration = {
                x: electricField.Ex * scaleFactor,
                y: electricField.Ey * scaleFactor
            };
            
            // Actualizar velocidad (V = Vo + a·t) con límites para evitar valores extremos
            photon.velocity.x += acceleration.x * dt;
            photon.velocity.y += acceleration.y * dt;
            
            // Limitar la velocidad máxima para evitar saltos extremos
            const maxSpeed = 200; // velocidad máxima en píxeles/segundo
            const currentSpeed = Math.sqrt(photon.velocity.x * photon.velocity.x + photon.velocity.y * photon.velocity.y);
            if (currentSpeed > maxSpeed) {
                const ratio = maxSpeed / currentSpeed;
                photon.velocity.x *= ratio;
                photon.velocity.y *= ratio;
            }
            
            // Actualizar posición (P = Po + V·t + 0.5·a·t²)
            const newX = photon.position.x + photon.velocity.x * dt + 0.5 * acceleration.x * dt * dt;
            const newY = photon.position.y + photon.velocity.y * dt + 0.5 * acceleration.y * dt * dt;
            
            // Verificar que el cambio de posición no sea extremo
            const positionChange = Math.sqrt(
                Math.pow(newX - photon.position.x, 2) + 
                Math.pow(newY - photon.position.y, 2)
            );
            
            // Si el cambio de posición es razonable, actualizamos
            const maxPositionChange = 10; // máximo cambio de posición en píxeles por frame
            if (positionChange <= maxPositionChange) {
                photon.position.x = newX;
                photon.position.y = newY;
            } else {
                console.log(`Cambio de posición extremo limitado: ${positionChange.toFixed(2)} píxeles`);
                // Mover en la misma dirección pero con distancia limitada
                const ratio = maxPositionChange / positionChange;
                photon.position.x += (newX - photon.position.x) * ratio;
                photon.position.y += (newY - photon.position.y) * ratio;
            }
        } catch (error) {
            console.error('Error en la actualización física:', error);
        }
        
        // Diagnóstico para colisiones
        console.log(`Comprobando colisiones para fotón en (${photon.position.x}, ${photon.position.y})`);
        
        // Comprobar colisiones con elementos
        if (checkElementCollision(photon, pmtConfig.photocathode)) {
            console.log("¡Colisión con fotocátodo detectada!");
        }
        
        checkCollisions(photon);
        
        // Verificar si está fuera del canvas o ha vivido demasiado
        const canvas = document.getElementById('pmt-canvas');
        if (!canvas) return;
        
        if (
            photon.position.x < -10 || 
            photon.position.x > canvas.width + 10 ||
            photon.position.y < -10 || 
            photon.position.y > canvas.height + 10
        ) {
            console.log(`Fotón fuera de límites: (${photon.position.x}, ${photon.position.y}), canvas: ${canvas.width}x${canvas.height}`);
            photon.isActive = false;
        }
        
        if (photon.lifetime > 1) {
            console.log(`Fotón #${photon.id} desactivado por tiempo de vida excedido: ${photon.lifetime}s`);
            photon.isActive = false;
        }
    }
}

// Crear la pool global de fotones
window.photonPool = new ObjectPool(() => new Photon(0, 0), 200);

// Calculador de campo eléctrico
window.ElectricFieldCalculator = {
    resolution: 20, // resolución de la cuadrícula de campo
    showField: false, // mostrar campo eléctrico
    colorIntensity: 0.5, // intensidad de color para visualizar campo (0-1)
    cachedField: null, // caché del campo para optimización
    
    // Calcular campo en un punto
    getFieldAt(x, y) {
        let Ex = 0, Ey = 0;
        let k = 8.9875e9; // Constante de Coulomb
        
        // Simplificación para mejorar rendimiento
        k = 100; // Factor arbitrario para simulación visual
        
        // Contribución de cada elemento al campo
        const elements = [
            pmtConfig.photocathode,
            pmtConfig.anode,
            ...(pmtConfig.dynodes || [])
        ];
        
        // Añadir elementos opcionales si están habilitados
        if (pmtConfig.accelerator?.enabled) elements.push(pmtConfig.accelerator);
        if (pmtConfig.grid?.enabled) elements.push(pmtConfig.grid);
        
        // Sumar contribuciones
        for (const element of elements) {
            if (!element || !element.shape || typeof element.voltage !== 'number') continue;
            
            // Centro del elemento
            let cx, cy;
            if (element.shape.type === 'rectangle') {
                cx = element.shape.x + element.shape.w / 2;
                cy = element.shape.y + element.shape.h / 2;
            } else if (element.shape.type === 'ellipse') {
                cx = element.shape.x + element.shape.w / 2;
                cy = element.shape.y + element.shape.h / 2;
            } else if (element.shape.type === 'polygon' && element.shape.points?.length > 0) {
                cx = element.shape.points.reduce((sum, p) => sum + p.x, 0) / element.shape.points.length;
                cy = element.shape.points.reduce((sum, p) => sum + p.y, 0) / element.shape.points.length;
            } else {
                continue;
            }
            
            // Distancia al elemento
            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx*dx + dy*dy;
            const dist = Math.sqrt(distSq) || 0.1; // evitar división por cero
            
            // Fuerza eléctrica (proporcional al voltaje)
            const force = k * element.voltage / distSq;
            
            // Componentes del campo
            Ex += force * dx / dist;
            Ey += force * dy / dist;
        }
        
        return { Ex, Ey };
    },
    
    // Actualizar campo cuando cambian voltajes o configuración
    // Esta función debe llamarse cuando se modifica un voltaje o configuración
    updateField() {
        // Invalidar cualquier caché
        this.cachedField = null;
        
        // Notificar cambio
        if (simulationState.running) {
            // Mostrar efecto visual temporal si el campo está visible
            if (this.showField) {
                const fieldIndicator = document.getElementById('field-indicator');
                if (fieldIndicator) {
                    fieldIndicator.classList.add('field-updated');
                    setTimeout(() => fieldIndicator.classList.remove('field-updated'), 300);
                }
            }
        }
        
        return true;
    },
    
    // Ajustar densidad de visualización del campo
    setResolution(value) {
        this.resolution = Math.max(5, Math.min(50, value));
        return this.resolution;
    },
    
    // Ajustar intensidad de color del campo
    setColorIntensity(value) {
        this.colorIntensity = Math.max(0.1, Math.min(1.0, value));
        return this.colorIntensity;
    },
    
    // Dibujar campo eléctrico en canvas
    drawField(ctx) {
        if (!this.showField) return;
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Dibujar cuadrícula de vectores
        const step = width / this.resolution;
        
        for (let x = step / 2; x < width; x += step) {
            for (let y = step / 2; y < height; y += step) {
                const field = this.getFieldAt(x, y);
                this.drawFieldVector(ctx, x, y, field.Ex, field.Ey);
            }
        }
    },
    
    // Dibujar un vector de campo
    drawFieldVector(ctx, x, y, Ex, Ey) {
        // Magnitud del campo
        const magnitude = Math.sqrt(Ex*Ex + Ey*Ey);
        if (magnitude < 1) return; // Ignorar campos muy débiles
        
        // Normalizar y escalar para visualización
        const scale = 10 / (1 + Math.log10(magnitude));
        const dx = Ex / magnitude * scale;
        const dy = Ey / magnitude * scale;
        
        // Color según intensidad
        const intensity = Math.min(1, magnitude / 1000) * this.colorIntensity;
        const r = Math.floor(255 * intensity);
        const g = Math.floor(100 * intensity);
        const b = Math.floor(100 + 155 * intensity);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        
        // Dibujar vector
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        
        // Punta de flecha
        const arrowSize = 3;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(
            x + dx - arrowSize * Math.cos(angle - Math.PI/6),
            y + dy - arrowSize * Math.sin(angle - Math.PI/6)
        );
        ctx.lineTo(
            x + dx - arrowSize * Math.cos(angle + Math.PI/6),
            y + dy - arrowSize * Math.sin(angle + Math.PI/6)
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    },
    
    // Alternar visualización del campo
    toggleField() {
        this.showField = !this.showField;
        return this.showField;
    }
};

// Comprobar colisiones de una partícula con elementos
function checkCollisions(photon) {
    if (!photon.isActive) return;
    
    // Comprobar colisión con fotocátodo
    if (checkElementCollision(photon, pmtConfig.photocathode)) {
        // Absorción o reflexión
        if (Math.random() < 0.1) { // 10% de probabilidad de reflexión
            reflectParticle(photon);
        } else {
            // Absorción - inactivar partícula
            photon.isActive = false;
        }
        return;
    }
    
    // Comprobar colisión con dinodos
    for (let i = 0; i < pmtConfig.dynodes.length; i++) {
        const dynode = pmtConfig.dynodes[i];
        if (checkElementCollision(photon, dynode)) {
            dynode.hit = true;
            setTimeout(() => { dynode.hit = false; }, 50);
            
            // Calcular ganancia para este dinodo
            const gain = calculateDynodeGain(dynode, i);
            
            // Generar electrones secundarios
            generateSecondaryElectrons(photon, dynode, gain);
            
            // Desactivar partícula original
            photon.isActive = false;
            return;
        }
    }
    
    // Comprobar colisión con ánodo
    if (checkElementCollision(photon, pmtConfig.anode)) {
        // Partícula detectada
        simulationState.statistics.detectedPhotons++;
        
        // Marcar ánodo como golpeado
        pmtConfig.anode.hit = true;
        setTimeout(() => { pmtConfig.anode.hit = false; }, 50);
        
        // Desactivar partícula
        photon.isActive = false;
        return;
    }
    
    // Elementos opcionales
    if (pmtConfig.accelerator.enabled && 
        checkElementCollision(photon, pmtConfig.accelerator)) {
        // Aceleración adicional
        const accelFactor = 1.5;
        photon.velocity.x *= accelFactor;
        photon.velocity.y *= accelFactor;
        return;
    }
    
    if (pmtConfig.grid.enabled && 
        checkElementCollision(photon, pmtConfig.grid)) {
        // Enfoque de haz de electrones
        normalizeVelocityTowardsAnode(photon);
        return;
    }
}

// Comprobar colisión con un elemento
function checkElementCollision(photon, element) {
    if (!element || !element.shape) return false;
    
    const shape = element.shape;
    
    // Colisión con rectángulo
    if (shape.type === 'rectangle') {
        return (
            photon.position.x >= shape.x &&
            photon.position.x <= shape.x + shape.w &&
            photon.position.y >= shape.y &&
            photon.position.y <= shape.y + shape.h
        );
    }
    // Colisión con elipse
    else if (shape.type === 'ellipse') {
        const rx = shape.w / 2;
        const ry = shape.h / 2;
        const cx = shape.x + rx;
        const cy = shape.y + ry;
        
        // Normalizar posición relativa al centro
        const nx = (photon.position.x - cx) / rx;
        const ny = (photon.position.y - cy) / ry;
        
        // Distancia normalizada
        return (nx*nx + ny*ny <= 1);
    }
    // Colisión con polígono
    else if (shape.type === 'polygon' && shape.points) {
        return isPointInPolygon(photon.position, shape.points);
    }
    
    return false;
}

// Verificar si un punto está dentro de un polígono
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) != (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Reflejar partícula tras colisión
function reflectParticle(photon) {
    // Invertir componente y de la velocidad (reflexión simple)
    photon.velocity.y = -photon.velocity.y;
    
    // Reducir energía
    photon.energy *= 0.8;
}

// Normalizar velocidad hacia el ánodo
function normalizeVelocityTowardsAnode(photon) {
    if (!pmtConfig.anode.position) return;
    
    // Vector dirección hacia el ánodo
    const dx = pmtConfig.anode.position.x - photon.position.x;
    const dy = pmtConfig.anode.position.y + (pmtConfig.anode.shape?.h || 0) / 2 - photon.position.y;
    
    // Normalizar
    const len = Math.sqrt(dx*dx + dy*dy);
    const dirX = dx / len;
    const dirY = dy / len;
    
    // Conservar magnitud pero cambiar dirección
    const speed = Math.sqrt(photon.velocity.x*photon.velocity.x + photon.velocity.y*photon.velocity.y);
    
    // Ajustar velocidad 
    photon.velocity.x = dirX * speed;
    photon.velocity.y = dirY * speed;
}

/**
 * Implementación del Modelo Modificado de Vaughan para el cálculo del SEY 
 * (Secondary Electron Yield) según las ecuaciones del paper
 * @param {number} energy - Energía del electrón incidente en eV
 * @param {number} angle - Ángulo de incidencia en radianes respecto a la normal de la superficie
 * @param {string} materialType - Tipo de material ('CuBeO' o 'Cs3Sb')
 * @returns {number} - Coeficiente SEY
 */
function calculateSEY(energy, angle, materialType) {
    // Obtener parámetros del material
    const material = PHYSICS.MATERIALS[materialType] || PHYSICS.MATERIALS['CuBeO']; // Valor por defecto
    
    // Implementación de las ecuaciones 1-4 del paper
    // Ecuation (1): factor angular normalizado
    const v = angle / (Math.PI/2); // Normalizar ángulo (0-1)
    
    // Equation (2): parámetro xm (factores de energía)
    const xm = material.alpha * Math.pow(1 + v * material.s, 2);
    
    // Equation (3): parámetro x normalizado
    const x = energy / (xm * material.E_max);
    
    // Equation (4): cálculo del SEY
    let SEY;
    if (energy <= material.E_0) {
        SEY = material.delta_0;
    } else {
        SEY = material.delta_max * (x * Math.exp(1 - x));
    }
    
    // Aplicar factores de rugosidad (k_rough, v_rough) si existen
    if (material.k_rough !== 1 || material.v_rough !== 1) {
        // Aquí se aplicarían factores adicionales según el paper
        // Esta parte es opcional y depende de si se quiere modelar superficies rugosas
    }
    
    return SEY;
}

/**
 * Cálculo de la energía de salida de los electrones secundarios
 * según la distribución Rayleigh (ecuación 6 del paper)
 * @param {number} sigma_E - Parámetro σ_E en eV (típicamente 2-3 eV)
 * @returns {number} - Energía de salida en eV
 */
function calculateDepartureEnergy(sigma_E = 2.2) {
    // Ecuación (6) del paper usando distribución Rayleigh
    const r = Math.random(); // Número aleatorio entre 0-1
    return -2 * sigma_E * Math.log(1 - r);
}

/**
 * Cálculo de la dirección de emisión según la ley del coseno 3D
 * (Ecuaciones 8-9 del paper)
 * @param {Object} normal - Vector normal a la superficie {x, y}
 * @returns {Object} - Vector dirección normalizado {x, y}
 */
function calculateEmissionDirection(normal) {
    // Valores aleatorios para las ecuaciones 8-9
    const r1 = Math.random();
    const r2 = Math.random();
    
    // Ángulo polar (respecto a la normal) - Ecuación (8)
    const theta = Math.acos(Math.sqrt(r1));
    
    // Ángulo azimutal - Ecuación (9)
    const phi = 2 * Math.PI * r2;
    
    // Para 2D, simplificamos usando solo el ángulo polar proyectado en el plano
    // Convertir a coordenadas cartesianas 2D
    const direction = {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi)
    };
    
    // Asegurar que apunte en la dirección correcta relativa a la normal
    // Esto es una simplificación para 2D
    if ((direction.x * normal.x + direction.y * normal.y) > 0) {
        // Invertir dirección si apunta hacia la superficie
        direction.x = -direction.x;
        direction.y = -direction.y;
    }
    
    // Normalizar el vector
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    return {
        x: direction.x / magnitude,
        y: direction.y / magnitude
    };
}

/**
 * Implementación del algoritmo Boris leapfrog para actualizar posición y velocidad
 * (Mencionado en el paper como método de integración numérica)
 * @param {Object} photon - La partícula a actualizar
 * @param {number} dt - Paso de tiempo en segundos
 * @param {Object} electricField - Campo eléctrico {Ex, Ey} en V/m
 * @param {Object} magneticField - Campo magnético {Bx, By, Bz} en Tesla (opcional)
 */
function borisUpdate(photon, dt, electricField, magneticField = null) {
    if (!photon || !photon.isActive) return;
    
    // Ratio carga/masa
    const qm = photon.charge / photon.mass;
    
    // 1. Medio paso de posición (x(t+dt/2) = x(t) + v(t)*dt/2)
    photon.position.x += photon.velocity.x * dt/2;
    photon.position.y += photon.velocity.y * dt/2;
    
    // 2. Actualización de velocidad bajo campo eléctrico
    const vx_minus = photon.velocity.x + qm * electricField.Ex * dt/2;
    const vy_minus = photon.velocity.y + qm * electricField.Ey * dt/2;
    
    // 3. Rotación por campo magnético (si existe)
    let vx_plus = vx_minus;
    let vy_plus = vy_minus;
    
    if (magneticField && (magneticField.Bx != 0 || magneticField.By != 0 || magneticField.Bz != 0)) {
        // Implementar rotación si hay campo magnético (Boris rotation)
        // Para 2D, asumimos solo componente Bz perpendicular al plano
        const t = qm * magneticField.Bz * dt/2;
        const s = 2*t/(1 + t*t);
        
        // Rotación de Boris
        const vx_prime = vx_minus + vy_minus * t;
        const vy_prime = vy_minus - vx_minus * t;
        
        vx_plus = vx_minus + vy_prime * s;
        vy_plus = vy_minus - vx_prime * s;
    }
    
    // 4. Segunda aceleración por campo eléctrico
    photon.velocity.x = vx_plus + qm * electricField.Ex * dt/2;
    photon.velocity.y = vy_plus + qm * electricField.Ey * dt/2;
    
    // 5. Segundo medio paso de posición
    photon.position.x += photon.velocity.x * dt/2;
    photon.position.y += photon.velocity.y * dt/2;
    
    // Actualizar energía cinética
    const v_squared = photon.velocity.x * photon.velocity.x + photon.velocity.y * photon.velocity.y;
    photon.energy = 0.5 * photon.mass * v_squared / PHYSICS.eVtoJoules; // en eV
}

/**
 * Función mejorada para generar electrones secundarios según el modelo del paper
 * @param {Object} sourcePhoton - Electrón incidente
 * @param {Object} dynode - Elemento dinodo
 * @param {Object} normal - Vector normal a la superficie en el punto de impacto
 */
function generateSecondaryElectrons(sourcePhoton, dynode, normal = {x: 0, y: -1}) {
    if (!sourcePhoton || !sourcePhoton.isActive) return;
    
    // 1. Calcular energía de impacto en eV
    const impactEnergy = sourcePhoton.energy; // Ya está en eV
    
    // 2. Determinar ángulo de impacto respecto a la normal
    // Simplificación: usar vector normalizado desde centro de dinodo a punto de impacto
    const dx = sourcePhoton.position.x - (dynode.shape.x + dynode.shape.w/2);
    const dy = sourcePhoton.position.y - (dynode.shape.y + dynode.shape.h/2);
    const dist = Math.sqrt(dx*dx + dy*dy) || 0.1;
    
    // Producto escalar normalizado para obtener coseno del ángulo
    const cosTheta = Math.abs((dx*normal.x + dy*normal.y) / dist);
    const impactAngle = Math.acos(cosTheta);
    
    // 3. Determinar material del dinodo
    const dynodeMaterial = dynode.index >= 2 && dynode.index <= 4 ? 'CuBeO' : 'Cs3Sb';
    
    // 4. Calcular SEY según modelo de Vaughan
    const sey = calculateSEY(impactEnergy, impactAngle, dynodeMaterial);
    
    // 5. Determinar número de electrones secundarios (Poisson o valor exacto)
    const electronCount = Math.round(sey);
    
    // Marcar dinodo como golpeado para efectos visuales
    dynode.hit = true;
    setTimeout(() => { dynode.hit = false; }, 50);
    
    // Si no hay electrones que generar, terminar
    if (electronCount <= 0) {
        sourcePhoton.isActive = false;
        return;
    }
    
    // 6. Generar electrones secundarios
    for (let i = 0; i < electronCount; i++) {
        // Obtener un electrón del pool
        const electron = window.photonPool.get();
        if (!electron) continue;
        
        // Posición inicial: en el punto de impacto
        electron.position.x = sourcePhoton.position.x;
        electron.position.y = sourcePhoton.position.y;
        
        // Calcular energía de salida según distribución de Rayleigh
        const departureEnergy = calculateDepartureEnergy(
            pmtConfig.advancedParams?.sigma_E || 2.2
        );
        electron.energy = departureEnergy;
        
        // Calcular dirección de salida según ley del coseno
        const direction = calculateEmissionDirection(normal);
        
        // Velocidad inicial basada en la energía y dirección
        const speed = Math.sqrt(2 * electron.energy * PHYSICS.eVtoJoules / electron.mass);
        electron.velocity.x = direction.x * speed;
        electron.velocity.y = direction.y * speed;
        
        // Heredar y actualizar propiedades de seguimiento
        electron.hitCount = sourcePhoton.hitCount + 1;
        electron.amplification = sourcePhoton.amplification * electronCount;
        
        // Color diferente para electrones secundarios para visualización
        electron.color = '#00ffff';
        
        // Agregar a la simulación
        simulationState.photons.push(electron);
    }
    
    // Desactivar electrón original
    sourcePhoton.isActive = false;
}

// Función actualizada para calcular la ganancia en un dinodo
function calculateDynodeGain(dynode, dynodeIndex) {
    if (!dynode || typeof dynode.voltage !== 'number') return 1;
    
    // Obtener dinodo anterior para calcular diferencia de voltaje
    let prevVoltage = 0;
    if (dynodeIndex > 0 && pmtConfig.dynodes[dynodeIndex - 1]) {
        prevVoltage = pmtConfig.dynodes[dynodeIndex - 1].voltage;
    } else if (dynodeIndex === 0 && pmtConfig.grid?.enabled) {
        prevVoltage = pmtConfig.grid.voltage;
    } else if (dynodeIndex === 0 && pmtConfig.photocathode) {
        prevVoltage = pmtConfig.photocathode.voltage;
    }
    
    const voltageDiff = Math.abs(dynode.voltage - prevVoltage);
    
    // Elegir modelo según configuración
    if (pmtConfig.useAdvancedModel) {
        // Modelo avanzado usando parámetros del paper
        // Los parámetros deberían venir de la configuración UI
        const params = pmtConfig.advancedParams || {
            sigma_E: 2.2,        // eV
            E_max: 1500,         // eV
            sigma_max: 2.5,      // 
            s: 1.35,             // Factor rugosidad
            alpha: 0.9,          // Factor angular
            delta_0: 1.0,        // SEY a baja energía
            E_0: 400,            // eV
            theta_m: 0.8         // rad, ángulo máximo
        };
        
        // Simplificación: asumimos energía promedio proporcional a diferencia de voltaje
        const avgEnergy = voltageDiff * 0.7; // Factor de escala, ajustable
        
        // Calcular SEY usando valores típicos para ángulo de incidencia
        const avgAngle = 0.5; // Radianes, ajustable
        const material = dynodeIndex >= 2 && dynodeIndex <= 4 ? 'CuBeO' : 'Cs3Sb';
        
        return calculateSEY(avgEnergy, avgAngle, material);
    } else {
        // Modelo simple: r * (DiferenciaVoltaje)^beta
        const r = pmtConfig.simpleParams?.r || 2;
        const beta = pmtConfig.simpleParams?.beta || 0.7;
        
        return r * Math.pow(voltageDiff, beta);
    }
}