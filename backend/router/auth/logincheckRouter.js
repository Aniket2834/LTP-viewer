import { Router } from "express";
import { successResponse, errorResponse } from "../../helper/serverResponse.js";

const logincheckRouter = Router();

logincheckRouter.get("/", getlogincheckHandler);

export default logincheckRouter;

async function getlogincheckHandler(req, res) {
  try {
    successResponse(res, "Success");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "please check login");
  }
}
