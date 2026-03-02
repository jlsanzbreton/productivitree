const byTitle = (a, b) => a.title.localeCompare(b.title);

export const buildTreeData = ({
  roots,
  trunkSegments,
  projects,
  stages,
  achievements,
}) => {
  const sortedRoots = [...roots].sort(byTitle);
  const sortedTrunk = [...trunkSegments].sort(byTitle);
  const sortedProjects = [...projects].sort(byTitle);
  const sortedStages = [...stages].sort(byTitle);

  const rootNodes = sortedRoots.map((root) => ({
    id: root.id,
    parentId: 'tree-root',
    type: 'root',
    data: root,
    children: [],
  }));

  const trunkNodes = sortedTrunk.map((segment) => ({
    id: segment.id,
    parentId: 'trunk-hub',
    type: 'trunk',
    data: segment,
    children: [],
  }));

  const branchNodes = sortedProjects.map((project) => {
    const stageChildren = sortedStages
      .filter((stage) => stage.projectId === project.id)
      .map((stage) => ({
        id: stage.id,
        parentId: project.id,
        type: 'leaf',
        data: stage,
        children: [],
      }));

    const fruitChildren = achievements
      .filter((achievement) => !achievement.projectId || achievement.projectId === project.id)
      .map((achievement) => ({
        id: achievement.id,
        parentId: project.id,
        type: 'fruit',
        data: achievement,
        children: [],
      }));

    return {
      id: project.id,
      parentId: 'trunk-hub',
      type: 'branch',
      data: project,
      children: [...stageChildren, ...fruitChildren],
    };
  });

  const trunkHub = {
    id: 'trunk-hub',
    parentId: 'tree-root',
    type: 'trunk',
    data: { title: 'Trunk', description: 'Skills and expertise' },
    children: [...trunkNodes, ...branchNodes],
  };

  return {
    id: 'tree-root',
    type: 'rootNode',
    data: { title: 'Productivitree' },
    children: [...rootNodes, trunkHub],
  };
};
