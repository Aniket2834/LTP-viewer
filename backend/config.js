import 'dotenv/config'

const config = {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  DEVPROD: process.env.DEVPROD,
  LOGIN_APIKEY: process.env.LOGIN_APIKEY,
  FRONTEND_PATH: process.env.FRONTEND_PATH,
  MPIN: process.env.MPIN,
  BROKERID: process.env.BROKERID,
  APIKEY: process.env.APIKEY,
  TOTPKEY: process.env.TOTPKEY
}

export default config
