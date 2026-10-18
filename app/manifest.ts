import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{return {name:"PawCare - Pet care",short_name:"PawCare",description:"Ho so suc khoe va cham soc thu cung",start_url:"/vi",scope:"/",display:"standalone",background_color:"#f7f5ef",theme_color:"#2f6d55",icons:[{src:"/icons/pawcare-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"/icons/pawcare-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]};}
