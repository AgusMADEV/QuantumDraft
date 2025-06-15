/**
 * Framework de pruebas simple para QuantumDraft
 * Permite ejecutar pruebas unitarias, de integración y end-to-end
 */

// Contador global de pruebas
const TestFramework = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    suites: [],
    currentSuite: null,
    
    // Iniciar una nueva suite de pruebas
    suite: function(name, fn) {
        this.currentSuite = {
            name: name,
            tests: [],
            passed: 0,
            failed: 0
        };
        
        this.suites.push(this.currentSuite);
        fn();
        this.currentSuite = null;
    },
    
    // Definir un caso de prueba
    test: function(description, fn) {
        if (!this.currentSuite) {
            console.error("Error: test debe ejecutarse dentro de una suite");
            return;
        }
        
        this.totalTests++;
        const testCase = {
            description: description,
            passed: false,
            errors: []
        };
        
        this.currentSuite.tests.push(testCase);
        
        try {
            fn();
            testCase.passed = true;
            this.passedTests++;
            this.currentSuite.passed++;
        } catch (error) {
            testCase.passed = false;
            testCase.errors.push(error.message || error);
            this.failedTests++;
            this.currentSuite.failed++;
        }
    },
    
    // Aserción de igualdad
    assertEquals: function(expected, actual, message) {
        if (expected !== actual) {
            throw new Error(
                `${message || 'Aserción fallida'}: esperado ${expected}, obtenido ${actual}`
            );
        }
    },
    
    // Aserción de aproximadamente igual (para valores flotantes)
    assertApprox: function(expected, actual, tolerance, message) {
        if (Math.abs(expected - actual) > tolerance) {
            throw new Error(
                `${message || 'Aserción fallida'}: esperado ${expected} ± ${tolerance}, obtenido ${actual}`
            );
        }
    },
    
    // Verificar si un valor es verdadero
    assertTrue: function(value, message) {
        if (!value) {
            throw new Error(`${message || 'Aserción fallida'}: valor no es true`);
        }
    },
    
    // Verificar si un valor es falso
    assertFalse: function(value, message) {
        if (value) {
            throw new Error(`${message || 'Aserción fallida'}: valor no es false`);
        }
    },
    
    // Verificar si un objeto no es null/undefined
    assertNotNull: function(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`${message || 'Aserción fallida'}: valor es null o undefined`);
        }
    },
    
    // Verificar que una función lanza un error
    assertThrows: function(fn, errorType, message) {
        try {
            fn();
            throw new Error(`${message || 'Aserción fallida'}: no se lanzó ningún error`);
        } catch (error) {
            if (errorType && !(error instanceof errorType)) {
                throw new Error(
                    `${message || 'Aserción fallida'}: error no es del tipo esperado`
                );
            }
        }
    },
    
    // Mostrar resultados
    showResults: function() {
        console.log(`--- Resultados de pruebas ---`);
        console.log(`Total: ${this.totalTests}, Pasadas: ${this.passedTests}, Fallidas: ${this.failedTests}`);
        
        this.suites.forEach(suite => {
            console.log(`\nSuite: ${suite.name} - Pasadas: ${suite.passed}, Fallidas: ${suite.failed}`);
            
            suite.tests.forEach(test => {
                if (test.passed) {
                    console.log(`  ✓ ${test.description}`);
                } else {
                    console.log(`  ✗ ${test.description}`);
                    test.errors.forEach(error => {
                        console.error(`    - ${error}`);
                    });
                }
            });
        });
        
        // Crear elemento en DOM para mostrar resultados si estamos en navegador
        if (typeof document !== 'undefined') {
            const resultDiv = document.createElement('div');
            resultDiv.id = 'test-results';
            resultDiv.style.padding = '20px';
            resultDiv.style.margin = '20px';
            resultDiv.style.border = '1px solid #ddd';
            resultDiv.style.borderRadius = '5px';
            
            const totalBar = document.createElement('div');
            totalBar.style.height = '30px';
            totalBar.style.display = 'flex';
            totalBar.style.marginBottom = '20px';
            
            const passWidth = this.totalTests > 0 ? (this.passedTests / this.totalTests * 100) : 0;
            
            const passBar = document.createElement('div');
            passBar.style.width = `${passWidth}%`;
            passBar.style.backgroundColor = '#4CAF50';
            passBar.style.height = '100%';
            passBar.textContent = `${this.passedTests}`;
            passBar.style.color = 'white';
            passBar.style.textAlign = 'center';
            
            const failBar = document.createElement('div');
            failBar.style.width = `${100 - passWidth}%`;
            failBar.style.backgroundColor = '#F44336';
            failBar.style.height = '100%';
            failBar.textContent = `${this.failedTests}`;
            failBar.style.color = 'white';
            failBar.style.textAlign = 'center';
            
            totalBar.appendChild(passBar);
            totalBar.appendChild(failBar);
            
            const resultHeader = document.createElement('h2');
            resultHeader.textContent = `Resultados de pruebas (${this.passedTests}/${this.totalTests} pasadas)`;
            
            resultDiv.appendChild(resultHeader);
            resultDiv.appendChild(totalBar);
            
            this.suites.forEach(suite => {
                const suiteDiv = document.createElement('div');
                suiteDiv.style.marginBottom = '15px';
                suiteDiv.style.padding = '10px';
                suiteDiv.style.backgroundColor = suite.failed > 0 ? '#FFEBEE' : '#E8F5E9';
                suiteDiv.style.borderRadius = '5px';
                
                const suiteTitle = document.createElement('h3');
                suiteTitle.textContent = `${suite.name} - Pasadas: ${suite.passed}, Fallidas: ${suite.failed}`;
                suiteDiv.appendChild(suiteTitle);
                
                const testList = document.createElement('ul');
                testList.style.paddingLeft = '20px';
                
                suite.tests.forEach(test => {
                    const testItem = document.createElement('li');
                    testItem.style.marginBottom = '5px';
                    
                    if (test.passed) {
                        testItem.innerHTML = `<span style="color:#4CAF50">✓</span> ${test.description}`;
                    } else {
                        testItem.innerHTML = `<span style="color:#F44336">✗</span> ${test.description}`;
                        
                        if (test.errors.length > 0) {
                            const errorList = document.createElement('ul');
                            errorList.style.color = '#F44336';
                            
                            test.errors.forEach(error => {
                                const errorItem = document.createElement('li');
                                errorItem.textContent = error;
                                errorList.appendChild(errorItem);
                            });
                            
                            testItem.appendChild(errorList);
                        }
                    }
                    
                    testList.appendChild(testItem);
                });
                
                suiteDiv.appendChild(testList);
                resultDiv.appendChild(suiteDiv);
            });
            
            document.body.appendChild(resultDiv);
        }
        
        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.failedTests
        };
    },
    
    // Limpiar resultados para una nueva ejecución
    clearResults: function() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.suites = [];
        this.currentSuite = null;
        
        if (typeof document !== 'undefined') {
            const oldResults = document.getElementById('test-results');
            if (oldResults) {
                oldResults.remove();
            }
        }
    }
};

// Atajos para métodos comunes para facilitar escritura de pruebas
const suite = TestFramework.suite.bind(TestFramework);
const test = TestFramework.test.bind(TestFramework);
const assertEquals = TestFramework.assertEquals.bind(TestFramework);
const assertApprox = TestFramework.assertApprox.bind(TestFramework);
const assertTrue = TestFramework.assertTrue.bind(TestFramework);
const assertFalse = TestFramework.assertFalse.bind(TestFramework);
const assertNotNull = TestFramework.assertNotNull.bind(TestFramework);
const assertThrows = TestFramework.assertThrows.bind(TestFramework);
const showResults = TestFramework.showResults.bind(TestFramework);
const clearResults = TestFramework.clearResults.bind(TestFramework);