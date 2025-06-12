describe('Smoke Test - UI Buttons', () => {
  // Ignorar excepciones no relacionadas en la aplicación
  before(() => {
    cy.on('uncaught:exception', () => false);
  });
  // Antes de cada prueba, recargar la página limpia
  beforeEach(() => {
    cy.visit('/');
  });

  it('Should click key buttons without error', () => {
    const selectors = [
      '#playButton',
      '#resetButton',
      '#loadJsonButton',
      '#exportJsonButton',
      '#saveConfigButton',
      '#loadConfigButton',
      '#loadPresetButton',
      '#drawModeButton',
      '#lineModeButton',
      '#rectangleModeButton',
      '#circleModeButton',
      '#brush1',
      '#brush2',
      '#brush3'
    ];
    selectors.forEach(sel => {
      cy.get(sel).should('be.visible').click({ force: true });
      cy.wait(200);
    });
  });

  it('Should toggle presets and checkboxes', () => {
    cy.get('#presetSelect').should('be.visible');
    const presets = ['vacío','variacionVoltajes','compararModelos'];
    presets.forEach(p => {
      cy.get('#presetSelect').select(p);
      cy.get('#loadPresetButton').click({ force: true });
      cy.wait(200);
    });
    cy.get('#gridCheckbox').should('exist').check().wait(200).uncheck().wait(200);
    cy.get('#acceleratorCheckbox').should('exist').check().wait(200).uncheck().wait(200);
  });
});