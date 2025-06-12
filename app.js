/**
 * QuantumDraft - Simulador Fotovoltaico
 * Aplicación principal que inicializa la interfaz y conecta los componentes
 */

// Asegurar que el DOM está completamente cargado antes de inicializar
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const canvas = document.getElementById('simulationCanvas');
  const ctx = canvas.getContext('2d');
  const playButton = document.getElementById('playButton');
  const resetButton = document.getElementById('resetButton');
  const loadJsonButton = document.getElementById('loadJsonButton');
  const exportJsonButton = document.getElementById('exportJsonButton');
  const componentsTable = document.getElementById('componentsTable').querySelector('tbody');
  
  // Elementos para mostrar información en tiempo real
  const totalEnergyElement = document.getElementById('totalEnergy');
  const electronCountElement = document.getElementById('electronCount');
  
  // Parámetros de entrada
  const deltatInput = document.getElementById('deltatInput');
  const photonCountInput = document.getElementById('photonCountInput');
  const seedInput = document.getElementById('seedInput');
  
  // Referencias a gráficas
  const currentChartCanvas = document.getElementById('currentChart');
  const impactChartCanvas = document.getElementById('impactChart');

  // Inicializar Controlador de Simulación (MVC)
  const simulationController = new SimulationController(
    canvas,
    currentChartCanvas,
    impactChartCanvas
  );

  // Inicializar componentes por defecto
  simulationController.initialize();
  
  // ==================== MANIPULACIÓN DE LA TABLA DE COMPONENTES ====================
  
  /**
   * Actualiza la tabla HTML con los componentes del simulador
   */
  function updateComponentsTable() {
    // Limpiar tabla
    componentsTable.innerHTML = '';
    
    // Reconstruir filas de la tabla
    simulationController.components.forEach(component => {
      const row = createComponentRow(component);
      componentsTable.appendChild(row);
    });
  }
  
  /**
   * Crea una fila de tabla para un componente
   * @param {Component} component - Componente a representar
   * @returns {HTMLElement} - Elemento TR con la fila
   */
  function createComponentRow(component) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${component.type}</td>
      <td><input type="number" class="form-control form-control-sm position-x" value="${component.x}"></td>
      <td><input type="number" class="form-control form-control-sm position-y" value="${component.y}"></td>
      <td><input type="number" class="form-control form-control-sm voltage" value="${component.voltage}"></td>
      <td><input type="color" class="form-control form-control-sm color" value="${component.color}"></td>
      <td>
        ${component.type === 'dinode' ? `
        <select class="form-select form-select-sm model">
          <option value="simple"${component.model==='simple'?' selected':''}>Simple</option>
          <option value="advanced"${component.model==='advanced'?' selected':''}>Avanzado</option>
        </select>
        <div class="model-params simple-params${component.model==='simple'?'':' d-none'} mt-2">
          <input type="number" step="0.1" class="form-control form-control-sm param-r mb-1" value="${component.params.r}" placeholder="r">
          <input type="number" step="0.1" class="form-control form-control-sm param-beta" value="${component.params.beta}" placeholder="β">
        </div>
        <div class="model-params advanced-params${component.model==='advanced'?'':' d-none'} mt-2">
          <input type="number" step="0.1" class="form-control form-control-sm param-phi_w mb-1" value="${component.params.phi_w}" placeholder="φ₆">
          <input type="number" step="0.1" class="form-control form-control-sm param-phi_0 mb-1" value="${component.params.phi_0}" placeholder="φ₀">
          <input type="number" step="0.1" class="form-control form-control-sm param-sigma_E mb-1" value="${component.params.sigma_E}" placeholder="σ_E">
          <input type="number" step="0.1" class="form-control form-control-sm param-E_0 mb-1" value="${component.params.E_0}" placeholder="E₀">
          <input type="number" step="0.1" class="form-control form-control-sm param-alpha mb-1" value="${component.params.alpha}" placeholder="α">
          <input type="number" step="0.1" class="form-control form-control-sm param-gamma mb-1" value="${component.params.gamma}" placeholder="γ">
          <input type="number" step="0.1" class="form-control form-control-sm param-lambda" value="${component.params.lambda}" placeholder="λ">
        </div>
        ` : '-'}
      </td>
      <td>${
        !['photocathode', 'anode', 'grid', 'accelerator'].includes(component.type) ?
        '<button class="btn btn-sm btn-danger delete-button">Eliminar</button>' :
        '-'
      }</td>
    `;

    // Añadir events listeners para los inputs
    attachInputListenersToRow(row, component);
    
    return row;
  }
  
  /**
   * Asocia listeners de eventos a los inputs de una fila
   * @param {HTMLElement} row - Fila de la tabla
   * @param {Component} component - Componente asociado
   */
  function attachInputListenersToRow(row, component) {
    // Eventos para posición X/Y
    row.querySelector('.position-x')?.addEventListener('input', (e) => {
      component.x = parseFloat(e.target.value);
      simulationController.render();
    });
    
    row.querySelector('.position-y')?.addEventListener('input', (e) => {
      component.y = parseFloat(e.target.value);
      simulationController.render();
    });
    
    // Evento para voltaje
    row.querySelector('.voltage')?.addEventListener('input', (e) => {
      component.voltage = parseFloat(e.target.value);
    });
    
    // Evento para color
    row.querySelector('.color')?.addEventListener('input', (e) => {
      component.color = e.target.value;
      simulationController.render();
    });
    
    // Para dinodos, eventos específicos de modelo
    if (component.type === 'dinode') {
      const sel = row.querySelector('.model');
      const simpleDiv = row.querySelector('.simple-params');
      const advDiv = row.querySelector('.advanced-params');
      
      // Seleccionar inputs para los parámetros
      const rInput = row.querySelector('.param-r');
      const betaInput = row.querySelector('.param-beta');
      const phiWInput = row.querySelector('.param-phi_w');
      const phi0Input = row.querySelector('.param-phi_0');
      const sigmaEInput = row.querySelector('.param-sigma_E');
      const E0Input = row.querySelector('.param-E_0');
      const alphaInput = row.querySelector('.param-alpha');
      const gammaInput = row.querySelector('.param-gamma');
      const lambdaInput = row.querySelector('.param-lambda');
      
      // Cambio de modelo
      sel.addEventListener('change', (e) => {
        component.model = e.target.value;
        if (e.target.value === 'simple') {
          simpleDiv.classList.remove('d-none');
          advDiv.classList.add('d-none');
        } else {
          simpleDiv.classList.add('d-none');
          advDiv.classList.remove('d-none');
        }
      });
      
      // Eventos para parámetros simples
      rInput.addEventListener('input', e => component.params.r = parseFloat(e.target.value) || 0);
      betaInput.addEventListener('input', e => component.params.beta = parseFloat(e.target.value) || 0);
      
      // Eventos para parámetros avanzados
      phiWInput.addEventListener('input', e => component.params.phi_w = parseFloat(e.target.value) || 0);
      phi0Input.addEventListener('input', e => component.params.phi_0 = parseFloat(e.target.value) || 0);
      sigmaEInput.addEventListener('input', e => component.params.sigma_E = parseFloat(e.target.value) || 0);
      E0Input.addEventListener('input', e => component.params.E_0 = parseFloat(e.target.value) || 0);
      alphaInput.addEventListener('input', e => component.params.alpha = parseFloat(e.target.value) || 0);
      gammaInput.addEventListener('input', e => component.params.gamma = parseFloat(e.target.value) || 0);
      lambdaInput.addEventListener('input', e => component.params.lambda = parseFloat(e.target.value) || 0);
    }
    
    // Botón de eliminar
    row.querySelector('.delete-button')?.addEventListener('click', () => {
      if (!['photocathode', 'anode', 'grid', 'accelerator'].includes(component.type)) {
        simulationController.components = simulationController.components.filter(c => c !== component);
        simulationController.physicsSimulator.setComponents(simulationController.components);
        row.remove();
        simulationController.render();
      }
    });
  }
  
  // ==================== EVENTOS DE LOS BOTONES PRINCIPALES ====================
  
  // Iniciar simulación
  playButton.addEventListener('click', () => {
    // Configurar parámetros desde la interfaz
    simulationController.updateConfiguration({
      deltaT: parseFloat(deltatInput.value) || 0.1,
      photonCount: parseInt(photonCountInput.value) || 10,
      seed: seedInput.value
    });
    
    // Iniciar simulación
    simulationController.start();
    
    // Actualizar UI
    updateSimulationStatus('running');
  });
  
  // Reiniciar simulación
  resetButton.addEventListener('click', () => {
    simulationController.reset();
    updateSimulationStatus('ready');
  });
  
  // Exportar geometría a JSON
  exportJsonButton.addEventListener('click', () => {
    const config = simulationController.exportConfiguration();
    const json = JSON.stringify(config, null, 2);
    
    // Crear enlace de descarga
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geometry.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Cargar geometría desde archivo
  loadJsonButton.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      try {
        const config = JSON.parse(content);
        simulationController.loadConfiguration(config);
        updateComponentsTable();
        updateSimulationStatus('ready');
      } catch(err) {
        alert('Error cargando JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  });
  
  // ==================== CONTROLES DE DINODOS ====================
  
  let dynodeCount = 8; // Valor por defecto
  
  // Botones para controlar número de dinodos
  const increaseDinodeBtn = document.querySelector('[data-action="increase-dynodes"]');
  const decreaseDinodeBtn = document.querySelector('[data-action="decrease-dynodes"]');
  
  if (increaseDinodeBtn) {
    increaseDinodeBtn.addEventListener('click', () => {
      if (dynodeCount < 20) {
        dynodeCount++;
        simulationController.updateDynodeCount(dynodeCount);
        updateComponentsTable();
      }
    });
  }
  
  if (decreaseDinodeBtn) {
    decreaseDinodeBtn.addEventListener('click', () => {
      if (dynodeCount > 4) {
        dynodeCount--;
        simulationController.updateDynodeCount(dynodeCount);
        updateComponentsTable();
      }
    });
  }
  
  // Botón para agregar un nuevo dinodo individual
  const addDinodeButton = document.getElementById('addDinodeButton') || document.querySelector('[data-action="add-dinode"]');
  if (addDinodeButton) {
    addDinodeButton.addEventListener('click', () => {
      simulationController.addComponent('dinode', 200, 200, 0, '#808080', 'simple');
      updateComponentsTable();
    });
  }
  
  // ==================== CONTROL DE GRID Y ACCELERATOR ====================
  
  // Checkboxes para grid y accelerator
  const gridCheckbox = document.getElementById('gridCheckbox');
  if (gridCheckbox) {
    gridCheckbox.addEventListener('change', e => {
      if (e.target.checked) {
        simulationController.addComponent('grid', 150, canvas.height / 2, 0, '#00ff00');
      } else {
        simulationController.components = simulationController.components.filter(c => c.type !== 'grid');
        simulationController.physicsSimulator.setComponents(simulationController.components);
      }
      updateComponentsTable();
      simulationController.render();
    });
  }
  
  const acceleratorCheckbox = document.getElementById('acceleratorCheckbox');
  if (acceleratorCheckbox) {
    acceleratorCheckbox.addEventListener('change', e => {
      if (e.target.checked) {
        simulationController.addComponent('accelerator', canvas.width / 2, canvas.height / 2, 300, '#ffaa00');
      } else {
        simulationController.components = simulationController.components.filter(c => c.type !== 'accelerator');
        simulationController.physicsSimulator.setComponents(simulationController.components);
      }
      updateComponentsTable();
      simulationController.render();
    });
  }
  
  // ==================== CONTROLES DE DIBUJO ====================
  
  // Botones para modos de dibujo - Asegurándonos de que existen antes de agregar listeners
  const drawModeButton = document.getElementById('drawModeButton');
  if (drawModeButton) {
    drawModeButton.addEventListener('click', () => {
      simulationController.setMode('drawing');
      simulationController.setDrawingMode('free');
      updateToolButtons();
    });
  }
  
  const lineModeButton = document.getElementById('lineModeButton');
  if (lineModeButton) {
    lineModeButton.addEventListener('click', () => {
      simulationController.setMode('drawing');
      simulationController.setDrawingMode('line');
      updateToolButtons();
    });
  }
  
  const rectangleModeButton = document.getElementById('rectangleModeButton');
  if (rectangleModeButton) {
    rectangleModeButton.addEventListener('click', () => {
      simulationController.setMode('drawing');
      simulationController.setDrawingMode('rectangle');
      updateToolButtons();
    });
  }
  
  const circleModeButton = document.getElementById('circleModeButton');
  if (circleModeButton) {
    circleModeButton.addEventListener('click', () => {
      simulationController.setMode('drawing');
      simulationController.setDrawingMode('circle');
      updateToolButtons();
    });
  }
  
  // Botones de pinceles - Asegurándonos de que existen antes de agregar listeners
  const brush1Button = document.getElementById('brush1');
  if (brush1Button) {
    brush1Button.addEventListener('click', () => {
      simulationController.setBrush(1);
      updateToolButtons();
    });
  }
  
  const brush2Button = document.getElementById('brush2');
  if (brush2Button) {
    brush2Button.addEventListener('click', () => {
      simulationController.setBrush(2);
      updateToolButtons();
    });
  }
  
  const brush3Button = document.getElementById('brush3');
  if (brush3Button) {
    brush3Button.addEventListener('click', () => {
      simulationController.setBrush(3);
      updateToolButtons();
    });
  }
  
  // Control de tamaño de pincel
  const brushSizeInput = document.getElementById('brushSize');
  if (brushSizeInput) {
    brushSizeInput.addEventListener('input', (e) => {
      simulationController.setBrushSize(parseInt(e.target.value));
      const sizeDisplay = document.querySelector('.size-display');
      if (sizeDisplay) {
        sizeDisplay.textContent = `${e.target.value}px`;
      }
    });
  }
  
  // Función para actualizar estados visuales de botones
  function updateToolButtons() {
    // Quitar clases active
    document.querySelectorAll('.btn-outline-primary, .btn-outline-secondary').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Activar botón de modo
    if (simulationController.drawingMode === 'free') document.getElementById('drawModeButton')?.classList.add('active');
    if (simulationController.drawingMode === 'line') document.getElementById('lineModeButton')?.classList.add('active');
    if (simulationController.drawingMode === 'rectangle') document.getElementById('rectangleModeButton')?.classList.add('active');
    if (simulationController.drawingMode === 'circle') document.getElementById('circleModeButton')?.classList.add('active');
    
    // Activar botón de pincel
    document.getElementById(`brush${simulationController.currentBrush}`)?.classList.add('active');
  }
  
  // Botones adicionales de dibujo
  const simulationModeBtn = document.querySelector('[data-action="simulation-mode"]');
  if (simulationModeBtn) {
    simulationModeBtn.addEventListener('click', () => {
      simulationController.setMode('simulation');
      updateToolButtons();
    });
  }
  
  const clearDrawingBtn = document.querySelector('[data-action="clear-drawing"]');
  if (clearDrawingBtn) {
    clearDrawingBtn.addEventListener('click', () => {
      simulationController.clearDrawing();
    });
  }
  
  const convertDrawingBtn = document.querySelector('[data-action="convert-drawing"]');
  if (convertDrawingBtn) {
    convertDrawingBtn.addEventListener('click', () => {
      const success = simulationController.convertDrawingToComponents();
      if (success) {
        updateComponentsTable();
      } else {
        alert('No hay elementos dibujados para convertir');
      }
    });
  }
  
  // Eventos de dibujo en el canvas
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    simulationController.startDrawing(x, y);
  });
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    simulationController.continueDrawing(x, y);
    
    // Mostrar coordenadas
    const coordsDisplay = document.getElementById('canvasCoords');
    if (coordsDisplay) {
      coordsDisplay.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
    }
  });
  
  canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    simulationController.endDrawing(x, y);
  });
  
  // ==================== CONTROLES ADICIONALES ====================
  
  // Toggle de trayectorias
  const toggleTrajectoriesBtn = document.querySelector('[data-action="toggle-trajectories"]');
  if (toggleTrajectoriesBtn) {
    toggleTrajectoriesBtn.addEventListener('click', () => {
      simulationController.showTrajectories = !simulationController.showTrajectories;
      simulationController.renderer.setShowTrajectories(simulationController.showTrajectories);
      toggleTrajectoriesBtn.innerHTML = simulationController.showTrajectories ? 
        '<i class="fas fa-eye-slash me-1"></i>Ocultar Trayectorias' : 
        '<i class="fas fa-route me-1"></i>Mostrar Trayectorias';
      simulationController.render();
    });
  }
  
  // Toggle de campo eléctrico
  const toggleFieldBtn = document.querySelector('[data-action="toggle-field"]');
  if (toggleFieldBtn) {
    toggleFieldBtn.addEventListener('click', () => {
      simulationController.showElectricField = !simulationController.showElectricField;
      toggleFieldBtn.innerHTML = simulationController.showElectricField ? 
        '<i class="fas fa-eye-slash me-1"></i>Ocultar Campo' : 
        '<i class="fas fa-bolt me-1"></i>Mostrar Campo';
      simulationController.render();
    });
  }
  
  // Botón para simular física (Boris)
  const simulatePhysicsBtn = document.querySelector('[data-action="simulate-physics"]');
  if (simulatePhysicsBtn) {
    simulatePhysicsBtn.addEventListener('click', () => {
      runPhysicalSimulation();
    });
  }
  
  /**
   * Ejecuta simulación física usando el algoritmo de Boris
   */
  function runPhysicalSimulation() {
    // Si hay una implementación de physics.simulateParticleBoris
    if (window.physics && window.physics.simulateParticleBoris) {
      // Inicializar semilla si está especificada
      if (seedInput.value) Math.seedrandom(seedInput.value);
      
      // Obtener fotocátodo inicial
      const ph = simulationController.components.find(c => c.type === 'photocathode');
      if (!ph) return;
      
      // Configuración para la simulación
      const config = {
        t0: 0,
        // Convertir posición de píxeles a metros
        x0: [ph.x * simulationController.mPerPxX, ph.y * simulationController.mPerPxY, 0],
        v0: [2, 0, 0], // velocidad inicial en m/s
        Ex: (x, y) => simulationController.physicsSimulator.calculateElectricField(x, y).ex,
        Ey: (x, y) => simulationController.physicsSimulator.calculateElectricField(x, y).ey,
        Ez: () => 0,
        Bx: () => 0,
        By: () => 0,
        Bz: () => 0,
        anodo: simulationController.components.filter(c => c.type === 'anode'),
        dynodos: simulationController.components.filter(c => c.type === 'dinode'),
        tubo: { isInterior: () => true },
        accGrd: simulationController.components.filter(c => c.type === 'grid' || c.type === 'accelerator'),
        numdyn: [],
        traza: false,
        randangle: false,
        deltat: parseFloat(deltatInput.value) || 0.1
      };
      
      // Ejecutar simulación de Boris
      const result = window.physics.simulateParticleBoris(config);
      
      // Dibujar trayectoria resultante
      const path = result.y;
      if (!path || path.length === 0) return;
      
      // Obtener contexto de dibujo
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      
      // Convertir primer punto de m->px y comenzar trayectoria
      ctx.moveTo(
        path[0][0] / simulationController.mPerPxX, 
        path[0][1] / simulationController.mPerPxY
      );
      
      // Dibujar resto de la trayectoria
      path.forEach(pt => {
        const px = pt[0] / simulationController.mPerPxX;
        const py = pt[1] / simulationController.mPerPxY;
        ctx.lineTo(px, py);
      });
      
      ctx.stroke();
    } else {
      console.error("El módulo physics.simulateParticleBoris no está disponible");
    }
  }
  
  // ==================== FUNCIONES DE ESTADO DE LA INTERFAZ ====================
  
  /**
   * Actualiza el estado visual de la simulación
   * @param {string} status - Estado ('ready', 'running', 'paused')
   */
  function updateSimulationStatus(status) {
    const statusBadge = document.getElementById('simulationStatus');
    if (!statusBadge) return;
    
    const statusDot = statusBadge.querySelector('.status-dot') || document.createElement('i');
    statusDot.className = 'fas fa-circle status-dot';
    
    switch(status) {
      case 'running':
        statusBadge.innerHTML = '<i class="fas fa-circle status-dot"></i>Simulando';
        statusDot.style.color = 'var(--warning-amber, #FFC107)';
        break;
      case 'paused':
        statusBadge.innerHTML = '<i class="fas fa-circle status-dot"></i>Pausado';
        statusDot.style.color = 'var(--danger-red, #DC3545)';
        break;
      default:
        statusBadge.innerHTML = '<i class="fas fa-circle status-dot"></i>Listo';
        statusDot.style.color = 'var(--success-green, #28A745)';
    }
  }
  
  /**
   * Actualiza la información en tiempo real
   */
  function updateRealTimeInfo() {
    // Si los elementos existen
    if (totalEnergyElement && electronCountElement) {
      // Actualizar energía total
      const totalEnergy = simulationController.physicsSimulator.calculateTotalEnergy(simulationController.particles);
      totalEnergyElement.textContent = totalEnergy.toFixed(2);
      
      // Actualizar conteo de electrones
      const electronCount = simulationController.particles.filter(p => p.type === 'electron').length;
      electronCountElement.textContent = electronCount;
    }
  }
  
  // ==================== ATAJOS DE TECLADO ====================
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) return; // Evitar conflictos con atajos del navegador
    
    switch(e.key.toLowerCase()) {
      case 'd':
        simulationController.setMode('drawing');
        simulationController.setDrawingMode('free');
        updateToolButtons();
        e.preventDefault();
        break;
      case 'l':
        simulationController.setMode('drawing');
        simulationController.setDrawingMode('line');
        updateToolButtons();
        e.preventDefault();
        break;
      case 'r':
        simulationController.setMode('drawing');
        simulationController.setDrawingMode('rectangle');
        updateToolButtons();
        e.preventDefault();
        break;
      case 'c':
        simulationController.setMode('drawing');
        simulationController.setDrawingMode('circle');
        updateToolButtons();
        e.preventDefault();
        break;
      case 's':
        simulationController.setMode('simulation');
        updateToolButtons();
        e.preventDefault();
        break;
      case 'escape':
        if (!simulationController.isSimulationMode) {
          simulationController.clearDrawing();
        }
        e.preventDefault();
        break;
      case '1':
      case '2':
      case '3':
        simulationController.setBrush(parseInt(e.key));
        updateToolButtons();
        e.preventDefault();
        break;
      case ' ': // Barra espaciadora
        if (simulationController.animationFrameId) {
          simulationController.stop();
          updateSimulationStatus('paused');
        } else {
          simulationController.start();
          updateSimulationStatus('running');
        }
        e.preventDefault();
        break;
    }
  });
  
  // ==================== INICIALIZACIÓN FINAL ====================
  
  // Actualizar tabla de componentes con los valores iniciales
  updateComponentsTable();
  
  // Establecer estado inicial
  updateSimulationStatus('ready');
  
  // Exponer funciones para pruebas
  window.simulationController = simulationController;
});