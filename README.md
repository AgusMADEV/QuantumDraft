# Simulador de Fotomultiplicador 2D

Este proyecto provee un entorno interactivo para modelar y visualizar el comportamiento de un fotomultiplicador en dos dimensiones. Utiliza HTML5 Canvas, JavaScript puro y el algoritmo de Boris para simular el movimiento de electrones bajo campos eléctricos, además de ofrecer un modo de dibujo a mano libre para crear geometrías personalizadas.

## Características principales

1. **Simulación de Partículas**

   - Emisión de fotones desde el fotocátodo al pulsar "Play".
   - Generación y seguimiento de electrones secundarios tras colisiones en dinodos.
   - Algoritmo de Boris para integración precisa de la trayectoria en campos eléctricos.
   - Modelos de amplificación de dinodos:
     - Simple: parámetros **r** y **β** editables.
     - Avanzado: 8 parámetros físicos (φ_w, φ₀, σ_E, E₀, α, γ, λ) con UI dinámica.
   - Visualización de trayectorias de partículas (opción de mostrar/ocultar).

2. **Interfaz de Usuario**

   - Panel de controles con botones para reproducir, reiniciar, cargar/guardar geometrías y alternar opciones:
     - Photocathode, Grid, Accelerator (checkbox).
     - Número de dinodos ajustable (4 a 20).
     - Alternar visualización de trayectorias.
   - Tabla interactiva para agregar, editar y eliminar componentes:
     - Posición (X, Y), voltaje, color y modelo de amplificación.
   - Panel de información en tiempo real: energía total de las partículas y recuento de electrones.

3. **Modo de Dibujo Personalizado**

   - Herramientas de dibujo (libre, línea, rectángulo, círculo).
   - Selección de pinceles y tamaño regulable.
   - Conversión de trazos a polígonos para tratarlos como componentes del fotomultiplicador.
   - Exportación e importación de geometrías con dibujos en JSON.
   - Indicador de modo (Simulación vs Dibujo) y atajos de teclado:
     - `D`: dibujo libre, `L`: línea, `R`: rectángulo, `C`: círculo, `S`: simulación, `ESC`: limpiar dibujo.

4. **Carga y Exportación de Geometrías**

   - Formato JSON con listado de componentes y sus propiedades.
   - Soporte de archivos de texto (`.txt`) estilo Agustín, parseando secciones de geometría y voltajes.
   - Escalado automático de coordenadas mm→px según dimensiones del canvas.

5. **Módulo de Física (`physics.js`)**
   - Constantes físicas reales (carga y masa del electrón, velocidad de la luz).
   - Implementación del algoritmo Boris para integración en campos eléctricos bidimensionales.
   - Detección de colisiones con ánodo, grid y dinodos, cálculo de energía de impacto y generación de electrones secundarios.
   - Funciones auxiliares de álgebra vectorial y SEY.

## Instalación y puesta en marcha

1. Clona este repositorio en tu máquina:
   ```bash
   git clone https://github.com/tu-usuario/QuantumDraft.git
   cd QuantumDraft
   ```
2. Abre `index.html` en tu navegador favorito (no requiere servidor, aunque puedes usar uno local si lo prefieres).
3. ¡Listo! Comienza a explorar la simulación o crea tus propias geometrías con el modo de dibujo.

## Uso interactivo y tests
  - Levantar servidor local (opcional, para Cypress):
    ```bash
    npm install
    npm run serve       # abre http://localhost:8080
    ```
  - Ejecutar tests de interfaz (Cypress):
    ```bash
    npm run cy:open     # abrir GUI de Cypress
    npm run cy:run      # correr e2e en headless
    ```
  - Ejecutar tests de física:
    ```bash
    npm test            # corre tests de physics.js
    ```

## Estructura del proyecto

```
QuantumDraft/
├── index.html          # Interfaz principal con Canvas y controles
├── app.js              # Lógica de simulación, UI y dibujo interactivo
├── physics.js          # Implementación del algoritmo de Boris y SEY
├── agustin.txt         # Ejemplo de archivo de geometría y voltajes
├── checklist.md        # Guía de tareas y progreso del proyecto
├── README.md           # Documentación general (este archivo)
└── ramas (1).m         # Código original MATLAB de referencia
├── cypress/              # tests e2e y capturas de pantalla
├── tests/                # tests unitarios (Node.js) para física
└── styles.css            # estilos personalizados
└── manifest.json, sw.js  # PWA manifest y service worker
```

## Contribuir

Si deseas mejorar este proyecto:

- Abre un _issue_ para reportar errores o sugerir nuevas funcionalidades.
- Realiza un _fork_, crea una rama con tus cambios y envía un _pull request_.

## Licencia

Este proyecto está bajo licencia MIT. Puedes usarlo y adaptarlo libremente con atribución adecuada.
