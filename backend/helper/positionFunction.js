import { SmartApi } from 'smartapi-js'
import usermodel from '../model/usermodel.js'
import userpositionmodel from '../model/userpositionmodel.js'
import logger from '../newLogger.js'

let userSessions = new Map()

//buy position function
export async function buyuserPositionFunction (
  positionid,
  symbol,
  instrument,
  entry_price,
  entry_date,
  entry_time,
  tgt,
  sl,
  pnl,
  pnl_percentage
) {
  const users = await usermodel.find({ active: true })

  for (const user of users) {
    const userid = user._id

    const qty = Math.floor(
      Math.floor(user.margin / process.env.PERCENT) / entry_price
    )

    if (qty == 0) {
      console.log('quantity is zero==', qty)
      continue
    }

    const userSession = userSessions.get(userid.toString())

    if (!userSession) {
      logger('ERROR', `user session not found for user- ${username}`)
      console.log(`No active session found for user: ${username}`)
      continue
    }

    const id = userid.toString()
    const data = await usermodel.findById(id)

    const username = data.firstname

    const userOpenpositions = await userpositionmodel.find({
      open: true,
      userid: userid
    })

    if (userOpenpositions.length < 10) {
      await userpositionmodel.create({
        userid: user._id,
        positionid,
        symbol,
        instrument,
        entry_price,
        entry_date,
        entry_time,
        qty,
        tgt,
        sl,
        pnl,
        pnl_percentage,
        exitprice: 0,
        exit_date: null,
        exit_time: null,
        exitreason: '',
        open: true
      })

      logger('INFO', `Position created for user: ${username}`)

      console.log(`Position created for user: ${username}`)

      const orderid = await placeOrderMarket(
        userSession.api,
        instrument,
        qty,
        'BUY'
      )

      logger(
        'INFO',
        `place BUY order for user - ${username}, orderid = ${orderid.orderid} script=${orderid.script}`
      )

      console.log(
        `Order BUY created for user: ${username} orderid is : ${userid}`
      )
    }
  }
}

export async function selluserPositionFunction (
  positionid,
  pnl,
  ltp,
  entry_price,
  exitprice,
  exit_date,
  exit_time,
  exitreason
) {
  try {
    const users = await usermodel.find({ active: true, role: 'user' })

    for (const user of users) {
      const userid = user._id

      // console.log('userid', userid)

      const userpositionspresent = await userpositionmodel.findOne({
        positionid: positionid
      })

      //console.log('userpositionspresent==', userpositionspresent)

      if (userpositionspresent.length === 0) {
        console.log(`user positions not found for user = ${userid}`)
        continue
      }

      const id = userid.toString()
      const data = await usermodel.findById(id)

      const username = data.firstname

      // Convert string inputs to numbers for calculations
      const ltpValue = parseFloat(ltp)
      const pnlValue = (
        (ltpValue - userpositionspresent.entry_price) *
        userpositionspresent.qty
      ).toFixed(2) //parseFloat(pnl)

      const entryPrice = parseFloat(entry_price)
      const exitPrice = parseFloat(exitprice)

      const updatedData = {
        ltp: ltpValue,
        pnl: pnlValue,
        pnl_percentage: (((ltpValue - entryPrice) / entryPrice) * 100).toFixed(
          2
        ),
        open: false,
        exitprice: exitPrice,
        exit_date: exit_date,
        exit_time: exit_time,
        exitreason: exitreason
      }

      const existingPosition = await userpositionmodel.findByIdAndUpdate(
        userpositionspresent._id,
        updatedData,
        { new: true } // Option to return the modified document
      )

      // console.log('existing positions==', existingPosition)

      if (existingPosition) {
        console.log(`Position sell for user: ${username}`)
        const orderid = await placeOrderMarket(
          userSessions.api,
          existingPosition.instrument,
          existingPosition.qty,
          'SELL'
        )

        logger(
          'INFO',
          `place SELL order for user - ${username}, orderid = ${orderid.orderid} script=${orderid.script}`
        )
        console.log(
          `Order SELL created for user: ${username} orderid is : ${orderid.orderid}`
        )
      } else {
        console.log(`Position not found for user: ${username}`)
      }
    }
  } catch (error) {
    console.error('Error occurred during the position sell process:', error)
  }
}

export async function generateSession () {
  const users = await usermodel.find({ active: true })

  if (!users || users.length === 0) {
    console.log('No clients found.')
  }

  for (const u of users) {
    try {
      const {
        _id: userid,
        firstname,
        brokerid,
        mpin,
        apikey,
        totpkey,
        margin
      } = u

      // Ensure session is created before proceeding
      const userSessionExists =
        userSessions.has(userid.toString()) &&
        (await userSessions.get(userid.toString()).api.getUserProfile())
      if (!userSessionExists) {
        await createNewSession(
          userid,
          brokerid,
          mpin,
          apikey,
          totpkey,
          firstname,
          margin
        )
      } else {
        console.log(
          `Broker ID ${brokerid} already exists in userSessions and is valid.`
        )
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error generating sessions for users')
    }
  }
}

async function createNewSession (
  userid,
  brokerid,
  mpin,
  apikey,
  totpkey,
  firstname,
  margin
) {
  try {
    const api = new SmartApi(brokerid, mpin, apikey, totpkey)
    await api.generateSession()

    const profile = await api.getUserProfile()
    if (profile) {
      logger('INFO', `Generate session for user- ${firstname}`)
      console.log(`Profile generated for user: ${firstname}`)
      const userid1 = userid.toString()
      userSessions.set(userid1, { api, margin })
    } else {
      logger('Error', `error during generate session`)
      throw new Error('Error generating session.')
    }
  } catch (error) {
    console.log('error in generate session', error)
  }
}

/**
 *
 * @param {SmartApi} api
 *
 * */
async function placeOrderMarket (api, instrument, quantity, transactiontype) {
  try {
    if (!api) {
      console.log('API not found for user:')
      return
    }

    if (!instrument || !quantity || !transactiontype) {
      throw new Error('params missing in placeorder')
    }

    const orderid = await api.placeOrder({
      variety: api.variety.NORMAL,
      tradingsymbol: instrument.symbol,
      symboltoken: instrument.token,
      exchange: instrument.exch_seg,
      transactiontype: transactiontype,
      ordertype: api.ordertype.MARKET,
      quantity: parseInt(instrument.lotsize) * quantity,
      producttype: api.producttype.INTRADAY,
      price: '0',
      triggerprice: '0',
      duration: api.orderDuration.DAY
    })

    return orderid
  } catch (error) {
    console.log(error)
  }
}

export const checkSubscriptionStatus = async () => {
  try {
    const today = new Date()
    const usersToUpdate = await usermodel.find({
      subscriptionDate: { $lt: today }
    })

    if (usersToUpdate.length > 0) {
      await usermodel.updateMany(
        { _id: { $in: usersToUpdate.map(user => user._id) } },
        { $set: { active: false } }
      )
      console.log(
        `Updated ${usersToUpdate.length} users' active status to false.`
      )

      logger(
        'INFO',
        `Updated ${usersToUpdate.length} users' active status to false.`
      )
    } else {
      console.log('No users need to be updated today.')
    }
  } catch (error) {
    console.error('Error updating user status:', error)
  }
}

// export async function selluserPositionFunction (
//   positionid,
//   pnl,
//   ltp,
//   entry_price,
//   exitprice,
//   exit_date,
//   exit_time,
//   exitreason
// ) {
//   try {
//     const users = await usermodel.find({ active: false })

//     for (const user of users) {
//       const userid = user._id

//       const userpositionspresent = await userpositionmodel.find({
//         userid: userid.toString(),
//         positionid: positionid
//       })

//       console.log('userpositionspresent==', userpositionspresent)

//       if (userpositionspresent.length === 0) {
//         console.log(`user positions not found for user = ${userid}`)
//         continue
//       }

//       // Convert string inputs to numbers for calculations
//       const pnlValue = parseFloat(pnl)
//       const ltpValue = parseFloat(ltp)
//       const entryPrice = parseFloat(entry_price)
//       const exitPrice = parseFloat(exitprice)

//       const updatedData = {
//         ltp: ltpValue,
//         pnl: pnlValue,
//         pnl_percentage: ((ltpValue - entryPrice) / entryPrice) * 100,
//         open: false,
//         exitprice: exitPrice,
//         exit_date: exit_date,
//         exit_time: exit_time,
//         exitreason: exitreason
//       }

//       // Convert positionid to ObjectId
//       const positionIdObject = positionid //new ObjectId(positionid);

//       // Update the position in the database
//       const existingPosition = await userpositionmodel.findByIdAndUpdate(
//         positionIdObject,
//         updatedData,
//         { new: true } // Option to return the modified document
//       )

//       console.log('existing positions==', existingPosition)

//       if (existingPosition) {
//         console.log(`Position sell for user: ${userid}`)
//         const orderid = await placeOrderMarket(
//           userSessions.api,
//           existingPosition.instrument,
//           existingPosition.qty,
//           'SELL'
//         )

//         console.log(
//           `Order SELL created for user: ${userid} orderid is : ${orderid}`
//         )
//       } else {
//         console.log(`Position not found for user: ${userid}`)
//       }
//     }
//   } catch (error) {
//     console.error('Error occurred during the position sell process:', error)
//   }
// }
