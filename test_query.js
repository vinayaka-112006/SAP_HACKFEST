const cds = require('@sap/cds');
(async () => {
  try {
    process.chdir('backend');
    await cds.connect.to('db');
    const entity = cds.entities('toolsathi').RepairLog;
    console.log('Testing RepairLog queries:');
    try {
      const q1 = await cds.run(cds.ql.SELECT.from(entity).where({ verifiedBy: { '!=': null } }));
      console.log('q1 result count:', q1.length);
    } catch (e) {
      console.log('q1 error:', e.message);
    }
    try {
      const all = await cds.run(cds.ql.SELECT.from(entity));
      console.log('all rows count:', all.length, all.map(r => ({ repairId: r.repairId, verifiedBy: r.verifiedBy })));
      const filtered = all.filter(r => r.verifiedBy != null);
      console.log('manually filtered count:', filtered.length);
    } catch (e) {
      console.log('all error:', e.message);
    }
  } catch (err) {
    console.error(err);
  }
})();
