// Exact first 15 examples copied from the successful GitHub Actions log.
// This is a partial dataset; the engine reported 42 possible dimensions overall.
window.INITIAL_FINDINGS = [
['20-0"',2424,194,0,'20\'-0"','possible_missing_foot_mark'],
['20-0"',2674,194,45,'20\'-0"','possible_missing_foot_mark'],
['20-0"',2925,195,74,'20\'-0"','possible_missing_foot_mark'],
["i'-2'",3373,198,0,null,'low_ocr_confidence'],
["15'-0",3690,198,16,null,'low_ocr_confidence'],
['eo} $4"',3480,807,22,'eo} $4"','low_ocr_confidence'],
['1/8" = 1-0"',3661,1395,86.7,'1\'-0"','possible_missing_foot_mark'],
['20-0"',1165,1459,45,'20\'-0"','possible_missing_foot_mark'],
['20-0"',1918,1462,71,'20\'-0"','possible_missing_foot_mark'],
['20\'-0"',2670,1466,48,null,'low_ocr_confidence'],
["20°-0'",2921,1467,67,null,'low_ocr_confidence'],
['12-4"',3514,1469,65,'12\'-4"','possible_missing_foot_mark'],
["iso RO. | 270°]2'70",1393,1475,47.8,null,'invalid_inches'],
['18".',1644,1485,74,'18". ',null],
['-0" R,',2167,1481,65,'-0" R,','low_ocr_confidence']
].map((a,i)=>({id:`A102-ocr-${String(i+1).padStart(3,'0')}`,text:a[0],x:a[1],y:a[2],confidence:a[3],suggestion:a[4],reason:a[5],status:'pending',correction:'',note:''}));
