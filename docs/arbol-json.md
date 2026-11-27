# Formato JSON del árbol

Productivitree puede alimentarse entero con un JSON sencillo (botón **Importar / exportar** en la ficha del árbol).
Sirve para escribir el árbol a mano, pedírselo a una IA o generarlo desde otra herramienta.
No es la copia de seguridad completa: esa se guarda y restaura desde **Privacidad y ajustes**.

Importar **reemplaza** el árbol actual (ramas, hojas, frutos, pasiones, experiencia y apps). Exporta antes si dudas.

## Estructura

```json
{
  "productivitree": 1,
  "purpose": "Safer future",
  "passions": ["Nature", { "name": "Root problem", "description": "…" }],
  "experience": ["Mechanical Engineering", "Personal expertise"],
  "apps": [
    { "id": "notas", "name": "Bear", "kind": "bear", "openUrl": "bear://x-callback-url/search?tag={etiqueta}", "tracking": "manual" }
  ],
  "branches": [
    {
      "name": "Storytelling",
      "priority": 4,
      "status": "active",
      "app": "notas",
      "passion": "Root problem",
      "side": "right",
      "height": 0.85,
      "leaves": [
        { "name": "Final del cuento 7", "lastActivity": 1 },
        { "name": "Cuento 4", "lastActivity": "2026-10-01", "done": true, "notes": "…", "link": "https://…" }
      ],
      "fruits": [{ "name": "Absurd Tales", "harvested": true, "link": "https://…" }]
    }
  ]
}
```

| Campo | Qué es |
| --- | --- |
| `purpose` | El sol del árbol: para qué es todo. |
| `passions` | Raíces. Texto o `{ name, description }`. |
| `experience` | Tramos del tronco (se muestran hasta 5). Texto o `{ name, description }`. |
| `apps` | Dónde se trabaja. `kind`: `webapp`, `bear`, `github`, `docs` u `other`. `openUrl` admite `{rama}`, `{tarea}` y `{etiqueta}`. `tracking`: `manual` o `link`. |
| `branches[].name` | Obligatorio. Una rama es un proyecto. |
| `priority` | 1 a 5: el grosor de la rama. |
| `status` | `active`, `paused` o `completed` (las cerradas van al archivo). |
| `app` | `id` o nombre de una de `apps`. |
| `passion` | Nombre de una de `passions`. |
| `side`, `height` | Opcionales: `left`, `right` o `center`, y altura en el tronco de 0 (abajo) a 1 (arriba). Si faltan, las ramas se alternan y las más antiguas quedan abajo. |
| `leaves[]` | Hojas (tareas). `lastActivity` es una fecha ISO o un número de días atrás; decide el color (verde reciente, amarillo, seca). `done: true` si está hecha. |
| `fruits[]` | Frutos (productos finales). `harvested: true` si ya está listo. |

## Enlaces de actividad

Abrir `https://<tu-productivitree>/?actividad=1&rama=Storytelling&tarea=Cuento%207&app=Writer's%20Lens&nota=…`
anota que trabajaste en esa tarea (y la crea si no existe en esa rama). Sirve para un Atajo de Apple con
combinación de teclas o para un botón en tu propia app. Debe abrirse en el navegador donde usas Productivitree,
porque los datos viven en ese navegador.
