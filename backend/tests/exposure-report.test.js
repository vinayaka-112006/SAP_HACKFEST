const cds=require('@sap/cds'),request=require('supertest'),{inflateSync}=require('node:zlib');
const {entity}=require('../srv/lib/db'),reports=require('../srv/lib/exposure-report');
cds.test(__dirname+'/..');jest.setTimeout(30000);
const api=(method,url,body,role='Manager',user='EXPORT-M')=>{const req=request(cds.app)[method]('/api'+url).set('x-demo-role',role).set('x-demo-user',user);return body===undefined?req:req.send(body);};
let id,report;
test('persisted export snapshots preserve all baseline serial identities, tiers and range for every window',async()=>{
  const created=await api('post','/incidents',require('../docs/demo-incidents.json')[0]);expect(created.status).toBe(201);id=created.body.incident.incidentId;
  for(const [hours,count,tiers]of [[24,35,[35,0,0]],[72,100,[90,4,6]],[168,160,[146,8,6]]]){
    const live=await api('get',`/incidents/${id}/trace?window=${hours}`);
    const generated=await api('post',`/v2/incidents/${id}/exposure-reports`,{window:hours});expect(generated.status).toBe(200);report=generated.body.report;
    expect(report.snapshot.selectedUnits).toEqual(live.body.units);expect(report.snapshot.trace.units).toHaveLength(count);
    expect(Object.values(report.snapshot.trace.summary.byTier)).toEqual(tiers);expect(report.snapshot.trace.exposureRange).toMatchObject({low:35,high:154,unknownSeparate:6});
  }
});
test('CSV snapshots are repeatable, escape spreadsheet formulas and reject unauthorized roles and centers',async()=>{
  expect((await api('get',`/v2/exposure-reports/${report.reportId}/download?format=csv`,undefined,'Worker')).status).toBe(403);
  await cds.db.run(cds.ql.INSERT.into(entity('UserProfile')).entries({userId:'EXPORT-OTHER',role:'Manager',displayName:'Other center',workCenter:'NO-ACCESS',status:'Active'}));
  expect((await api('get',`/v2/exposure-reports/${report.reportId}/download?format=csv`,undefined,'Manager','EXPORT-OTHER')).status).toBe(403);
  const first=await api('get',`/v2/exposure-reports/${report.reportId}/download?format=csv`);expect(first.status).toBe(200);expect(first.headers['content-disposition']).toContain('.csv');
  const csv=first.text||first.body.toString('utf8');for(const unit of report.snapshot.trace.units)expect(csv).toContain('"'+unit.serial+'"');
  expect((await api('get',`/v2/exposure-reports/${report.reportId}/download?format=csv`)).text).toBe(first.text);
  for(const unsafe of ['=1+1',' +SUM(1,1)','-2+3','@SUM(1)','\t=1'])expect(reports.cell(unsafe)).toContain("'");
  expect(reports.cell('a,"b"')).toBe('"a,""b"""');
  expect((await api('post',`/v2/incidents/${id}/exposure-reports`,{window:168,filters:{locationStatus:'IN_TRANSIT'}})).status).toBe(400);
});
test('PDF is a paginated binary document containing every exported serial and embedded multilingual fonts',async()=>{
  const pdf=await api('get',`/v2/exposure-reports/${report.reportId}/download?format=pdf`);expect(pdf.status).toBe(200);expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
  const bytes=pdf.body;expect(Buffer.isBuffer(bytes)).toBe(true);expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
  const source=bytes.toString('latin1');expect(source).toContain('%%EOF');expect((source.match(/\/Type \/Page\b/g)||[]).length).toBeGreaterThan(1);
  // Independently inspect Flate-compressed content streams. Latin serial identifiers use
  // the standard Helvetica font; concatenate PDF text-array strings across kerning offsets.
  let text='';for(const match of source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)){
    let content;try{content=inflateSync(Buffer.from(match[1],'latin1')).toString('latin1');}catch{continue;}
    for(const token of content.matchAll(/<([0-9a-f]+)>/gi))text+=Buffer.from(token[1],'hex').toString('latin1');
  }
  for(const unit of report.snapshot.selectedUnits)expect(text).toContain(unit.serial);
  const multilingual=structuredClone(report);multilingual.snapshot.incident.rawText='ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ। बोल्ट ढीले हैं।';
  const native=await reports.pdf(multilingual);expect(native.toString('latin1')).toMatch(/FontFile2|FontFile3/);
});
test('filters retain a complete source snapshot and report digests detect stored tampering',async()=>{
  const result=await api('post',`/v2/incidents/${id}/exposure-reports`,{window:168,filters:{tier:'UNKNOWN'}});expect(result.status).toBe(200);
  expect(result.body.report.snapshot.selectedUnits).toHaveLength(6);expect(result.body.report.snapshot.trace.units).toHaveLength(160);
  const reportId=result.body.report.reportId;
  await cds.db.run(cds.ql.UPDATE(entity('ExposureReport')).set({snapshot:'{}'}).where({reportId}));
  expect((await api('get',`/v2/exposure-reports/${reportId}`)).body.error.code).toBe('SNAPSHOT_INTEGRITY');
});
