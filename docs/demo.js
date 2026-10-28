// Synthetic data only. Loaded solely on a localhost ?demo preview.
export function fixture(){
 const now=new Date().toISOString();
 const research={available:true,frozen:false,started_at:new Date(Date.now()-86400000).toISOString(),updated_at:now,rows:[['실전조건 · 이격 20% 이하',2.68,-1.21,null,true],['비교1 · 이격 상한 없음',1.14,-3.52,'KRW-DEMO',false],['비교2 · 이격 15% 이하',1.85,-.83,null,false]].map(([name,rate,mdd,ticker,base],i)=>({id:String(i),name,marked_return_pct:rate,stress_return_pct:rate-.21,max_drawdown_pct:mdd,trades:3-i,is_baseline:base,open_ticker:ticker}))};
 return {schema_version:1,generated_at:now,observed_at:now,source:{service_active:true,loop_seconds:30,observation_seconds:60,view_seconds:5},warnings:[],
 review:{status:'due',message:'2주 중간 점검 필요',elapsed_days:15,started_at:new Date(Date.now()-15*86400000).toISOString(),milestones:[{title:'2주 중간 점검',status:'due',due_at:new Date(Date.now()-86400000).toISOString()},{title:'4주 전략 분석·검토',status:'upcoming',remaining_days:13,due_at:new Date(Date.now()+13*86400000).toISOString()}]},
 runtime:{last_loop_at:now,last_success:{accounts:now,ticker:now},fast_monitor:true,buy_blocked:false,failures:{}},
 exit_research:{...research,rows:['A · 기준 4/1.5 · ATR 8~12%','B · 손절 상한 10%','C · 고정 손절 8%','D · 트레일 3/2 · ATR 8~12%'].map((name,i)=>({...research.rows[0],id:'exit-demo-'+i,name,marked_return_pct:[1.2,.7,-.3,.5][i]}))},
 account:{equity_krw:5382200,net_contributions_krw:6000000,cash_krw:28000,return_pct:-10.2967,adjusted_total_pnl_krw:-617800,total_pnl_krw:-617800,cumulative_deposits_krw:600000,cumulative_withdrawals_krw:0,legacy_external_adjustment_krw:0,external_change_krw:0},
 periods:{day:{return_pct:1.27},week:{return_pct:3.48},month:{return_pct:-2.16},cumulative:{return_pct:-11.24,mdd_pct:-18.72}},
 policy:{ma20_cap:.2,trail_arm:.04,trail_gap:.015,allocation:.995},
 positions:[{ticker:'KRW-DEMO',balance:12500,avg_price:410,price:428,entry_at:new Date(Date.now()-6.5*3600000).toISOString(),observed_at:now,price_source:'bot_account_observation',return_pct:(428/410-1)*100,trail_arm:.04,trail_gap:.015,trail_armed:true,stop_price:360.8,max_pnl:.055,min_pnl:-.018,exit_view:{is_trailing:true,armed:true,price:426.4,fill_pct:0,remaining_volume:12500}}],
 trades:Array.from({length:24},(_,i)=>({id:'demo-'+i,ts:new Date(Date.now()-(i+1)*6*3600000).toISOString(),ticker:['KRW-ALPHA','KRW-BETA','KRW-GAMMA'][i%3],side:i%4===3?'BUY':'SELL',reason:i%4===3?'BUY':i===4?'STOP_ATR_12.00':'TRAIL_EXIT',qty:1200,price:428+i,pnl_krw:i===4?-45000:34200-i*1320,return_pct:i===4?-8.1:2.31-i*.08,fee_krw:2100,basis:i%4===3?'FILL_CONFIRMED':'NET_CONFIRMED'})),
 scan:{id:18250,candidates:2},research,previous_research:{...research,frozen:true,rows:research.rows.map((s,i)=>({...s,name:['기존 트레일 4%/1.5%p','순익 2% 지정가 · 급등 2%','트레일 · 급등 1.5%'][i]}))}};
}
