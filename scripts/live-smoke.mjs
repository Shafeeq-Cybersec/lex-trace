// Explicit opt-in: sends only bundled fictional records to the configured model.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.TRACE_TEST_ORIGIN||'http://127.0.0.1:3001';let cookie='';
async function request(p,options={}){const r=await fetch(origin+p,{...options,headers:{Origin:origin,'X-Trace-Request':'1',...(cookie?{Cookie:cookie}:{}),...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();if(!r.ok)throw new Error(data.error||String(r.status));return data;}
await request('/api/capabilities');
const {case:c}=await request('/api/cases',{method:'POST',body:JSON.stringify({title:'Synthetic live verification'})});
async function upload(names){const form=new FormData();for(const name of names)form.append('files',new Blob([fs.readFileSync(new URL('../public/samples/'+name,import.meta.url))]),name);return request('/api/case/'+c.id+'/upload-batch',{method:'POST',body:form});}
async function wait(id){const start=Date.now();while(Date.now()-start<300000){const job=await request('/api/case/'+c.id+'/jobs/'+id);if(job.status==='completed')return Date.now()-start;if(['failed','needs_input','superseded'].includes(job.status))throw new Error(job.error||job.status);await new Promise(r=>setTimeout(r,1200));}throw new Error('Review exceeded five-minute test deadline');}
try{
const first=await upload(['01-deduction-notice.pdf','02-move-in-inspection.pdf','03-renter-messages.txt']);const initialMs=await wait(first.jobId);
const initial=(await request('/api/case/'+c.id)).case;const revision=initial.revisions[0];
assert.equal(revision.mode,'gemini');assert.equal(revision.financials.deposit,60000);assert.equal(revision.financials.refund,45000);assert.equal(revision.findings.length,2);assert.deepEqual(revision.findings.map(f=>f.amount).sort((a,b)=>a-b),[3000,12000]);
assert.ok(revision.audit.checkedCitations>=4);
const duplicate=await upload(['01-deduction-notice.pdf']);assert.equal(duplicate.jobId,null);
const reuseStart=Date.now();const reused=await request('/api/case/'+c.id+'/review',{method:'POST',body:'{}'});const unchangedReviewMs=Date.now()-reuseStart;assert.equal(reused.jobId,null);assert.equal((await request('/api/case/'+c.id)).case.revisions.length,1);
const next=await upload(['04-new-packing-message.txt']);const revisionMs=await wait(next.jobId);const updated=(await request('/api/case/'+c.id)).case;
assert.equal(updated.revisions.length,2);assert.deepEqual(updated.revisions[0],revision);const latest=updated.revisions[1];assert.equal(latest.mode,'gemini');assert.deepEqual(latest.findings.map(f=>f.id).sort(),revision.findings.map(f=>f.id).sort());
assert.ok(latest.changes.some(change=>change.sourceIds.length>0));assert.ok(latest.sourceSnapshots.length===4);
const report={testedAt:new Date().toISOString(),origin,model:latest.model,initialMs,revisionMs,unchangedReviewMs,initialCitations:revision.audit.checkedCitations,revisionCitations:latest.audit.checkedCitations,initialTokens:{input:revision.audit.inputTokens,output:revision.audit.outputTokens},revisionTokens:{input:latest.audit.inputTokens,output:latest.audit.outputTokens},checks:['live AI mode','accurate amounts','two deductions','duplicate upload creates no job','unchanged review creates no model job or revision','immutable first revision','stable deduction IDs','new source linked in change']};
fs.writeFileSync(new URL('../docs/live-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await request('/api/case/'+c.id,{method:'DELETE'}).catch(()=>console.error('Test case cleanup deferred until its active job completes or retention expires.'));}
