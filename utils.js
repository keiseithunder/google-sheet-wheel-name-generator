const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc') // dependent on utc plugin
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Bangkok')

const isToday = (recordDateStr) => {
  const recordDate = dayjs(recordDateStr, 'MM/DD/YYYY').format('DD-MM-YYYY')
  const checkDate = dayjs().format('DD-MM-YYYY')
  return recordDate === checkDate
}

const getTodayUrlDate = () => {
  return dayjs().format('DD-MM-YYYY')
}

module.exports = { isToday, getTodayUrlDate }