const {configureDatabase}=require('../srv/lib/database-config');
const cap=()=>({env:{requires:{db:{kind:'hana',impl:'@cap-js/hana',credentials:{host:'unreachable.invalid',password:'never-used'}}},sql:{}}});
test('every environment uses SQLite and discards stale HANA credentials',()=>{
 for(const NODE_ENV of ['development','production','test']){
   const cds=cap();expect(configureDatabase(cds,{env:{NODE_ENV,DATABASE_MODE:'hana',SQLITE_FILE:'persistent.sqlite'}})).toEqual({mode:'sqlite'});
   expect(cds.env.requires.db).toMatchObject({kind:'sqlite',impl:'@cap-js/sqlite',credentials:{url:NODE_ENV==='test'?':memory:':'persistent.sqlite'}});
   expect(cds.env.requires.db.credentials.password).toBeUndefined();
 }
});
test('remote mode is rejected before any connection and production cannot use transient memory',()=>{
 expect(()=>configureDatabase(cap(),{mode:'hana',env:{}})).toThrow('SQLite only');
 expect(()=>configureDatabase(cap(),{env:{NODE_ENV:'production',SQLITE_FILE:':memory:'}})).toThrow('persistent SQLite');
});
