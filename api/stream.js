import express from 'express'

require('dotenv').config()
import Mailgun from 'mailgun-js'
import validator from 'validator'
import xssFilters from 'xss-filters'

const app = express()
app.use(express.json())

app.get('/', function(req, res) {
  console.log('BOOM')
  res.status(405).json({ error: 'sorry!' })
})


app.post('/', function(req, res) {

  const attributes = ['name', 'email', 'company', 'message']
  const sanitizedAttributes = attributes.map(n => validateAndSanitize(n, req.body[n]))
  const someInvalid = sanitizedAttributes.some(r => !r)

  console.log("Attributes sanitized!")

  if (someInvalid) {
    return res.status(422).json({ 'error': 'No se pudieron procesar los atributos' })
  }

  //Your api key, from Mail-gun’s Control Panel
  let api_key = process.env.MAILGUN_KEY
  //Your domain, from the Mailgun Control Panel
  let domain = 'mg.phoenixdevelopment.mx'
  //Your sending email address
  let from_who = 'contacto@phoenixdevelopment.mx'
  // Load in Mailgun
  let mailgun = new Mailgun({ apiKey: api_key, domain: domain })

  let [name, email, company, message] = sanitizedAttributes

  let data = {
    //Specify email data
    from: from_who,
    //The email to contact
    to: 'admin@phoenixdevelopment.mx',
    //Subject and text data
    subject: 'Nuevo mensaje por formulario de contacto',
    html: '<h2>Mensaje Recibido!</h2>'
      + '<ul>'
      + '<li><b>Nombre:</b> ' + name + '</li>'
      + '<li><b>Email:</b> ' + email + '</li>'
      + '<li><b>Company:</b> ' + company + '</li>'
      + '<li><b>Message:</b> ' + message + '</li>'
      + '</ul>',

    text: 'Mensaje Recibido: \n' + 'Nombre: ' + name + ' \n' + 'Email: ' + email + ' \n' + 'Company: ' + company + ' \n' + 'Mensaje: ' + message + ' \n'
  }

  mailgun.messages().send(data, function(err, body) {
    if (err) {
      res.sendStatus(500)
      console.log('got an error: ', err)
    }
    //Else we can greet    and leave
    else {
      res.status(200).json({ 'message': 'OH YEAH' })
    }
  })
});

module.exports = {
  path: '/api/contact',
  handler: app
}


const validateAndSanitize = (key, value) => {

  const rejectFunctions = {
    name: v => v.length < 1,
    email: v => !validator.isEmail(v),
    message: v => v.length < 1,
    company: v => false
  }
  // If object has key and function returns false, return sanitized input. Else, return false
  return rejectFunctions.hasOwnProperty(key) && !rejectFunctions[key](value) && xssFilters.inHTMLData(value)
}
