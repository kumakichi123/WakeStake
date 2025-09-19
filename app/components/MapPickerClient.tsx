"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { useEffect } from "react";

const pin = (color:string)=>L.divIcon({
  className:"", iconSize:[30,42], iconAnchor:[15,40], html:
  `<svg width="30" height="42" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
     <path d="M12 33c-1-2-9-12-9-18a9 9 0 1118 0c0 6-8 16-9 18z" fill="${color}" stroke="rgba(0,0,0,.15)"/>
     <circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`
});
const blue = pin("#4F46E5");   // current
const orange = pin("#F59E0B"); // target

function DraggableMarker({ pos, onDragEnd }:{
  pos:LatLngExpression; onDragEnd:(lat:number,lng:number)=>void;
}){
  useMapEvents({});
  return (
    <Marker
      position={pos}
      icon={orange}
      draggable
      eventHandlers={{
        dragend:(e:any)=>{
          const { lat, lng } = e.target.getLatLng();
          console.log("[map] dragend", lat, lng);
          onDragEnd(lat,lng);
        }
      }}
    />
  );
}

export default function MapPicker({
  current, target, onChange, onAddress
}:{ current:{lat:number,lng:number}|null;
   target:{lat:number,lng:number};
   onChange:(lat:number,lng:number)=>void;
   onAddress:(addr:string)=>void }){
  async function rev(lat:number,lng:number){
    try{
      console.log("[map] reverse geocode", lat, lng);
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const j = await r.json();
      console.log("[map] address =", j?.display_name);
      onAddress(j.display_name || "");
    }catch(e){
      console.warn("[map] reverse failed", e);
      onAddress("");
    }
  }
  useEffect(()=>{ rev(target.lat, target.lng); },[target.lat, target.lng]);

  console.log("[map] render", { current, target });

  return (
    <MapContainer center={[target.lat, target.lng]} zoom={17} style={{height:320, width:"100%"}}
      scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                 attribution='&copy; OpenStreetMap contributors'/>
      {current && <Marker position={[current.lat,current.lng]} icon={blue} />}
      <DraggableMarker pos={[target.lat,target.lng]} onDragEnd={(la,ln)=>{ onChange(la,ln); rev(la,ln); }}/>
    </MapContainer>
  );
}
