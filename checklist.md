# Checklist del Proyecto: Simulador de Fotomultiplicador

**Nota:** Cada vez que completes una tarea o avance, marca el ítem correspondiente como `[x]` en este checklist.

## **1. Configuración Inicial**

- [x] Crear estructura básica del proyecto.
- [x] Configurar `index.html` con un `<canvas>` y una tabla interactiva.
- [x] Crear `app.js` para manejar la lógica inicial.

## **2. Canvas y Animación**

- [x] Configurar el `<canvas>` para dibujar partículas y componentes.
- [x] Crear un bucle de animación para actualizar las partículas.

## **3. Tabla Interactiva**

- [x] Crear tabla HTML para agregar y editar componentes.
- [x] Implementar funcionalidad para agregar componentes dinámicamente.
- [x] Sincronizar cambios de la tabla con el canvas.

## **4. Carga y Exportación de JSON**

- [x] Implementar función para cargar geometrías desde un archivo JSON.
- [x] Implementar función para exportar geometrías a un archivo JSON.

## **5. Cálculo del Campo Eléctrico**

- [x] Implementar cálculo del campo eléctrico en 2D.
- [ ] Usar librería matemática para simplificar cálculos (opcional).

## **6. Movimiento de Partículas**

- [x] Implementar ecuaciones de movimiento (Euler o Runge-Kutta).
- [x] Actualizar posiciones de partículas en el bucle de animación.
- [x] Implementar colisiones con componentes y amplificación.

## **7. Modelos de Amplificación**

- [x] Implementar modelo sencillo de amplificación y exponer inputs r/β en la tabla de dinodos.
- [x] Implementar modelo avanzado con parámetros físicos (φ₆, φ₀, σ_E, E₀, α, γ, λ) y UI.

## **8. Interfaz de Usuario Mejorada**

- [x] Mostrar valores en tiempo real (energía, número de electrones).
- [x] Agregar estilos adicionales para mejorar la experiencia visual.

## **9. Optimización y Documentación**

- [x] Optimizar rendimiento del canvas y la física.
- [x] Comentar el código extensivamente.
- [x] Crear documentación básica para usuarios.

## **FASE 2: Extensión de la Funcionalidad**

- [x] Incluir Grid y Accelerator en la tabla como elementos opcionales con checkbox y k=1 fijo.
- [x] Añadir Photocathode y Anode como filas obligatorias en la tabla, con k=1 fijo.
- [x] Habilitar configuración de voltaje y color para Photocathode y Anode.
- [x] Implementar control del número de dinodos (4 a 20) con botones (+ / -) en la interfaz.
- [x] Implementar emisión de fotones desde el Photocathode al pulsar "Play".
- [x] Integrar una librería matemática (p. ej. math.js) para cálculo de campos eléctricos (opcional).
- [x] Traducir el programa Matlab de ecuaciones de movimiento a JavaScript y validar la fidelidad física.

## **FASE 3: Integración Avanzada de Geometría y Física**

- [x] Parsear voltajes desde `agustin.txt` y asignar automáticamente a cada componente.
- [x] Convertir la geometría cargada en polígonos y dibujarlos en el canvas.
- [x] Implementar detección de colisiones punto-polígono para cada componente según su forma real.
- [x] Portar el algoritmo completo de `ramas.m`, incluyendo el método de Boris, en `physics.js`.
- [x] Añadir la función `seyfunct` con parámetros del paper para la amplificación avanzada.
- [x] Establecer la transformación de unidades (mm → px) y posicionamiento de coordenadas.
- [x] Visualizar trayectorias sobre la geometría real cargada.

## **FASE 4: Sistema de Dibujo a Mano Libre**

- [x] Implementar modo de dibujo a mano libre en el canvas.
- [x] Agregar herramientas de dibujo (pincel libre, líneas, rectángulos, círculos).
- [x] Crear sistema de capas para separar dibujo de simulación.
- [x] Implementar control de tamaño y color de pincel.
- [x] Agregar función para convertir dibujos a componentes del fotomultiplicador.
- [x] Implementar exportación e importación de dibujos junto con geometría.
- [x] Añadir atajos de teclado para herramientas de dibujo.
- [x] Crear indicador visual de modo actual (simulación vs dibujo).
- [x] Integrar detección de colisiones para componentes dibujados a mano.
- [x] Implementar función de limpieza selectiva de dibujos.

## **FASE 5: Extensiones Académicas y Funcionalidades Avanzadas**

- [x] Integrar `physics.simulateParticleBoris` para simular trayectorias reales de electrones y fotones.
- [x] Ajustar escalas y unidades (mm ↔ m, eV) para que los gráficos reflejen datos físicos con precisión.
- [x] Incorporar panel de parámetros globales: paso de tiempo (`deltat`), número de fotones iniciales, semilla aleatoria.
- [x] Añadir gráficas en tiempo real: corriente en ánodo vs tiempo y distribución espacial de impactos.
- [x] Permitir guardar y restaurar configuraciones completas (geometría, dibujos, parámetros físicos).
- [x] Crear experimentos preconfigurados para demostraciones: vacío, variación de voltajes, comparación de modelos.
- [x] Optimizar el rendimiento del bucle de partículas (Web Workers o WebGL) para mayor número de electrones.
- [x] Desarrollar tests unitarios automáticos para validar el módulo de física contra referencias de MATLAB.
- [x] Empaquetar como PWA o aplicación de escritorio (Electron) para despliegue sencillo en entornos de aula.

## **FASE 6: Extensiones Avanzadas de Visualización y Simulación**

- [ ] Soporte de campo magnético 3D y simulaciones en 3D.
- [ ] Importación de geometrías complejas (STL, OBJ) con mapeo de materiales.
- [ ] Visualización volumétrica de trayectorias y densidades con Three.js o WebGL.
- [ ] Cálculo y gráfica de tiempo de vuelo de electrones y distribución temporal.
