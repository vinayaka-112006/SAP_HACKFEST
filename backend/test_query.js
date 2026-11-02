const { cds, entity, transaction } = require("./srv/lib/db");

(async () => {
  try {
    await cds.connect.to("db");
    await transaction(async (tx) => {
      console.log('Testing RepairLog queries:');
      const all = await tx.run(cds.ql.SELECT.from(entity("RepairLog")));
      console.log('All repair logs count:', all.length);
      console.log('All repair logs:', all);

      const allIncidents = await tx.run(cds.ql.SELECT.from(entity("Incident")));
      console.log('All incidents:', allIncidents.map(i => ({ id: i.incidentId, state: i.state, toolId: i.toolId })));

      const allTools = await tx.run(cds.ql.SELECT.from(entity("Tool")));
      console.log('All tools:', allTools.map(t => ({ id: t.toolId, state: t.state })));

      try {
        const q1 = await tx.run(
          cds.ql.SELECT.one.from(entity("RepairLog")).where({ verifiedBy: { "!=": null } })
        );
        console.log('q1 { verifiedBy: { "!=": null } } result:', q1);
      } catch (err) {
        console.log('q1 query error:', err.message);
      }
    });
  } catch (err) {
    console.error('Outer error:', err);
  }
})();
