const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const { isToday, getTodayUrlDate } = require('./utils')
require('dotenv').config()

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json'

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err)
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getUserOfThatDateToSheet)
})

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    )

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback)
        oAuth2Client.setCredentials(JSON.parse(token))
        callback(oAuth2Client)
    })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    })
    console.log('Authorize this app by visiting this url:', authUrl)
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    rl.question('Enter the code from that page here: ', code => {
        rl.close()
        oAuth2Client.getToken(code, (err, token) => {
            if (err)
                return console.error(
                    'Error while trying to retrieve access token',
                    err
                )
            oAuth2Client.setCredentials(token)
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
                if (err) return console.error(err)
                console.log('Token stored to', TOKEN_PATH)
            })
            callback(oAuth2Client)
        })
    })
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function getUserOfThatDateToSheet(auth) {
    const sheets = google.sheets({ version: 'v4', auth })
    const sheetId = process.env.SHEET_ID
    sheets.spreadsheets.values.get(
        {
            spreadsheetId: sheetId,
            range: 'A1:E100000',
            majorDimension: 'ROWS',
        },
        async (err, res) => {
            if (err) return console.log('The API returned an error: ' + err)
            const rows = res.data.values
            if (rows.length) {
                const filteredRecord = rows.filter(row => isToday(row[0]))
                const uniqueUser = filteredRecord.reduce(
                    (map, record) => ({
                        ...map,
                        [record[1]]: record[2],
                    }),
                    {}
                )
                const countChapter = filteredRecord.reduce(
                    (map, record) => ({
                        ...map,
                        [record[4]]: map[record[4]] ? map[record[4]] + 1 : 1,
                    }),
                    {}
                )
                console.log(countChapter)
                const dataToInsert = [['email', 'name']].concat(
                    Object.entries(uniqueUser)
                )
                console.log(dataToInsert.length - 1)
                const sheetName = getTodayUrlDate()
                const ranges = `${sheetName}!A1:E100000`
                const request = {
                    majorDimension: 'ROWS',
                    values: dataToInsert,
                }
                await sheets.spreadsheets.values.update(
                    {
                        spreadsheetId: sheetId,
                        range: ranges,
                        valueInputOption: 'RAW',
                        requestBody: request,
                    },
                    (err, res) => {
                        if (err) {
                            console.log(err)
                        }
                    }
                ) 
                const sumRanges = `${sheetName}-summary!A1:E100000`
                const sumData = [['Chapter/Other', 'Count']].concat(Object.entries(countChapter))
                const sumRequest = {
                  majorDimension: 'ROWS',
                  values: sumData,
                }
                await sheets.spreadsheets.values.update(
                  {
                      spreadsheetId: sheetId,
                      range: sumRanges,
                      valueInputOption: 'RAW',
                      requestBody: sumRequest,
                  },
                  (err, res) => {
                      if (err) {
                          console.log(err)
                      }
                  }
              )
            } else {
                console.log('No data found.')
            }
        }
    )
}
