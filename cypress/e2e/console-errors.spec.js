/// <reference types="cypress" />

describe('Console Error Tests', () => {
  // Array para almacenar errores de consola detectados
  const consoleErrors = [];
  
  // Antes de cada test, limpiar los errores registrados
  beforeEach(() => {
    // Limpiar el array de errores
    consoleErrors.length = 0;
    
    // Capturar errores de consola
    cy.on('window:console', (msg) => {
      if (msg.type === 'error') {
        consoleErrors.push(msg.message);
      }
    });

    // Capturar errores no controlados (excepciones)
    cy.on('uncaught:exception', (err) => {
      consoleErrors.push(err.message);
      // Retornar false para evitar que Cypress falle la prueba y poder evaluarla manualmente
      return false;
    });
    
    // Visitar la página principal usando la ruta de archivo local
    cy.visit('index.html', {
      // Permitir la carga de archivo local
      headers: {
        'Accept': 'text/html'
      }
    });
    
    // Esperar a que la aplicación se inicialice completamente
    cy.wait(1000);
  });

  it('No debe tener errores de consola al cargar la página', () => {
    // Verificar que no hay errores
    cy.wrap(consoleErrors).should('have.length', 0, `Se detectaron ${consoleErrors.length} errores: ${consoleErrors.join(', ')}`);
  });

  it('No debe tener errores al inicializar el controlador de simulación', () => {
    // Intentar acceder al simulador desde el objeto window
    cy.window().then((win) => {
      // Verificar que simulationController existe y está correctamente inicializado
      expect(win.simulationController).to.exist;
      
      // Verificar que PhysicsSimulator existe y está correctamente inicializado
      expect(win.simulationController.physicsSimulator).to.exist;
      
      // Verificar que no hay errores específicos de "PhysicsSimulator is not defined"
      const physicSimulatorErrors = consoleErrors.filter(err => 
        err.includes('PhysicsSimulator') || err.includes('Particle')
      );
      expect(physicSimulatorErrors).to.have.length(0);
    });
  });

  it('Debe cargar correctamente todos los componentes esenciales', () => {
    cy.window().then((win) => {
      // Verificar que los componentes principales existen
      expect(win.Component).to.exist;
      expect(win.Particle).to.exist;
      expect(win.PhysicsSimulator).to.exist;
      expect(win.CanvasRenderer).to.exist;
      expect(win.ChartManager).to.exist;
      expect(win.SimulationController).to.exist;
      
      // Verificar que no hay duplicados de Particle
      const particleErrors = consoleErrors.filter(err => 
        err.includes('Identifier \'Particle\' has already been declared')
      );
      expect(particleErrors).to.have.length(0);
    });
  });
  
  it('Debe cargar y ejecutar la física correctamente', () => {
    // Iniciar la simulación haciendo clic en el botón play
    cy.get('#playButton').click();
    
    // Esperar un momento para que la simulación avance
    cy.wait(1000);
    
    // Detener la simulación para evitar errores en otras pruebas
    cy.get('#resetButton').click();
    
    // Verificar que no se generaron errores durante la simulación
    cy.wrap(consoleErrors).should('have.length', 0);
  });
});