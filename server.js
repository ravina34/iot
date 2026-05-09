const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')

const app = express()

const db = new sqlite3.Database('database.sqlite')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static('public'))

app.use(session({
  secret: 'sistec',
  resave: false,
  saveUninitialized: true
}))

app.set('view engine', 'ejs')

// CREATE TABLES

db.serialize(() => {
     db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    password TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature TEXT,
    humidity TEXT,
    time TEXT,
    date TEXT
  )`)

})

// HOME
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// REGISTER PAGE

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/views/register.html')
})

// REGISTER USER

app.post('/register', (req, res) => {

  const { name, email, password } = req.body

  db.run(
    'INSERT INTO users(name,email,password) VALUES(?,?,?)',
    [name, email, password],
    (err) => {
      if (err) {
        res.send('Error')
      } else {
        res.redirect('/')
      }
    }
  )
  })

// LOGIN

app.post('/login', (req, res) => {

  const { email, password } = req.body

  db.get(
    'SELECT * FROM users WHERE email=? AND password=?',
    [email, password],
    (err, row) => {

      if (row) {
        req.session.user = row
        res.redirect('/dashboard')
      } else {
        res.send('Invalid Login')
      }

    }
  )

})

// DASHBOARD

app.get('/dashboard', (req, res) => {

  if (!req.session.user) {
    return res.redirect('/')
  }

  db.get(
    'SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1',
    (err, latest) => {

      db.all(
        'SELECT * FROM sensor_data ORDER BY id DESC',
        (err, rows) => {

          let lcdText = ''

          if (fs.existsSync('lcd.txt')) {
            lcdText = fs.readFileSync('lcd.txt', 'utf-8')
          }

          res.render('dashboard.ejs', {
            user: req.session.user,
            latest,

              rows,
            lcdText
          })

        }
      )

    }
  )

})

// SAVE LCD TEXT

app.post('/save-lcd', (req, res) => {

  const text = req.body.text

  fs.writeFileSync('lcd.txt', text)

  res.redirect('/dashboard')

})
// DELETE RECORD

app.get('/delete/:id', (req, res) => {

  db.run(
    'DELETE FROM sensor_data WHERE id=?',
    [req.params.id],
    () => {
      res.redirect('/dashboard')
    }
  )

})

// API 1 SAVE SENSOR DATA

app.get('/api/save-data', (req, res) => {

  const temperature = req.query.temperature
  const humidity = req.query.humidity

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata'
  })

  const split = now.split(',')

  const date = split[0]
  const time = split[1]
  db.run(
    'INSERT INTO sensor_data(temperature,humidity,time,date) VALUES(?,?,?,?)',
    [temperature, humidity, time, date],
    () => {
      res.send('DATA SAVED')
    }
  )

})

// API 2 FETCH LCD TEXT

app.get('/api/lcd', (req, res) => {

  if (fs.existsSync('lcd.txt')) {
    const data = fs.readFileSync('lcd.txt', 'utf-8')
    res.send(data)
  } else {
    res.send('WELCOME')
  }

})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log('Server Running')
})