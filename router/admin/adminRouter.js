import { Router } from 'express'
import adminuserRouter from './adminuserRouter.js'

const adminRouter = Router()

export default adminRouter

adminRouter.use('/user', adminuserRouter)

