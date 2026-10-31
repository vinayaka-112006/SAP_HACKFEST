const cds=require('@sap/cds');
const entity=name=>`toolsathi.${name}`;
const jsonFields=['missingFields','details','payload','testReadings','units','tiers','gaps'];
function decode(row){if(!row)return row;const result={...row};for(const k of jsonFields)if(typeof result[k]==='string')result[k]=JSON.parse(result[k]);return result;}
const transaction=fn=>cds.db.tx(fn);
module.exports={cds,entity,decode,transaction};
