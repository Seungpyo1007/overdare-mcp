import { loadDoc, saveDoc, resolveNode, createInstance, deleteByGuid, findByName } from "./dist/ovdrjm.js";
import { StudioRpcClient } from "./dist/rpcClient.js";
const file = "C:/Users/29/Desktop/NewWorld/NewWorld.ovdrjm";
const client = new StudioRpcClient();
await client.call("game.stop", {}).catch(()=>{});
const doc = loadDoc(file);
// cleanup previous test block
const old = findByName(doc.Root, "EngineTestBlock");
if (old) { deleteByGuid(doc.Root, old.ActorGuid); console.log("removed old EngineTestBlock"); }
// also remove any prior EngineRow* 
for (let i=0;i<10;i++){ const n=findByName(doc.Root,"EngineRow"+i); if(n) deleteByGuid(doc.Root,n.ActorGuid); }
const ws = resolveNode(doc, "Workspace");
const sp = findByName(doc.Root,"SpawnLocation")?.CFrame?.Position ?? {X:0,Y:0,Z:0};
const colors=[[231,76,60],[230,126,34],[241,196,15],[46,204,113],[52,152,219]];
const guids=[];
for(let i=0;i<5;i++){
  const node=createInstance(doc, ws, "Part", "EngineRow"+i, {
    position:[sp.X + (i-2)*420, (sp.Y||0)+250, sp.Z - 700],
    size:[350,350,350], color:colors[i], anchored:true });
  guids.push(node.ActorGuid);
}
saveDoc(file, doc);
const apply = await client.call("level.apply", {});
console.log("created", guids.length, "parts; apply=", JSON.stringify(apply));
