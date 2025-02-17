import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    firstname: String,
    lastname: String,
    email: String,
    mobile: Number,
    password: {
      type: String,
      default: 0
    },
    role: {
      type: String,
      default: 'user'
    }
  },
  { versionKey: false }
)

const usermodel = model('user', userSchema)

export default usermodel
