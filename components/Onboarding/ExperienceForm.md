*/Formulario para recoger la experiencia del usuario y mostrar el análisis generado.*/
+Incluye un botón de `Tips` que abre un `Modal` reutilizable.
+
+## Props
+- `text`: contenido del textarea.
+- `onChange`: manejador de cambio.
+- `isAnalyzing`: estado de análisis.
+- `experienceAreas`: resultados procesados.
+
+## Uso
+```tsx
+<ExperienceForm
+  text={text}
+  onChange={setText}
+  isAnalyzing={isAnalyzing}
+  experienceAreas={areas}
+/>
+```
