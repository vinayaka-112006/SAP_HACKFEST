const fs=require('node:fs');
module.exports=class ResultsReporter{onRunComplete(_contexts,result){
 fs.mkdirSync('tests/results',{recursive:true});const file='tests/results/trace-validation.json';const trace=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
 fs.writeFileSync('tests/results/summary.json',JSON.stringify({label:'synthetic data, simulated services',executedAt:new Date().toISOString(),passed:result.numPassedTests,failed:result.numFailedTests,skipped:result.numPendingTests,suitesFailed:result.numFailedTestSuites,groundTruth:trace?.groundTruth||'not exercised',trace:trace?.rows||[]},null,2)+'\n');
}};
