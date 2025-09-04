import { Router } from "express";
import { errorResponse, successResponse } from "../../helper/serverResponse.js";
import usermodel from "../../model/usermodel.js";
import { bcryptPassword } from "../../helper/helperFunction.js";

const adminuserRouter = Router();

adminuserRouter.post("/", getalluserHandler);
adminuserRouter.post("/create", createuserHandler);
adminuserRouter.post("/delete", deleteuserHandler);

export default adminuserRouter;

//get all users
async function getalluserHandler(req, res) {
  try {
    const { pageno, filterBy = {}, sortby = {}, search = "" } = req.body;

    const limit = 10;
    const skip = pageno * limit;

    let query = { role: "user" };

    if (filterBy) {
      Object.keys(filterBy).forEach((key) => {
        if (filterBy[key] !== undefined) {
          query[key] = filterBy[key];
        }
      });
    }
    // Construct search query
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const searchFields = ["firstname", "lastname"];
      const searchConditions = searchFields.map((field) => ({
        [field]: { $regex: searchRegex },
      }));

      // Logic to handle the 'active' field
      if (search === "true" || search === "false") {
        // Convert search to a boolean value
        const activeCondition = { active: search === "true" };
        searchConditions.push(activeCondition);
      }

      query = {
        ...query,
        $or: searchConditions,
      };
    }

    // Handle sorting
    const sortBy =
      Object.keys(sortby).length !== 0
        ? Object.keys(sortby).reduce((acc, key) => {
            acc[key] = sortby[key] === "asc" ? 1 : -1; // Assuming sortby values are 'asc' or 'desc'
            return acc;
          }, {})
        : { createdAt: -1 };

    const totalCount = await usermodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const user = await usermodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .select({
        password: 0,
        role: 0,
      });

    // if (!user || user.length === 0) {
    //   return errorResponse(res, 400, 'Data not found')
    // }

    return successResponse(res, "success", { totalPages, user });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

//create user
async function createuserHandler(req, res) {
  try {
    const { firstname, lastname, email, mobile } = req.body;

    if (!firstname || !lastname || !email || !mobile) {
      return errorResponse(res, 400, "some params are missing");
    }

    const existingUser = await usermodel.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 409, "User with this email already exists");
    }

    // Create a new user
    const password = "123456"; //uuidv4()
    const hashedpassword = bcryptPassword(password);

    const newUser = await usermodel.create({
      mobile,
      firstname,
      lastname,
      email,
      password: hashedpassword,
    });

    successResponse(res, "Success", newUser);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

//delete user
async function deleteuserHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "id not found");
    }
    const user = await usermodel.findByIdAndDelete(_id);

    if (!user) {
      return errorResponse(res, 404, "user not found");
    }
    successResponse(res, "Success");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
