import { loadDoc, saveDoc, deleteByGuid, findByName } from "./dist/ovdrjm.js";
import { StudioRpcClient } from "./dist/rpcClient.js";
const file = "C:/Users/29/Desktop/NewWorld/NewWorld.ovdrjm";
const client = new StudioRpcClient();
await client.call("game.stop", {}).catch(()=>{});
const doc = loadDoc(file);
let n=0;
for (let i=0;i<5;i++){ const x=findByName(doc.Root,"EngineRow"+i); if(x){ deleteByGuid(doc.Root,x.ActorGuid); n++; } }
const t=findByName(doc.Root,"EngineTestBlock"); if(t){ deleteByGuid(doc.Root,t.ActorGuid); n++; }
saveDoc(file, doc);
const apply = await client.call("level.apply", {});
console.log("deleted", n, "test parts; apply=", JSON.stringify(apply));
