export const DEFAULT_GOAL_TEXTS=['Improve the introduction','Remove repeated ideas','Find a quieter ending'];
export function migrateRevisions(data){
 if(data.revisionSchemaVersion===2)return data;
 const goals=data.defaultRevisionGoals||DEFAULT_GOAL_TEXTS.map(text=>({id:crypto.randomUUID(),text}));
 return {...data,revisionSchemaVersion:2,defaultRevisionGoals:goals,docs:data.docs.map(doc=>{
  const progress={...doc.universalProgress};let session=doc.session;
  const checks=(doc.checks||[]).filter(check=>{
   // Previously copied defaults remain independent draft intentions.
   if(data.revisionSchemaVersion===1||check.sourceDefaultId)return true;
   const goal=goals.find(g=>g.text===check.text);if(!goal)return true;
   if(check.done)progress[goal.id]=true;
   if(session?.checkId===check.id)session={...session,checkId:'universal:'+goal.id};
   return false;
  });
  return {...doc,checks,session,universalProgress:progress,cards:(doc.cards||[]).map(card=>({...card,shape:card.shape||data.defaultNoteShape||'rectangle'}))};
 })};
}
export function universalChecks(data,doc){return data.defaultRevisionGoals.map(goal=>({...goal,id:'universal:'+goal.id,universalId:goal.id,done:!!doc.universalProgress?.[goal.id]}));}
export function completeRevision(doc){
 if(!doc.session)return doc;
 const id=doc.session.checkId;
 return {...doc,session:null,...(id.startsWith('universal:')?{universalProgress:{...doc.universalProgress,[id.slice(10)]:true}}:{checks:doc.checks.map(c=>c.id===id?{...c,done:true}:c)})};
}
export function copyDefaultGoal(goal){return {id:crypto.randomUUID(),text:goal.text.trim(),done:false,sourceDefaultId:goal.id};}
export function reorderGoals(goals,id,direction){const index=goals.findIndex(g=>g.id===id),next=index+direction;if(index<0||next<0||next>=goals.length)return goals;const result=[...goals];[result[index],result[next]]=[result[next],result[index]];return result;}
