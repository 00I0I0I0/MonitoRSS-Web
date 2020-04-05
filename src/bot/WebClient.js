const fs = require('fs')
const path = require('path')
const Discord = require('discord.js')
const RedisGuild = require('./structs/Guild.js')
const RedisUser = require('./structs/User.js')
const getConfig = require('../config.js').get
const connectRedis = require('../util/connectRedis.js')
const createLogger = require('../util/logger/create.js')
const promisify = require('util').promisify

class WebClient {
  constructor () {
    this.log = createLogger('-')
    this.config = getConfig()
    /**
     * @type {import('redis').RedisClient}
     */
    this.redisClient = null
  }

  async login (token) {
    this.redisClient = await connectRedis(this.config, '-')
    this.client = new Discord.Client()
    await this.client.login(token)
    this.log.info('Logged in')
    this.log = createLogger(this.client.shard.ids[0])
    return new Promise((resolve, reject) => {
      this.client.once('ready', () => {
        this.onReady().then(resolve).catch(reject)
      })
    })
  }

  async onReady () {
    this.registerListeners()
    this.log.info('Listeners registered')
    await this.initialize()
    this.log.info('Redis initialized')
    this.client.shard.send('complete')
  }

  registerListeners () {
    const redisClient = this.redisClient
    const folderPath = path.join(__dirname, 'events')
    const files = fs.readdirSync(folderPath)
    for (const name of files) {
      const event = name.replace('.js', '')
      const filePath = path.join(folderPath, name)
      this.client.on(event, require(filePath)(redisClient))
    }
  }

  async flushRedis () {
    const redisClient = this.redisClient
    const keys = await promisify(redisClient.keys)
      .bind(redisClient)('drss*')
    const multi = redisClient.multi()
    if (keys && keys.length > 0) {
      for (const key of keys) {
        multi.del(key)
      }
      return new Promise((resolve, reject) => multi.exec((err, res) => err ? reject(err) : resolve(res)))
    }
  }

  async initialize () {
    await this.flushRedis()
    // This will recognize all guild info, members, channels and roles
    const recognizeGuilds = this.client.guilds.cache.map((guild) => {
      return RedisGuild.utils.recognize(this.redisClient, guild)
    })
    const recognizeUsers = this.client.users.cache.map((user) => {
      return RedisUser.utils.recognize(this.redisClient, user)
    })
    await Promise.all(recognizeGuilds.concat(recognizeUsers))
  }
}

module.exports = WebClient
