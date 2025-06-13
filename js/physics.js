// ===================================================================
// PHYSICS - Simulador Fotomultiplicador 2D
// ===================================================================

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

// Generar electrones secundarios tras impacto
function generateSecondaryElectrons(sourcePhoton, element, gain) {
    // Redondear ganancia para determinar número de electrones a generar
    const electronCount = Math.round(gain);
    
    // Energía para electrones secundarios
    const secondaryEnergy = pmtConfig.advancedParams?.sigma_E || 1.0; // eV
    
    // Generar electrones secundarios
    for (let i = 0; i < electronCount; i++) {
        // Obtener un fotón del pool
        const electron = photonPool.get();
        
        // Posición inicial: en el punto de impacto con ligera variación
        electron.position.x = sourcePhoton.position.x + (Math.random() - 0.5) * 2;
        electron.position.y = sourcePhoton.position.y + (Math.random() - 0.5) * 2;
        
        // Heredar propiedades importantes
        electron.hitCount = sourcePhoton.hitCount + 1;
        
        // Dirección: desde el elemento hacia el ánodo con dispersión
        if (pmtConfig.anode.position) {
            const dx = pmtConfig.anode.position.x - electron.position.x;
            const dy = pmtConfig.anode.position.y + (pmtConfig.anode.shape?.h || 0) / 2 - electron.position.y;
            
            // Normalizar
            const len = Math.sqrt(dx*dx + dy*dy);
            const dirX = dx / len;
            const dirY = dy / len;
            
            // Añadir dispersión aleatoria
            const dispersion = 0.2; // 20% de dispersión angular
            const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * dispersion;
            
            // Velocidad inicial
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        } else {
            // Velocidad aleatoria si no hay ánodo definido
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        }
        
        // Agregar a la simulación
        simulationState.photons.push(electron);
    }
}

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

// Generar electrones secundarios tras impacto
function generateSecondaryElectrons(sourcePhoton, element, gain) {
    // Redondear ganancia para determinar número de electrones a generar
    const electronCount = Math.round(gain);
    
    // Energía para electrones secundarios
    const secondaryEnergy = pmtConfig.advancedParams?.sigma_E || 1.0; // eV
    
    // Generar electrones secundarios
    for (let i = 0; i < electronCount; i++) {
        // Obtener un fotón del pool
        const electron = photonPool.get();
        
        // Posición inicial: en el punto de impacto con ligera variación
        electron.position.x = sourcePhoton.position.x + (Math.random() - 0.5) * 2;
        electron.position.y = sourcePhoton.position.y + (Math.random() - 0.5) * 2;
        
        // Heredar propiedades importantes
        electron.hitCount = sourcePhoton.hitCount + 1;
        
        // Dirección: desde el elemento hacia el ánodo con dispersión
        if (pmtConfig.anode.position) {
            const dx = pmtConfig.anode.position.x - electron.position.x;
            const dy = pmtConfig.anode.position.y + (pmtConfig.anode.shape?.h || 0) / 2 - electron.position.y;
            
            // Normalizar
            const len = Math.sqrt(dx*dx + dy*dy);
            const dirX = dx / len;
            const dirY = dy / len;
            
            // Añadir dispersión aleatoria
            const dispersion = 0.2; // 20% de dispersión angular
            const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * dispersion;
            
            // Velocidad inicial
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        } else {
            // Velocidad aleatoria si no hay ánodo definido
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(2 * secondaryEnergy * PHYSICS.eVtoJoules / electron.mass);
            electron.velocity.x = Math.cos(angle) * speed;
            electron.velocity.y = Math.sin(angle) * speed;
        }
        
        // Agregar a la simulación
        simulationState.photons.push(electron);
    }
}