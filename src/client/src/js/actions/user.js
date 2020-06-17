import axios from 'axios'
import {
  SET_USER, GET_BOT_USER
} from '../constants/actions/user'
import { fetchGuilds } from './guilds'
import { fetchBotConfig } from './botConfig'
import FetchStatusActions from './utils/FetchStatusActions'

export const {
  begin: setUserBegin,
  success: setUserSuccess,
  failure: setUserFailure
} = new FetchStatusActions(SET_USER)

export const {
  begin: getBotUserBegin,
  success: getBotUserSuccess,
  failure: getBotUserFailure
} = new FetchStatusActions(GET_BOT_USER)

export function fetchUser () {
  return async dispatch => {
    dispatch(setUserBegin())
    await Promise.all([
      dispatch(fetchGuilds()),
      dispatch(fetchBotConfig()),
      dispatch(fetchBotUser()),
      axios.get('/api/users/@me').then(({ data, status }) => {
        dispatch(setUserSuccess(data))
      }).catch(err => {
        console.log(err)
        dispatch(setUserFailure(err))
      })
    ])
  }
}

export function fetchBotUser () {
  return async dispatch => {
    try {
      dispatch(getBotUserBegin())
      const { data } = await axios.get('/api/users/@bot')
      dispatch(getBotUserSuccess(data))
    } catch (err) {
      dispatch(getBotUserFailure(err))
    }
  }
}
