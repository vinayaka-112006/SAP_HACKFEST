const { cds, entity, transaction } = require("./srv/lib/db");
const { validateReturnToService } = require("./srv/lib/return-to-service");

(async () => {
  try {
    await cds.connect.to("db");
    await transaction(async (tx) => {
      const incident = await tx.run(cds.ql.SELECT.one.from(entity("Incident")).where({ incidentId: "TS-0004" }));
      const currentTool = await tx.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: incident.toolId }));
      const repair = await tx.run(cds.ql.SELECT.one.from(entity("RepairLog")).where({ incidentId: "TS-0004" }));

      console.log('Incident:', incident.incidentId, 'state:', incident.state);
      console.log('Current tool:', currentTool.toolId, 'state:', currentTool.state);
      console.log('RepairLog:', repair.repairId, 'passed:', repair.passed, 'verifiedBy:', repair.verifiedBy);

      const readings = JSON.parse(repair.testReadings);
      const validation = await validateReturnToService({
        repairLog: { ...repair, testReadings: readings },
        toolState: currentTool.state,
        verifierId: "VER-01",
        verifierRole: "Verifier",
      });

      console.log('validateReturnToService result:', validation);
    });
  } catch (err) {
    console.error('Error:', err);
  }
})();
