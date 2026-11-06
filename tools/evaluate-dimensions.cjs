/* Private/local evaluation of review JSON or a browser accuracy-check bundle. */
const {evaluate}=require('../dimension-evaluation.js');
module.exports={evaluate};
if(require.main===module){
 try{
  const fs=require('fs'),args=process.argv.slice(2);
  if(args.length<1||args.length>2)throw Error('Usage: node tools/evaluate-dimensions.cjs bundle.json OR review.json truth.json');
  for(const file of args)if(fs.statSync(file).size>20*1024*1024)throw Error('JSON inputs must be no larger than 20 MB.');
  const review=JSON.parse(fs.readFileSync(args[0],'utf8'));
  if(args.length===1&&review.schema!=='site-resolved-dimension-check-bundle-v1')throw Error('Expected a private dimension-check bundle or a separate truth file.');
  const truth=args.length===2?JSON.parse(fs.readFileSync(args[1],'utf8')):review.truth;
  let packet=args.length===1?review.prediction_packet:review;
  if(review.schema==='construction-ai-batch1'){
   const findings=[...(review.findings||[]),...Object.values(review.otherSheetFindings||{}).flat()]
    .filter(f=>f.source?.sheet_id===truth.source?.sheet_id);
   if(!findings.length)throw Error('No source-linked scan of this sheet exists in the review backup.');
   packet={source:findings[0].source,findings};
  }
  process.stdout.write(JSON.stringify(evaluate(packet,truth),null,2)+'\n');
 }catch(e){process.stderr.write('Evaluation failed: '+e.message+'\n');process.exitCode=1}
}
