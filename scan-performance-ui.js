(()=>{
 'use strict';
 const api=window.ConstructionPerformance,$=id=>document.getElementById(id);
 function update(){
  const report=api.report();
  $('performanceToggle').textContent=api.enabled()?'Stop timing':'Start timing';
  $('performanceExport').disabled=!report.retained_operations;
  $('performanceStatus').textContent=(api.enabled()?'Timing this session. ':'Timing is off. ')+
   report.retained_operations+' completed operation(s) retained in memory. Reload clears the report.';
 }
 $('performanceToggle').onclick=()=>{api.setEnabled(!api.enabled());update()};
 $('performanceClear').onclick=()=>{api.clear();update()};
 $('performanceExport').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(api.report(),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='site-resolved-performance.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 window.addEventListener('construction-performance-change',update);update();
})();
