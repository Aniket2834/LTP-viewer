import {
  SmartApi,
  SmartapiInstruments,
  SmartapiWS40,
} from "@suyotech-dev/smartapi-js";

let ws = null;
export let livestore = {};
export let api = null;
import dbConnect from "./db.js";
import instruemntmodel from "./model/instrumentmodel.js";

const brokerid = "A1365446";
const mpin = "5458";
const apikey = "oUjeMSDt";
const totpkey = "VDXPRXL7TPE5S5UEWZZJCEY4WY";

export async function main() {
  try {
   api = new SmartApi(brokerid, mpin, apikey, totpkey);

    await api.generateSession();
    const profile = await api.getUserProfile();

    console.log("profile", profile);
    ws = new SmartapiWS40("WS-1", api);
    ws.connect();

    await dbConnect();
    const data = await instruemntmodel.find({});
    subsymbols(data);

    ws.onData((d) => {
      livestore[d.token] = d;
      //console.log("livestore", livestore);
    });
  } catch (error) {
    console.error(error);
  }
}

function subsymbols(instruments) {
  if (!ws) {
    throw new Error("websocket is not connected ");
  }
  ws.subscribe(instruments);
}

// const futparams = {
//   exch_seg: "NSE",
//   name: "NIFTY",
//   instrumenttype: "AMXIDX",
// };
// //await SmartapiInstruments.CheckInstruments();
// const futinst = SmartapiInstruments.FindInstrument({
//   ...futparams,
// });
// console.log(futinst);

// await main();

function formatDate(x = 0) {
  const pad = (number) => {
    return number < 10 ? "0" + number : number;
  };

  const mydate = new Date();
  const updateDate = new Date(mydate);
  updateDate.setDate(mydate.getDate() + x);

  const month = pad(updateDate.getMonth() + 1);
  const day = pad(updateDate.getDate());
  const year = updateDate.getFullYear();
  const hour = "15";
  const minute = "30";
  const accDate = year + "-" + month + "-" + day + " " + hour + ":" + minute;
  return accDate;
}

export async function getCandle(symboltoken, symbol) {
  try {
    const fromdate = formatDate(-500);
    const todate = formatDate(0);
    const interval = api.Timeframe.FIFTEEN_MINUTE;

    const histdata = await api.getCandleData({
      exchange: "NSE",
      symboltoken: symboltoken,
      interval: interval,
      fromdate,
      todate,
    });

    if (histdata) {
      const arrayOfObject = histdata.map(
        ([time, open, high, low, close, volume]) => ({
          symbol: symbol,
          time,
          open,
          high,
          low,
          close,
          volume,
        })
      );

      //console.log(`INFO-hist data dowload completed`, arrayOfObject);
      return arrayOfObject;
    }
  } catch (error) {
    console.error(error);
  }
}
