export type Activity = 'walk'|'run'|'cycle'|'travel'|'outdoor';
export function dayScore(activity:Activity, feels:number|null,rain:number|null,wind:number|null,uv:number|null){
 const ideal={walk:19,run:13,cycle:18,travel:20,outdoor:20}[activity];
 const factors:{label:string;penalty:number}[]=[];
 if(feels!=null)factors.push({label:'Ощущаемая температура',penalty:Math.min(50,Math.abs(feels-ideal)*2.4)});
 if(rain!=null)factors.push({label:'Вероятность осадков',penalty:Math.min(45,rain*.45)});
 if(wind!=null)factors.push({label:'Ветер',penalty:Math.min(35,Math.max(0,wind-4)*(activity==='cycle'?4:3))});
 if(uv!=null)factors.push({label:'УФ индекс',penalty:Math.max(0,uv-5)*3});
 return {value:Math.max(0,Math.round(100-factors.reduce((n,f)=>n+f.penalty,0))),factors};
}
