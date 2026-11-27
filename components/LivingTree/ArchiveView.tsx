import React, { useContext, useState } from 'react';
import './livingTree.css';
import { AppContext, AppContextType } from '../../contexts/AppContext';
import { HistoryAction, HistoryKind } from '../../types';
import { isDone, when } from './treeHelpers';
import { confirmAction } from '../../services/desktop';

type Tab = 'closed' | 'paused' | 'deleted' | 'log';

const ACTION_LABEL: Record<HistoryAction, string> = {
  created: 'brotó',
  sprouted: 'brotó de un fruto',
  grown: 'creció de una ramita',
  completed: 'se cerró',
  reopened: 'se reabrió',
  paused: 'se pausó',
  resumed: 'se reanudó',
  harvested: 'se cosechó',
  deleted: 'fue al archivo',
  restored: 'se restauró',
  purged: 'se borró para siempre',
  imported: 'se importó',
};
const KIND_LABEL: Record<HistoryKind, string> = { branch: 'Rama', leaf: 'Hoja', fruit: 'Fruto' };

interface Row {
  id: string;
  kind: HistoryKind;
  title: string;
  sub: string;
  at?: string;
}

/** Everything that left the tree: closed, paused and deleted branches, leaves and fruits, plus the history log. */
const ArchiveView: React.FC<{ onBack: () => void; onShowBranch: (projectId: string) => void }> = ({ onBack, onShowBranch }) => {
  const { archive, history, setBranchStatus, setTaskDone, setFruitHarvested, restoreItem, purgeItem } = useContext(AppContext) as AppContextType;
  const [tab, setTab] = useState<Tab>('closed');
  const { projects, stages, achievements } = archive;
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.title || 'sin rama';
  const fruitOnly = achievements.filter((a) => a.projectId && typeof a.harvested === 'boolean');

  const columns: Record<'closed' | 'paused' | 'deleted', Record<HistoryKind, Row[]>> = {
    closed: {
      branch: projects.filter((p) => !p.deletedAt && p.status === 'completed').map((p) => ({ id: p.id, kind: 'branch', title: p.title, sub: 'terminada', at: p.updatedAt })),
      leaf: stages
        .filter((s) => !s.deletedAt && isDone(s))
        .map((s) => ({ id: s.id, kind: 'leaf', title: s.title, sub: projectName(s.projectId), at: s.completedAt || s.lastActivityAt })),
      fruit: fruitOnly
        .filter((f) => !f.deletedAt && f.harvested)
        .map((f) => ({ id: f.id, kind: 'fruit', title: f.title, sub: projectName(f.projectId), at: f.harvestedAt || f.createdAt })),
    },
    paused: {
      branch: projects.filter((p) => !p.deletedAt && p.status === 'paused').map((p) => ({ id: p.id, kind: 'branch', title: p.title, sub: 'en pausa', at: p.updatedAt })),
      leaf: [],
      fruit: fruitOnly
        .filter((f) => !f.deletedAt && !f.harvested)
        .map((f) => ({ id: f.id, kind: 'fruit', title: f.title, sub: `madurando · ${projectName(f.projectId)}`, at: f.createdAt })),
    },
    deleted: {
      branch: projects.filter((p) => p.deletedAt).map((p) => ({ id: p.id, kind: 'branch', title: p.title, sub: 'con sus hojas y frutos', at: p.deletedAt })),
      leaf: stages.filter((s) => s.deletedAt).map((s) => ({ id: s.id, kind: 'leaf', title: s.title, sub: projectName(s.projectId), at: s.deletedAt })),
      fruit: fruitOnly.filter((f) => f.deletedAt).map((f) => ({ id: f.id, kind: 'fruit', title: f.title, sub: projectName(f.projectId), at: f.deletedAt })),
    },
  };

  const actions = (row: Row) => {
    if (tab === 'deleted')
      return (
        <>
          <button className="lt-link" onClick={() => restoreItem(row.kind, row.id)}>
            Restaurar
          </button>
          <button
            className="lt-link"
            style={{ color: '#b8432f' }}
            onClick={async () => {
              if (await confirmAction(`¿Borrar «${row.title}» para siempre? No se puede deshacer.`)) purgeItem(row.kind, row.id);
            }}
          >
            Borrar
          </button>
        </>
      );
    if (tab === 'closed') {
      if (row.kind === 'branch')
        return (
          <button className="lt-link" onClick={() => setBranchStatus(row.id, 'active')}>
            Devolver al árbol
          </button>
        );
      if (row.kind === 'leaf')
        return (
          <button className="lt-link" onClick={() => setTaskDone(row.id, false)}>
            Reabrir
          </button>
        );
      return (
        <button className="lt-link" onClick={() => setFruitHarvested(row.id, false)}>
          Volver a madurar
        </button>
      );
    }
    if (row.kind === 'branch')
      return (
        <>
          <button className="lt-link" onClick={() => setBranchStatus(row.id, 'active')}>
            Reanudar
          </button>
          <button className="lt-link" onClick={() => onShowBranch(row.id)}>
            Ver en el árbol
          </button>
        </>
      );
    if (row.kind === 'fruit')
      return (
        <button className="lt-link" onClick={() => setFruitHarvested(row.id, true)}>
          Cosechar
        </button>
      );
    return null;
  };

  const tabs: Array<[Tab, string]> = [
    ['closed', 'Cerrados'],
    ['paused', 'En pausa y madurando'],
    ['deleted', 'Eliminados'],
    ['log', 'Registro'],
  ];

  return (
    <div className="lt-archive">
      <p className="lt-crumb">
        <button className="lt-link" onClick={onBack}>
          ← Volver al árbol
        </button>
      </p>
      <h2>Archivo</h2>
      <p className="lt-plain" style={{ color: '#5d6453' }}>
        Lo que ha salido del árbol. Nada eliminado se pierde hasta que lo borras aquí.
      </p>
      <div className="lt-tabs" role="group" aria-label="Secciones del archivo">
        {tabs.map(([key, label]) => (
          <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'log' ? (
        history.length ? (
          <ol className="lt-tl">
            {history.slice(0, 200).map((entry) => (
              <li key={entry.id}>
                {KIND_LABEL[entry.kind]} «{entry.title}» {ACTION_LABEL[entry.action] || entry.action}
                <span className="src">
                  {when(entry.at)} · {new Date(entry.at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  {entry.detail ? ` · ${entry.detail}` : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="lt-plain">El registro empieza a contar desde ahora: cada rama, hoja o fruto que brote, se cierre o se elimine quedará anotado aquí.</p>
        )
      ) : (
        <div className="lt-cols">
          {(['branch', 'leaf', 'fruit'] as HistoryKind[]).map((kind) => {
            const rows = columns[tab][kind];
            return (
              <section key={kind}>
                <h3>
                  {kind === 'branch' ? 'Ramas (proyectos)' : kind === 'leaf' ? 'Hojas (tareas)' : 'Frutos (productos)'} · {rows.length}
                </h3>
                {rows.length ? (
                  <ul className="lt-list">
                    {rows.map((row) => (
                      <li key={row.id} style={{ alignItems: 'flex-start' }}>
                        <span className="nm">
                          {row.title}
                          <span className="dd" style={{ display: 'block' }}>
                            {row.sub}
                            {row.at ? ` · ${when(row.at)}` : ''}
                          </span>
                        </span>
                        <span className="lt-row-acts">{actions(row)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lt-plain" style={{ color: '#5d6453' }}>
                    Nada por aquí.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArchiveView;
