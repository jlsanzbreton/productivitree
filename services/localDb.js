import Dexie from 'dexie';

class ProductivitreeDB extends Dexie {
  constructor() {
    super('productivitree_local_db');
    this.version(1).stores({
      passionDrafts: 'id, userId, updatedAt',
      passionAnalysisAttempts: 'id, draftId, status, requestedAt',
      passionAnalysisResults: 'id, draftId, createdAt',
      appMeta: 'key',
    });
  }
}

export const localDb = new ProductivitreeDB();

export const resetLocalDbForTests = async () => {
  await localDb.passionDrafts.clear();
  await localDb.passionAnalysisAttempts.clear();
  await localDb.passionAnalysisResults.clear();
  await localDb.appMeta.clear();
};
