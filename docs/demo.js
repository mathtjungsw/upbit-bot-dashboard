// Synthetic data only. Loaded solely on a localhost ?demo preview.
export function deepFixture(){
 const d=fixture(), now=Date.now();
 d.deep_pool={version:'deep-pool-v1',mode:'live',initial:1500000,paused:false,
   slots:[
     {slot:1,status:'held',market:'KRW-DEMOA',cash_krw:4000,realized_krw:0,unrealized_krw:38920,position_pct:13.15,trail_floor:1020,cooldown_minutes:0},
     {slot:2,status:'held',market:'KRW-DEMOB',cash_krw:0,realized_krw:0,unrealized_krw:-12450,position_pct:-4.15,trail_floor:null,cooldown_minutes:0},
     {slot:3,status:'cooling',cash_krw:312450,realized_krw:12450,unrealized_krw:0,cooldown_minutes:47},
     {slot:4,status:'flat',cash_krw:300000,realized_krw:0,unrealized_krw:0,cooldown_minutes:0},
     {slot:5,status:'pending',cash_krw:300000,realized_krw:0,unrealized_krw:0,cooldown_minutes:0}],
   recent:[{slot:3,market:'KRW-DEMOC',side:'SELL',qty:'312.452',fee:'145.217',at:new Date(now-780000).toISOString()},
     {slot:2,market:'KRW-DEMOB',side:'BUY',qty:'1000',fee:'149.92',at:new Date(now-15000000).toISOString()}]};
 return {...d,positions:[],trades:[],policy:{buy_paused:false}};
}
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

export function splitFixture(){
 const d=fixture(), now=Date.now()/1000;
 const sleeves=[
  {id:'existing',cash_krw:420000,equity_krw:2042000,realized_krw:54000,price:162.2,return_pct:5.32,
   position:{market:'KRW-ALPHA',qty:10000,funds:1540000,entry_fees:770,armed:true,peak:.071,opened_at:now-86400}},
  {id:'random',cash_krw:280000,equity_krw:1745000,realized_krw:0,price:14.65,return_pct:-2.33,
   position:{market:'KRW-BETA',qty:100000,funds:1500000,entry_fees:750,armed:false,peak:.014,opened_at:now-7200}},
  {id:'morning',cash_krw:1813000,equity_krw:1813000,realized_krw:-48000,position:null},
 ];
 d.split_portfolio={updated_at:d.observed_at,equity_krw:5660000,reserve_krw:60000,pending_orders:0,rebalance_generation:2,
  morning_live_enabled:true,morning_status:{reason:'WAIT_0859_FRAME'},account_qualified:true,sleeves,recent_orders:Array.from({length:32},(_,i)=>({
   id:'order-demo-'+i,owner:sleeves[i%3].id,side:i%2?'BUY':'SELL',market:['KRW-ALPHA','KRW-BETA','KRW-GAMMA'][i%3],
   qty:5000,funds:770000,fee:385,realized_krw:i%4===0?6250:-14850,cost_basis_krw:780000,terminal:true,
   terminal_state:i%5===0?'cancel':'done',created_at:now-(i+1)*780}))};
 d.morning_research={paper_only:true,live_orders_enabled:false,elapsed_calendar_days:5,start_date:'2026-11-06',end_date:'2026-12-17',
  primary:'상승형 기준',primary_completed_trade_days:2,minimum_trade_days:25,assumptions:{initial_cash:1000000},
  models:[{id:'상승형 기준',return_pct:1.27,closed_trades:2},{id:'무작위 비교군',return_pct:-.8,closed_trades:3}]};
 return d;
}
// Synthetic, local-demo-only data. Never contains live account balances.
export function twoTrackFixture(){
 const ids=['A_anchor_ioc','H_volume_1p5','H_lows_1','H_active_18','H_C_matched_exit','L_signal_p1','L_random_p1','L_signal_p0p5','L_random_p0p5'];
 return {version:'morning-two-track-v1-20261109',paper_only:true,live_orders_enabled:false,start_date:'2026-11-10',end_date:'2026-12-07',valid_finalized_days:0,review:'시작 전',updated_at:'2026-11-09T15:00:00+09:00',health:{state:'SCHEDULED_NOT_STARTED'},models:ids.map(id=>({id,cash:'1000000',equity_krw:'1000000',realized:'0',return_pct:'0',closed_trades:0,position:null,extra_cost_totals:{'30':'0'},delay2_equity:'1000000'}))};
}

export function fourFixture(){
 const d=splitFixture(),s=d.split_portfolio;
 s.version='split-four-v2';s.surge_live_enabled=true;
 s.sleeves.push({id:'surge',cash_krw:1200000,capital_krw:1200000,equity_krw:1200000,realized_krw:0,position:null});
 s.equity_krw+=1200000;d.account.net_contributions_krw+=1200000;
 s.surge_status={reason:'WARMING_UP',feed:{connected:true,warmup_remaining:780,markets_seen:300}};
 s.surge_risk={return_pct:0};s.surge_research={paper_only:true,live_orders_enabled:false,models:
  ['base','stop15','stop25','arm3','gap2'].map(id=>({id,qualified:true,return_pct:0,closed:0}))};
 return d;
}

export function soloFixture(){
 const d=fourFixture(),s=d.split_portfolio,now=Date.now()/1000;
 s.operation_mode='surge_only_v1';s.equity_krw=4060000;
 for(const v of s.sleeves){v.cash_krw=v.id==='surge'?4000000:0;v.equity_krw=v.cash_krw;v.position=null;}
 s.sleeves.find(v=>v.id==='surge').capital_krw=4000000;
 s.solo_trial={phase:'ready',started_at:now,review_at:now+604800,daily_limit_waiver_until:now+604800,
   daily_entry_limit:null,trial_return_pct:0,baseline_equity_krw:4000000,review_due:false};
 return d;
}
