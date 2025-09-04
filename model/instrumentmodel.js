import { model, Schema } from 'mongoose'

const instrumentSchema = new Schema(
  {
    token: String,
    symbol: String,
    name: String,
    expiry: String,
    strike: String,
    lotsize: String,
    instrumenttype: String,
    exch_seg: String,
    tick_size: String,
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true, versionKey: false }
)

function currentLocalTimePlusOffset () {
  const now = new Date()
  const offset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + offset)
}

instrumentSchema.pre('save', function (next) {
  const currentTime = currentLocalTimePlusOffset()
  if (!this.entrydatetime) {
    this.entrydatetime = currentTime // Set entrydatetime if it's not already set
  }
  this.createdAt = currentTime
  this.updatedAt = currentTime
  next()
})

instrumentSchema.pre('findOneAndUpdate', function (next) {
  const currentTime = currentLocalTimePlusOffset()
  this.set({ updatedAt: currentTime })
  next()
})
const instruemntmodel = model('instrument', instrumentSchema)

export default instruemntmodel
