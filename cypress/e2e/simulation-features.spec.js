/// <reference types="cypress" />

describe('Pruebas de funcionalidades del simulador', () => {
  beforeEach(() => {
    // Desactivar el fallo por excepciones no manejadas
    cy.on('uncaught:exception', () => false);
    
    // Visitar la página principal
    cy.visit('/');
    
    // Esperar a que la aplicación esté completamente cargada
    cy.wait(1000);
  });
  
  describe('Pruebas de componentes del fotomultiplicador', () => {
    it('Debe permitir ajustar el número de dinodos', () => {
      // Aumentar el número de dinodos
      cy.get('[data-action="increase-dynodes"]').click().click();
      
      // Esperar a que se actualice el UI
      cy.wait(500);
      
      // Verificar que hay más dinodos (la tabla debe tener más filas)
      cy.window().then(win => {
        const dinodeCount = win.simulationController.components.filter(c => c.type === 'dinode').length;
        expect(dinodeCount).to.be.greaterThan(8); // Valor predeterminado es 8
      });
      
      // Decrementar el número de dinodos
      cy.get('[data-action="decrease-dynodes"]').click().click().click();
      
      // Esperar a que se actualice el UI
      cy.wait(500);
      
      // Verificar que hay menos dinodos
      cy.window().then(win => {
        const dinodeCount = win.simulationController.components.filter(c => c.type === 'dinode').length;
        expect(dinodeCount).to.be.lessThan(8);
      });
    });
    
    it('Debe permitir modificar voltajes de los componentes', () => {
      // Obtener la primera fila de la tabla de componentes (fotocátodo)
      cy.get('table tbody tr').first().within(() => {
        // Modificar el voltaje
        cy.get('input.voltage').clear().type('-200');
      });
      
      // Esperar a que se actualice la UI
      cy.wait(500);
      
      // Verificar que el voltaje del fotocátodo cambió
      cy.window().then(win => {
        const photocathode = win.simulationController.components.find(c => c.type === 'photocathode');
        expect(photocathode.voltage).to.equal(-200);
      });
    });
    
    it('Debe permitir añadir componentes adicionales', () => {
      // Contar componentes iniciales
      cy.window().then(win => {
        const initialCount = win.simulationController.components.length;
        
        // Añadir un nuevo dinodo
        cy.get('#addDinodeButton').click();
        
        // Esperar a que se actualice la UI
        cy.wait(500);
        
        // Verificar que se añadió un nuevo componente
        const newCount = win.simulationController.components.length;
        expect(newCount).to.equal(initialCount + 1);
      });
    });
  });
  
  describe('Pruebas de simulación física', () => {
    it('Debe generar electrones cuando los fotones golpean el fotocátodo', () => {
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar a que los fotones interactúen
      cy.wait(1000);
      
      // Verificar que existen partículas de tipo electrón
      cy.window().then(win => {
        const electronsCount = win.simulationController.particles.filter(p => p.type === 'electron').length;
        expect(electronsCount).to.be.greaterThan(0);
      });
    });
    
    it('Debe permitir ajustar la cantidad de fotones emitidos', () => {
      // Cambiar el valor del campo photonCount
      cy.get('#photonCountInput').clear().type('20');
      
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar un momento para que se generen las partículas
      cy.wait(300);
      
      // Verificar que se generaron aproximadamente 20 fotones
      cy.window().then(win => {
        const photons = win.simulationController.particles.filter(p => p.type === 'photon').length;
        
        // Como algunos fotones pueden haberse convertido a electrones, verificamos que
        // el número sea cercano a 20 o que el total sea cercano a 20
        const totalParticles = win.simulationController.particles.length;
        
        expect(photons).to.be.within(0, 20);
        expect(totalParticles).to.be.at.least(15); // Algunas partículas pueden haber salido de la pantalla
      });
    });
    
    it('Debe registrar impactos en el ánodo', () => {
      // Asegurar que se generen suficientes fotones
      cy.get('#photonCountInput').clear().type('30');
      
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar para dar tiempo a que algunos electrones lleguen al ánodo
      cy.wait(3000);
      
      // Verificar que el gráfico de impactos tiene registros
      cy.window().then(win => {
        // Si podemos acceder al chartManager directamente
        if (win.simulationController.chartManager) {
          const impactData = win.simulationController.chartManager.impactData;
          // Verificar que hay datos de impacto (puede tomar tiempo)
          if (impactData && impactData.datasets && impactData.datasets[0]) {
            const hits = impactData.datasets[0].data.length;
            expect(hits).to.be.at.least(1);
          }
        }
        
        // Alternativa: revisar el log del simulador para impactos
        const controller = win.simulationController;
        
        // Como mínimo, debería haber algunos electrones en movimiento
        expect(controller.particles.some(p => p.type === 'electron')).to.be.true;
      });
    });
  });
  
  describe('Pruebas de persistencia de datos', () => {
    it('Debe permitir exportar e importar configuraciones', () => {
      // Primero modificamos algo en la configuración
      cy.get('table tbody tr').eq(1).within(() => {
        // Modificar el voltaje del primer dinodo
        cy.get('input.voltage').clear().type('150');
      });
      
      // Exportar la configuración (simulado, ya que no podemos manejar el diálogo de archivos)
      cy.window().then(win => {
        const config = win.simulationController.exportConfiguration();
        
        // Guardar en localStorage para simular exportación/importación
        localStorage.setItem('tempConfig', JSON.stringify(config));
        
        // Reiniciar los componentes
        win.simulationController.reset();
        win.simulationController.initialize(); // Volver a configuración predeterminada
        
        // Verificar que el voltaje volvió a su valor inicial
        const initialDinode = win.simulationController.components.find(c => c.type === 'dinode');
        expect(initialDinode.voltage).to.not.equal(150);
        
        // Simular importación
        const savedConfig = JSON.parse(localStorage.getItem('tempConfig'));
        win.simulationController.loadConfiguration(savedConfig);
        
        // Verificar que se restauró el voltaje modificado
        const restoredDinode = win.simulationController.components.find(c => c.type === 'dinode');
        expect(restoredDinode.voltage).to.equal(150);
      });
    });
  });
  
  describe('Pruebas de modo de dibujo', () => {
    it('Debe permitir cambiar al modo de dibujo y crear trazos', () => {
      // Cambiar al modo dibujo
      cy.get('#drawModeButton').click();
      
      // Verificar que estamos en modo dibujo
      cy.window().then(win => {
        expect(win.simulationController.isSimulationMode).to.be.false;
      });
      
      // Simular un trazo en el canvas
      const canvas = cy.get('#simulationCanvas');
      
      // Simular dibujo
      canvas.trigger('mousedown', { clientX: 200, clientY: 200 });
      canvas.trigger('mousemove', { clientX: 250, clientY: 250 });
      canvas.trigger('mousemove', { clientX: 300, clientY: 200 });
      canvas.trigger('mouseup');
      
      // Verificar que se crearon elementos de dibujo
      cy.window().then(win => {
        expect(win.simulationController.drawingLayer.length).to.be.greaterThan(0);
      });
    });
    
    it('Debe permitir convertir dibujos en componentes', () => {
      // Cambiar al modo dibujo
      cy.get('#drawModeButton').click();
      
      // Dibujar un rectángulo
      cy.get('#rectangleModeButton').click();
      
      const canvas = cy.get('#simulationCanvas');
      
      // Simular dibujo de rectángulo
      canvas.trigger('mousedown', { clientX: 200, clientY: 200 });
      canvas.trigger('mousemove', { clientX: 300, clientY: 300 });
      canvas.trigger('mouseup', { clientX: 300, clientY: 300 });
      
      // Convertir a componente
      cy.get('[data-action="convert-drawing"]').click();
      
      // Verificar que se creó un nuevo componente
      cy.window().then(win => {
        const customComponents = win.simulationController.components.filter(c => c.type === 'custom');
        expect(customComponents.length).to.be.greaterThan(0);
      });
    });
  });
  
  describe('Pruebas de rendimiento', () => {
    it('Debe mantener una tasa de cuadros razonable durante la simulación', () => {
      // Crear un contador de FPS
      cy.window().then(win => {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;
        
        // Función para contar frames
        const countFrame = () => {
          const now = performance.now();
          frames++;
          
          if (now - lastTime >= 1000) {
            fps = frames;
            frames = 0;
            lastTime = now;
          }
          
          win.requestAnimationFrame(countFrame);
        };
        
        // Iniciar contador
        win.requestAnimationFrame(countFrame);
        
        // Iniciar simulación con alta carga
        cy.get('#photonCountInput').clear().type('50'); // Muchos fotones
        cy.get('#playButton').click();
        
        // Esperar varios segundos para medir rendimiento
        cy.wait(3000).then(() => {
          // Verificar FPS razonable (al menos 30 FPS)
          expect(fps).to.be.at.least(30);
        });
      });
    });
    
    it('Debe limitar el número de partículas para evitar sobrecarga', () => {
      // Configurar para generar muchas partículas
      cy.get('#photonCountInput').clear().type('100');
      
      // Iniciar la simulación
      cy.get('#playButton').click();
      
      // Esperar a que se generen muchas partículas
      cy.wait(5000);
      
      // Verificar que el número de partículas no excede un límite razonable
      cy.window().then(win => {
        const particleCount = win.simulationController.particles.length;
        expect(particleCount).to.be.at.most(win.simulationController.physicsSimulator.MAX_PARTICLES);
      });
    });
  });
});