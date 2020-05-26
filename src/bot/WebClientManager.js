const fs = require('fs')
const path = require('path')
const Discord = require('discord.js')
const DiscordRSS = require('discord.rss')
const setConfig = require('../config.js').set
const expressApp = require('../app.js')
const createLogger = require('../util/logger/create.js')
const connectMongo = require('../util/connectMongo.js')
const connectRedis = require('../util/connectRedis.js')
const setupModels = require('../util/setupModels.js')
const promisify = require('util').promisify

class WebClientManager {
  constructor (config) {
    this.shardsSpawned = 0
    // This can throw
    this.config = setConfig(config)
    this.log = createLogger('W')
    process.env.DRSSWEB_CONFIG = JSON.stringify(config)
    /**
     * @type {import('redis').RedisClient}
     */
    this.redisClient = null
    this.manager = new Discord.ShardingManager(path.join(__dirname, 'shard.js'), {
      token: this.config.bot.token
    })
    this.shardsToInitialize = []
    this.shardsInitialized = 0
    this.manager.on('shardCreate', (shard) => {
      shard.on('message', message => {
        this.onMessage(shard, message)
      })
    })
  }

  async start () {
    try {
      this.log.info('Attempting to connect to databases...')
      await this.setupDiscordRSS()
      this.mongoConnection = await connectMongo(this.config, 'WM')
      this.redisClient = await connectRedis(this.config, 'WM')
      setupModels(this.mongoConnection)
      this.log.info('Databases connected')
      this.log.debug('Flushing redis')
      await this.flushRedis()
      this.log.debug('Redis successfully flushed, spawning shards')
      const token = this.config.bot.token
      if (!token || token === 'DRSSWEB_docker_token') {
        throw new Error('No bot token defined')
      }
      await this.manager.spawn()
    } catch (err) {
      if (err.json) {
        err.json().then((response) => {
          this.log.error({ response }, 'WebClientManager failed to start. Verify token and observe rate limits.')
        }).catch((jsonErr) => {
          this.log.error(err, 'WebClientManager failed to start')
          this.log.error(jsonErr, 'Failed to parse response from WebClientManager spawn')
        }).finally(() => {
          this.manager.broadcast('exit')
          process.exit(1)
        })
      } else {
        this.log.error(err, 'WebClientManager failed to start')
        this.manager.broadcast('exit')
        process.exit(1)
      }
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

  async setupDiscordRSS () {
    const uri = this.config.database.uri
    const options = this.config.database.connection
    await DiscordRSS.setupModels(uri, options)
  }

  /**
   *
   * @param {import('discord.js').Shard} shard
   * @param {*} message
   */
  onMessage (shard, message) {
    this.log.debug({
      shardMessage: message
    }, 'Got message')
    if (message === 'exit') {
      this.manager.broadcast('exit')
      process.exit(1)
    }
    if (message === 'created') {
      this.shardsToInitialize.push(shard)
      this.log.debug(`Shard ${shard.id} created ${this.shardsToInitialize.length}/${this.manager.totalShards}`)
      if (this.shardsToInitialize.length === this.manager.totalShards) {
        this.log.debug('All shards created')
        this.initializeNextShard()
      }
    } else if (message === 'complete') {
      this.log.debug('Ignoring non-complete message')
      this.log.debug(`Got complete message, progress: ${this.manager.totalShards - this.shardsToInitialize.length}/${this.manager.totalShards}`)
      if (this.shardsToInitialize.length > 0) {
        this.initializeNextShard()
        return
      }
      this.log.debug('Starting HTTP server')
      this.startHttp().catch(err => {
        this.log.fatal(err)
        process.exit(1)
      })
    }
  }

  initializeNextShard () {
    this.log.debug({
      shardsToInitialize: this.shardsToInitialize.map(s => s.id)
    }, 'Initializing next shard in queue')
    const firstToInitialize = this.shardsToInitialize.shift()
    firstToInitialize.send('initialize')
  }

  readHttpsFiles () {
    const config = this.config
    const {
      privateKey,
      certificate,
      chain
    } = config.https
    const key = fs.readFileSync(privateKey, 'utf8')
    const cert = fs.readFileSync(certificate, 'utf8')
    const ca = fs.readFileSync(chain, 'utf8')
    return {
      key,
      cert,
      ca
    }
  }

  async startHttp () {
    const app = expressApp(this.mongoConnection, this.redisClient, this.config)
    const config = this.config
    // Check variables
    const { port: httpPort } = config.http

    // Create HTTP Server
    const http = require('http').Server(app)
    http.listen(httpPort, () => {
      this.log.info(`HTTP UI listening on port ${httpPort}!`)
    })

    // Create HTTPS Server
    if (config.https.enabled === true) {
      this.startHttps(app)
    }
  }

  startHttps (app) {
    const config = this.config
    const {
      port: httpsPort
    } = config.https
    const httpsFiles = this.readHttpsFiles()
    const https = require('https').Server(httpsFiles, app)
    https.listen(httpsPort, () => {
      this.log.info(`HTTPS UI listening on port ${httpsPort}!`)
    })
  }
}

module.exports = WebClientManager
