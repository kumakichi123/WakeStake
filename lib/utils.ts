import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
dayjs.extend(utc); dayjs.extend(tz);

export function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number){
  const R=6371000;
  const toRad=(d:number)=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

export function localWindowUTC(tzid:string, dateISO:string, wakeHHmm:string, graceMin:number){
  const [h,m]=wakeHHmm.split(":").map(Number);
  const T=dayjs.tz(dateISO, tzid).hour(h).minute(m).second(0).millisecond(0);
  const end=T.clone(); const start=T.clone().subtract(graceMin,"minute");
  return {startUtc:start.utc().toDate(), endUtc:end.utc().toDate()};
}
