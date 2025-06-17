import { WebSocketServer } from "ws";
import instrumentModel from "../../model/instrumentmodel.js";
import { getCandle, livestore, main } from "../../dataloading.js";
import { errorResponse, successResponse } from "../../helper/serverResponse.js";
import Router from "express";

const allsymbolsdata = [];

export const setWebSocket = async (server) => {
  await main();

  // Create WebSocket server using the HTTP server
  const wss = new WebSocketServer({ server });

  // WebSocket connection handling
  wss.on("connection", (ws) => {
    console.log("A user connected");

    const intervalId = setInterval(async () => {
      try {
        // Fetch active instruments from the database
        const instruments = await instrumentModel.find({});

        // Attach live prices from liveStore using token
        const updatedInstruments = instruments.map(
          ({ token, name, symbol }) => ({
            token,
            name,
            symbol,
            livePrice: livestore[token]?.ltp || null, // Get live price or null if not available
            volume: livestore[token]?.volume || null,
            high52: livestore[token]?.high52 || null,
            low52: livestore[token]?.low52 || null,
          })
        );

        // // console.log("upadated instruments", updatedInstruments);

        allsymbolsdata.push(updatedInstruments);

        if (allsymbolsdata.length > 100) {
          allsymbolsdata.shift();
        }

        // Send updated instrument data to the WebSocket client
        ws.send(JSON.stringify(updatedInstruments));
      } catch (err) {
        console.error("Error fetching instruments for live update:", err);
      }
    }, 2000); // Fetch positions every 2 seconds

    ws.on("close", () => {
      console.log("User disconnected");
      clearInterval(intervalId); // Clear the interval when client disconnects
    });
  });
};

const datachartRouter = Router();

datachartRouter.get("/sidebar", sidebardata);
datachartRouter.post("/chartdata", chartdata);

export default datachartRouter;

export async function sidebardata(req, res) {
  try {
    await sleep(2000);
    const operationdata = allsymbolsdata[allsymbolsdata.length - 1];
    const top20High_Volumes =
      operationdata.sort((a, b) => b.volume - a.volume).slice(0, 7) || [];
    const top20Low_Volumes =
      operationdata.sort((a, b) => a.volume - b.volume).slice(0, 7) || [];
    const top20Highest_Prices =
      operationdata.sort((a, b) => b.livePrice - a.livePrice).slice(0, 7) || [];
    const top20Lowest_Prices =
      operationdata.sort((a, b) => a.livePrice - b.livePrice).slice(0, 7) || [];

    const data = {
      top20Highest_Prices: top20Highest_Prices,
      top20High_Volumes: top20High_Volumes,
      top20Lowest_Prices: top20Lowest_Prices,
      top20Low_Volumes: top20Low_Volumes,
    };

    successResponse(res, "success", data);
  } catch (error) {
    console.log(error);
    errorResponse(res, 500, "internal server error- sidebardata");
  }
}

export async function chartdata(req, res) {
  try {
    const { token, symbol } = req.body;
    console.log("token", token, symbol);
    try {
      const data = await getCandle(token, symbol);
      //console.log("return data", data);
      successResponse(res, "success", data);
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error(error);
    errorResponse(res, 500, "internal server error - chartdata");
  }
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
