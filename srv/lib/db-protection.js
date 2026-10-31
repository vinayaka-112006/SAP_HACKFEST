async function install(db){if(db.kind!=='sqlite')return;
 for(const operation of ['UPDATE','DELETE'])await db.run(`CREATE TRIGGER IF NOT EXISTS toolsathi_audit_no_${operation.toLowerCase()} BEFORE ${operation} ON toolsathi_AuditLog BEGIN SELECT RAISE(ABORT, 'Application audit history is append-only'); END`);
 for(const [name,table,columns] of [['tool_start','ToolUseEvent','toolId, start'],['wc_start','ProductionRun','workCenter, startTime'],['shipment_batch','Shipment','batchId'],['stock_batch','InventoryStock','batchId']])await db.run(`CREATE INDEX IF NOT EXISTS toolsathi_${name} ON toolsathi_${table} (${columns})`);
}
module.exports={install};
