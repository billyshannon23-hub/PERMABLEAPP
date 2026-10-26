/* Captions: [start time in seconds, TEXT IN CAPITALS]. One caption per narration line, in order.
   The narrator fits each line to its caption; if a line runs long, the video waits for it.
   The pixel font has A-Z, 0-9 and . , ! ? ' - : / + only. */
const CAPS=[[0.8,'YOUR HEART BEATS ABOUT 100,000 TIMES A DAY.'],
 [5.2,'EACH BEAT STARTS IN A SMALL PATCH OF CELLS CALLED THE SINOATRIAL NODE.'],
 [10.4,'IT FIRES AN ELECTRICAL SIGNAL THAT SPREADS ACROSS THE HEART AND MAKES IT SQUEEZE.']];
const CAP_END=15.4,TOTAL=16.8;   // captions stop at CAP_END; the video is TOTAL seconds long before narration timing

/* Labels: [from, to, 'TEXT', ()=>[x,y] point in the world (or null for no pointer), [x,y] where the label sits on screen] */
const LABELS=[[6.0,10.2,'SA NODE',()=>NODE,[14,52]],[11.0,15.2,'SIGNAL',()=>[HX+10,HY+10],[124,40]]];
