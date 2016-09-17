'use strict'
const express = require('express')
const request = require('request')
const Slapp = require('slapp')
const Store = require("jfs")
var db = new Store("data")
if (!process.env.PORT) throw Error('PORT missing but required')

db.getTeamData = function(team_id, cb) {
  db.get(team_id, function(err, obj){
    cb(err, obj)
  })
}

var slapp = Slapp({
  context (req, res, next) {
    var meta = req.slapp.meta

    db.getTeamData(meta.team_id, (err, data) => {
      if (err) {
        console.error('Error loading team data: ', meta.team_id, err)
        return res.send(err)
      }

      // mixin necessary team meta-data
      req.slapp.meta = Object.assign(req.slapp.meta, {
        app_token: data.access_token,
        bot_token: data.bot.bot_access_token,
        bot_user_id: data.bot.bot_user_id,
      })

      next()
    })
  }
})

//require('beepboop-slapp-presence-polyfill')(slapp, { debug: true })
require('./flows')(slapp)
var app = slapp.attachToExpress(express())

app.get('/', function (req, res) {
  res.send('<a href="https://slack.com/oauth/authorize?scope=incoming-webhook,commands,bot&client_id=22349320545.80299990288"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>')
})

app.get('/oauth', function (req, res) {
  var options = {
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    code: req.query.code
  }

  request.post('https://slack.com/api/oauth.access', {form: options}, function(err,httpResponse,body){
    body = JSON.parse(body)
    if(body.team_id){
      db.save(body.team_id, body, function(err){
        if(err){
          res.send("Error saving data")
        }else{
          res.send(httpResponse)
        }
      });
    }
  })
})

console.log('Listening on :' + process.env.PORT)
app.listen(process.env.PORT)
