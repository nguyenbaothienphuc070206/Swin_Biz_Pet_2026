import {execFileSync} from "node:child_process";
import {writeFile} from "node:fs/promises";

const npm=process.platform==="win32"?"npm.cmd":"npm";
const json=execFileSync(npm,["sbom","--sbom-format=cyclonedx","--sbom-type=application","--omit=dev"],{encoding:"utf8",shell:process.platform==="win32",maxBuffer:20*1024*1024});
JSON.parse(json);
await writeFile("sbom.cdx.json",json,{encoding:"utf8"});
console.log("Wrote production dependency SBOM to sbom.cdx.json");
