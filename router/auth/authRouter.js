import { Router } from "express";
import usermodel from "../../model/usermodel.js";
import {
  bcryptPassword,
  comparePassword,
  generateAccessToken,
  getEmailOTP,
  getSessionData,
  validatetoken,
} from "../../helper/helperFunction.js";
import { errorResponse, successResponse } from "../../helper/serverResponse.js";
import { checkRateLimit } from "../../helper/helperFunction.js";

const authRouter = Router();

authRouter.post("/signin", signinHandler);
authRouter.post("/publictoken", refreshtokenHandler);
authRouter.post("/signup", signupHandler);

export default authRouter;

//signin
async function signinHandler(req, res) {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const users = await usermodel.findOne({ email });

    if (!users) {
      return errorResponse(res, 404, "email not found");
    }
    const comparepassword = comparePassword(password, users.password);

    if (!comparepassword) {
      return errorResponse(res, 404, "invalid password");
    }

    const userid = users._id.toString();

    const { encoded_token, public_token } = generateAccessToken(
      userid,
      users.email,
      users.role
    );

    successResponse(res, "SignIn successfully", {
      encoded_token,
      public_token,
    });
  } catch (error) {
    console.log(error);
    errorResponse(res, 500, "internal server error");
  }
}

//refresh token
async function refreshtokenHandler(req, res) {
  try {
    const token = req.body.public_token;

    if (!token) {
      errorResponse(res, 400, "token not found");
      return;
    }
    let decoded = validatetoken(token);

    const sessionid = decoded ? getSessionData(decoded.id) : null;

    if (!sessionid || sessionid != decoded.sessionid) {
      console.log("session refresh token reused", decoded.id);
      throw new Error("refresh token expired");
    }

    const { encoded_token, public_token } = generateAccessToken(
      decoded.id,
      decoded.email,
      decoded.role
    );
    successResponse(res, "refresh tokens successfully", {
      encoded_token,
      public_token,
    });
  } catch (error) {
    console.log(error.message);
    errorResponse(res, 401, "refresh token expired, signin");
  }
}

//signup handler
async function signupHandler(req, res) {
  try {
    const { firstname, lastname, email, mobile, password } = req.body;

    if (!firstname || !lastname || !email || !mobile || !password) {
      return errorResponse(res, 400, "some params are missing");
    }
    const existingUser = await usermodel.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 409, "User with this email already exists");
    }

    // Create a new user
    const hashedpassword = bcryptPassword(password);
    await usermodel.create({
      mobile,
      firstname,
      lastname,
      email,
      password: hashedpassword,
    });

    successResponse(res, "Successfully signed up");
  } catch (error) {
    console.log("Error:", error.message);
    errorResponse(res, 500, "Internal server error");
  }
}
