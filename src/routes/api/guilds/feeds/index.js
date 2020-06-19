const express = require('express')
const Joi = require('@hapi/joi')
const rateLimit = require('express-rate-limit')
const guildFeedsAPI = express.Router({ mergeParams: true })
const guildHasFeed = require('../../../../middleware/guildHasFeed.js')
const guildHasChannel = require('../../../../middleware/guildHasChannel.js')
const guildHasChannelOptional = require('../../../../middleware/guildHasChannelOptional.js')
const controllers = require('../../../../controllers/index.js')
const feedSchema = require('../../../../util/validation/feedSchema.js')
const validator = require('express-joi-validation').createValidator({
  passError: true
})
const feedIDSchema = Joi.object({
  guildID: Joi.string(),
  feedID: Joi.string()
})
const sendArticleSchema = Joi.object({
  article: Joi.object(),
  channel: Joi.string()
})
const sendArticleRateLimit = rateLimit({
  windowMs: 10000, // 10 seconds
  max: 1, // 1 requests per 10 seconds
  message: {
    code: 429,
    message: 'Wait 10 seconds after sending a message to try again'
  }
})

// Get guild feeds
guildFeedsAPI.get('/', controllers.api.guilds.feeds.getFeeds)

// Create a feed
guildFeedsAPI.post('/', [
  validator.body(feedSchema),
  guildHasChannel
], controllers.api.guilds.feeds.createFeed)

// Make sure feedID exists before proceeding
guildFeedsAPI.use('/:feedID', validator.params(feedIDSchema), guildHasFeed)

// Make sure the guild has this feed, and inject the feed into req.feed
guildFeedsAPI.use('/:feedID', guildHasFeed)

// Edit the feed
guildFeedsAPI.patch('/:feedID', [
  validator.body(feedSchema),
  guildHasChannelOptional
], controllers.api.guilds.feeds.editFeed)

// Delete the feed
guildFeedsAPI.delete('/:feedID', controllers.api.guilds.feeds.deleteFeed)

// Get feed placeholders
guildFeedsAPI.get('/:feedID/articles', controllers.api.guilds.feeds.getFeedArticles)

// Get database articles for debugging
guildFeedsAPI.get('/:feedID/database', controllers.api.guilds.feeds.getDatabaseArticles)

// Get schedule
guildFeedsAPI.get('/:feedID/schedule', controllers.api.guilds.feeds.getSchedule)

// Post message
guildFeedsAPI.post('/:feedID/message', [
  sendArticleRateLimit,
  validator.body(sendArticleSchema)
], controllers.api.guilds.feeds.sendMessage)

// Handle subscribers
guildFeedsAPI.use('/:feedID/subscribers', require('./subscribers/index.js'))

module.exports = guildFeedsAPI
