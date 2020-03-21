const DiscordRSS = require('discord.rss')
const RedisGuild = require('../structs/Guild.js')
const RedisChannel = require('../structs/Channel.js')
const GuildData = DiscordRSS.GuildData
const Profile = DiscordRSS.Profile

async function getAppData (guildID) {
  const data = await GuildData.get(guildID)
  if (data) {
    return data.toJSON()
  } else {
    return null
  }
}

async function getCachedGuild (guildID, redisClient) {
  const guild = await RedisGuild.fetch(redisClient, guildID)
  if (guild) {
    return guild.toJSON()
  } else {
    return null
  }
}

async function getFeedLimit (guildID) {
  return Profile.getFeedLimit(guildID)
}

/**
 *
 * @param {string} guildID
 * @param {import('redis').RedisClient} redisClient
 */
async function getGuild (guildID, redisClient) {
  const [
    cached,
    profile,
    limit
  ] = await Promise.all([
    getCachedGuild(guildID, redisClient),
    Profile.get(guildID),
    getFeedLimit(guildID)
  ])
  return {
    ...cached,
    profile,
    limit
  }
}

async function updateProfile (guildID, guildName, data) {
  const profile = await Profile.get(guildID)
  if (profile) {
    for (const key in data) {
      profile[key] = data[key]
    }
    await profile.save()
    return profile.toJSON()
  }
  const newProfile = new Profile({
    ...data,
    _id: guildID,
    name: guildName
  })
  await newProfile.save()
  return newProfile.toJSON()
}

/**
 * @param {string} guildID
 * @param {string} channelID
 * @param {import('redis').RedisClient} redisClient
 */
async function guildHasChannel (guildID, channelID, redisClient) {
  const channel = await RedisChannel.fetch(redisClient, channelID)
  if (!channel) {
    return false
  }
  return channel.guildID === guildID
}

module.exports = {
  getAppData,
  getCachedGuild,
  updateProfile,
  getFeedLimit,
  guildHasChannel,
  getGuild
}
