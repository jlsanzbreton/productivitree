// Generic example of the tree JSON format (see docs/arbol-json.md).
export const EXAMPLE_TREE = {
  productivitree: 1,
  purpose: 'Vivir de lo que escribo',
  passions: ['Naturaleza', 'Contar historias', { name: 'Aprender', description: 'Cursos, libros y gente que sabe más' }],
  experience: ['Ingeniería', 'Escritura técnica', 'Docencia'],
  apps: [
    { id: 'notas', name: 'Bear', kind: 'bear', openUrl: 'bear://x-callback-url/search?tag={etiqueta}', tracking: 'manual' },
    { id: 'repo', name: 'GitHub', kind: 'github', openUrl: 'https://github.com/', tracking: 'link' },
  ],
  branches: [
    {
      name: 'Novela corta',
      priority: 4,
      status: 'active',
      app: 'notas',
      passion: 'Contar historias',
      leaves: [
        { name: 'Capítulo 3', lastActivity: 1 },
        { name: 'Corregir capítulo 1', lastActivity: 6 },
        { name: 'Esquema general', lastActivity: 30, done: true },
      ],
      fruits: [{ name: 'Primer borrador', harvested: false }],
    },
    {
      name: 'Web personal',
      priority: 2,
      status: 'active',
      app: 'repo',
      passion: 'Aprender',
      leaves: [{ name: 'Página de inicio', lastActivity: 3 }],
      fruits: [],
    },
    {
      name: 'Curso de escritura',
      priority: 3,
      status: 'paused',
      leaves: [{ name: 'Temario', lastActivity: 20 }],
      fruits: [{ name: 'Lección piloto', harvested: true, link: 'https://example.com/leccion' }],
    },
  ],
};
