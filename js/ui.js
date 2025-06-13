// ===================================================================
// INTERFAZ DE USUARIO - Simulador Fotomultiplicador 2D
// ===================================================================

// Event Listeners
function setupEventListeners() {
    // Controles de simulación
    document.getElementById('play-simulation').addEventListener('click', () => {
        const photonCount = parseInt(document.getElementById('photon-count').value) || 5;
        if (pmtConfig.dynodes.length === 0) generateDefaultDynodes();
        engine.generatePhotons(photonCount);
        engine.start();
    });
    
    document.getElementById('pause-simulation').addEventListener('click', () => engine.pause());
    document.getElementById('stop-simulation').addEventListener('click', () => engine.stop());
    
    // Velocidad de simulación
    document.getElementById('sim-speed').addEventListener('input', (e) => {
        simulationState.speed = parseFloat(e.target.value);
        document.getElementById('speed-value').textContent = e.target.value + 'x';
    });
    
    // Modelo de amplificación
    document.getElementById('amplification-model').addEventListener('change', (e) => {
        pmtConfig.amplificationModel = e.target.value;
        document.getElementById('simple-model-params').style.display = e.target.value === 'simple' ? 'block' : 'none';
        document.getElementById('advanced-model-params').style.display = e.target.value === 'advanced' ? 'block' : 'none';
        
        // Actualizar estadísticas y visualización en tiempo real
        updateDynodeTable();
        updateUIStatistics();
        engine.render();
        
        // Destacar el cambio de modelo
        e.target.classList.add('model-changed');
        setTimeout(() => e.target.classList.remove('model-changed'), 800);
    });
    
    // Elementos principales (fotocátodo, acelerador, grid, ánodo)
    document.getElementById('photocathode-voltage').addEventListener('input', (e) => {
        pmtConfig.photocathode.voltage = parseInt(e.target.value);
        updateElementConfiguration('photocathode');
    });
    
    document.getElementById('accelerator-enabled').addEventListener('change', (e) => {
        pmtConfig.accelerator.enabled = e.target.checked;
        updateElementConfiguration('accelerator');
    });
    
    document.getElementById('accelerator-voltage').addEventListener('input', (e) => {
        pmtConfig.accelerator.voltage = parseInt(e.target.value);
        updateElementConfiguration('accelerator');
    });
    
    document.getElementById('grid-enabled').addEventListener('change', (e) => {
        pmtConfig.grid.enabled = e.target.checked;
        updateElementConfiguration('grid');
    });
    
    document.getElementById('grid-voltage').addEventListener('input', (e) => {
        pmtConfig.grid.voltage = parseInt(e.target.value);
        updateElementConfiguration('grid');
    });
    
    document.getElementById('anode-voltage').addEventListener('input', (e) => {
        pmtConfig.anode.voltage = parseInt(e.target.value);
        updateElementConfiguration('anode');
    });
    
    // Botones de incremento/decremento para dinodos
    document.getElementById('increase-dynodes').addEventListener('click', () => {
        const dynodeCountElement = document.getElementById('dynode-count');
        let count = parseInt(dynodeCountElement.value) || 8;
        count = Math.min(20, count + 1); // Máximo 20
        dynodeCountElement.value = count;
    });

    document.getElementById('decrease-dynodes').addEventListener('click', () => {
        const dynodeCountElement = document.getElementById('dynode-count');
        let count = parseInt(dynodeCountElement.value) || 8;
        count = Math.max(4, count - 1); // Mínimo 4
        dynodeCountElement.value = count;
    });
    
    // Generación de dinodos y otros controles
    document.getElementById('generate-dynodes').addEventListener('click', generateDefaultDynodes);
    document.getElementById('clear-canvas').addEventListener('click', () => {
        engine.stop();
        pmtConfig.dynodes = [];
        updateDynodeTable();
    });
    
    // Parámetros del modelo simple
    ['simple-r', 'simple-beta'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const param = id.split('-')[1];
            pmtConfig.simpleParams[param] = parseFloat(e.target.value);
            
            // Actualizar en tiempo real si la simulación está corriendo
            if (simulationState.running) {
                updateDynodeTable();
                updateUIStatistics();
            }
            
            // Mostrar el valor actual
            const valueDisplay = document.querySelector(`#${id}-value`);
            if (valueDisplay) {
                valueDisplay.textContent = parseFloat(e.target.value).toFixed(2);
            }
        });
    });
    
    // Parámetros del modelo avanzado
    [
        'advanced-sigma-e', 'advanced-e-max', 'advanced-sigma-max', 'advanced-s',
        'advanced-alpha', 'advanced-delta-0', 'advanced-e-0', 'advanced-theta-m'
    ].forEach(id => {
        const element = document.getElementById(id);
        if (element) { // Verificar si existe el elemento (por si no hemos actualizado aún el HTML)
            element.addEventListener('input', (e) => {
                const param = id.replace('advanced-', '').replace(/-/g, '_');
                pmtConfig.advancedParams[param] = parseFloat(e.target.value);
                
                // Actualizar en tiempo real si la simulación está corriendo
                if (simulationState.running) {
                    updateDynodeTable();
                    updateUIStatistics();
                }
                
                // Mostrar el valor actual
                const valueDisplay = document.querySelector(`#${id}-value`);
                if (valueDisplay) {
                    valueDisplay.textContent = parseFloat(e.target.value).toFixed(2);
                }
            });
        }
    });
    
    // Exportación de datos
    document.getElementById('export-results').addEventListener('click', exportResults);
    document.getElementById('export-csv').addEventListener('click', exportResultsCSV);
    
    // Gestión de archivos
    document.getElementById('save-config').addEventListener('click', saveConfiguration);
    document.getElementById('load-config').addEventListener('click', loadConfiguration);
}

// Actualizar configuración de elementos del PMT
function updateElementConfiguration(elementType) {
    if (!pmtConfig[elementType]) return;
    
    const config = pmtConfig[elementType];
    const enabledElement = document.getElementById(`${elementType}-enabled`);
    const voltageElement = document.getElementById(`${elementType}-voltage`);
    
    // Actualizar estado habilitado/deshabilitado
    if (enabledElement) {
        config.enabled = enabledElement.checked;
        if (voltageElement) voltageElement.disabled = !config.enabled;
    }
    
    // Actualizar voltaje
    if (voltageElement) config.voltage = parseInt(voltageElement.value) || 0;
    
    // Crear posición por defecto si no existe
    if (!config.position) createDefaultPositionForElement(elementType);
    
    // Actualizar representación visual
    updateElementShape(elementType);
    
    // Notificar al calculador de campo eléctrico sobre el cambio
    ElectricFieldCalculator.updateField();
    
    // Renderizar cambios y actualizar el campo eléctrico
    engine.render();
    
    // Si está corriendo la simulación, destacar el elemento modificado
    if (simulationState.running) {
        const element = document.getElementById(`${elementType}-voltage`);
        if (element) {
            element.classList.add('value-changed');
            setTimeout(() => element.classList.remove('value-changed'), 500);
        }
        
        // Actualizar estadísticas en tiempo real para reflejar el impacto de los cambios
        updateUIStatistics();
    }
}

// Crear posiciones por defecto para elementos
function createDefaultPositionForElement(elementType) {
    const config = pmtConfig[elementType];
    
    switch (elementType) {
        case 'photocathode':
            config.shape = {
                type: 'rectangle',
                x: 30,
                y: canvas.height/2 - 50,
                w: 10,
                h: 100
            };
            config.position = { x: config.shape.x, y: config.shape.y };
            break;
        case 'accelerator':
            config.shape = {
                type: 'rectangle',
                x: 50,
                y: canvas.height/2 - 40,
                w: 5,
                h: 80
            };
            config.position = { x: config.shape.x, y: config.shape.y };
            break;
        case 'grid':
            config.shape = {
                type: 'rectangle',
                x: 70,
                y: canvas.height/2 - 60,
                w: 2,
                h: 120
            };
            config.position = { x: config.shape.x, y: config.shape.y };
            break;
        case 'anode':
            const lastDynodeX = pmtConfig.dynodes.length > 0 ? 
                pmtConfig.dynodes[pmtConfig.dynodes.length-1].shape.x + 100 :
                canvas.width - 50;
            
            config.shape = {
                type: 'rectangle',
                x: lastDynodeX,
                y: canvas.height/2 - 50,
                w: 15,
                h: 100
            };
            config.position = { x: config.shape.x, y: config.shape.y };
            break;
    }
}

// Actualizar forma visual de un elemento
function updateElementShape(elementType) {
    const config = pmtConfig[elementType];
    
    // No actualizar si está deshabilitado
    if (config.hasOwnProperty('enabled') && !config.enabled) return;
    
    // Crear forma básica si no existe
    if (config.position && !config.shape) {
        config.shape = {
            type: 'rectangle',
            x: config.position.x,
            y: config.position.y,
            w: elementType === 'photocathode' ? 10 : 5,
            h: 100
        };
    }
    
    // Representar elementos principales en la simulación
    if (['photocathode', 'accelerator', 'grid', 'anode'].includes(elementType)) {
        const existingElementIndex = pmtConfig.dynodes.findIndex(d => d.type === elementType);
        
        if (existingElementIndex >= 0) {
            // Actualizar elemento existente
            pmtConfig.dynodes[existingElementIndex] = {
                ...pmtConfig.dynodes[existingElementIndex],
                voltage: config.voltage,
                shape: config.shape,
                position: config.position,
                type: elementType
            };
        } else if (config.enabled !== false) {
            // Añadir elemento si no existe y está habilitado
            pmtConfig.dynodes.push({
                id: pmtConfig.dynodes.length,
                voltage: config.voltage,
                shape: config.shape,
                position: config.position,
                type: elementType
            });
        }
    }
    
    // Actualizar visualización
    engine.render();
}

// Generar configuración por defecto de dinodos
function generateDefaultDynodes() {
    const count = parseInt(document.getElementById('dynode-count').value) || 8;
    pmtConfig.dynodes = [];
    
    const spacing = (canvas.width - 200) / (count + 1);
    const baseVoltage = -100;
    
    for (let i = 0; i < count; i++) {
        const x = 100 + spacing * (i + 1);
        const y = 150 + Math.sin(i * 0.5) * 50;
        const voltage = baseVoltage * (i + 1);
        
        pmtConfig.dynodes.push({
            id: i,
            type: 'dynode',
            voltage: voltage,
            position: { x, y },
            shape: {
                type: 'rectangle',
                x: x - 15,
                y: y - 10,
                w: 30,
                h: 20
            }
        });
    }
    
    updateDynodeTable();
    engine.render();
}

// Actualizar tabla de dinodos
function updateDynodeTable() {
    const tbody = document.querySelector('#dynode-table tbody');
    tbody.innerHTML = '';
    
    pmtConfig.dynodes.forEach((dynode, index) => {
        const row = document.createElement('tr');
        row.id = `dynode-row-${index}`;
        
        // Calcular ganancia según modelo seleccionado
        const gain = calculateDynodeGain(dynode, index);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="number" value="${dynode.voltage}" onchange="updateDynodeVoltage(${index}, this.value)"></td>
            <td id="gain-${index}">${gain.toFixed(2)}</td>
            <td>${dynode.position ? `(${Math.round(dynode.position.x)}, ${Math.round(dynode.position.y)})` : 'N/A'}</td>
            <td><span class="status-indicator ${dynode.voltage < 0 ? 'active' : 'inactive'}"></span></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Calcular ganancia de dinodo según modelo seleccionado
function calculateDynodeGain(dynode, index) {
    // Si no es un dinodo real (es fotocátodo, grid, etc.) devolver 1.0
    if (dynode.type && dynode.type !== 'dynode') {
        return 1.0;
    }
    
    // Obtener voltaje del dinodo actual y el anterior
    const currentVoltage = Math.abs(dynode.voltage);
    const previousDynode = index > 0 ? pmtConfig.dynodes[index - 1] : null;
    const previousVoltage = previousDynode ? Math.abs(previousDynode.voltage) : 0;
    
    // Calcular diferencia de voltaje
    const voltageDiff = Math.abs(currentVoltage - previousVoltage);
    
    // Aplicar modelo seleccionado
    if (pmtConfig.amplificationModel === 'simple') {
        // Modelo simple: r * (ΔV)^β
        const { r, beta } = pmtConfig.simpleParams;
        return r * Math.pow(voltageDiff, beta);
    } else {
        // Modelo avanzado según paper
        const { 
            sigma_E, E_max, sigma_max, s, 
            alpha, delta_0, E_0, theta_m 
        } = pmtConfig.advancedParams;
        
        // Parámetros físicos aproximados
        const incidenceAngle = 0.5; // Valor medio aproximado en radianes
        
        // Modelo basado en paper completo
        // Dependencia energética (modelo Sternglass modificado)
        const x = voltageDiff / E_0;
        let delta = delta_0 * x * Math.exp(1 - x);
        
        // Factor de forma superficial (ajuste empírico)
        delta *= (1 + alpha * Math.pow(index, 0.5));
        
        // Dependencia angular (modelo Bronshtein & Fraiman)
        const angularFactor = Math.pow(Math.cos(incidenceAngle - theta_m) / Math.cos(theta_m), s);
        delta *= angularFactor;
        
        // Limitar a valores físicos
        return Math.max(0.1, Math.min(delta, 10.0));
    }
}

// Actualizar voltaje de dinodo y recalcular ganancia
function updateDynodeVoltage(index, voltage) {
    pmtConfig.dynodes[index].voltage = parseFloat(voltage);
    
    // Actualizar indicador de estado
    const statusIndicator = document.querySelector(`#dynode-row-${index} .status-indicator`);
    statusIndicator.className = `status-indicator ${voltage < 0 ? 'active' : 'inactive'}`;
    
    // Recalcular y actualizar ganancia
    const gain = calculateDynodeGain(pmtConfig.dynodes[index], index);
    document.getElementById(`gain-${index}`).textContent = gain.toFixed(2);
    
    // Actualizar campo eléctrico y notificar cambio
    ElectricFieldCalculator.updateField();
    
    // Actualizar campo eléctrico y renderizar cambios
    // Esto asegura que los cambios en voltaje afecten inmediatamente al comportamiento de las partículas
    if (simulationState.running) {
        // Si hay una simulación en curso, actualizar en tiempo real
        engine.render();
        
        // Notificar el cambio con un efecto visual temporal en la tabla
        const row = document.getElementById(`dynode-row-${index}`);
        row.classList.add('voltage-changed');
        setTimeout(() => row.classList.remove('voltage-changed'), 500);
    }
}

// Inicialización de elementos principales
function initializeMainElements() {
    // Fotocátodo
    pmtConfig.photocathode.voltage = parseInt(document.getElementById('photocathode-voltage').value) || 0;
    updateElementConfiguration('photocathode');
    
    // Acelerador
    const acceleratorEnabled = document.getElementById('accelerator-enabled').checked;
    pmtConfig.accelerator.enabled = acceleratorEnabled;
    pmtConfig.accelerator.voltage = parseInt(document.getElementById('accelerator-voltage').value) || -50;
    document.getElementById('accelerator-voltage').disabled = !acceleratorEnabled;
    updateElementConfiguration('accelerator');
    
    // Grid
    const gridEnabled = document.getElementById('grid-enabled').checked;
    pmtConfig.grid.enabled = gridEnabled;
    pmtConfig.grid.voltage = parseInt(document.getElementById('grid-voltage').value) || -20;
    document.getElementById('grid-voltage').disabled = !gridEnabled;
    updateElementConfiguration('grid');
    
    // Ánodo
    pmtConfig.anode.voltage = parseInt(document.getElementById('anode-voltage').value) || 1000;
    updateElementConfiguration('anode');
}