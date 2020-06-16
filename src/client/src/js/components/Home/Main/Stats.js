import React from 'react'
import styled from 'styled-components'
import { useSelector } from 'react-redux'
import CountUp from 'react-countup'
import moment from 'moment'

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: -30px;

  /* margin-bottom: -50px; */
`

const StatBox = styled.div`
  padding: 30px 30px 0 30px;
  margin: 15px 30px 0 30px;
  max-width: 350px;
  width: 100%;
  text-align: center;
  > h2 {
    font-size: 2em;
  }
  > p {
    font-size: 1.15em;
  }
`

function Stats () {
  const stats = useSelector(state => state.stats)
  const {
    articlesDelivered,
    feedCount,
    totalGuilds
  } = stats

  return (
    <>
      <h1>Our Numbers Today</h1>
      <Wrapper>
        <StatBox>
          <h2>
            <CountUp end={totalGuilds} separator=',' duration={1.5} />
          </h2>
          <p>Communities</p>
        </StatBox>
        <StatBox>
          <h2>
            <CountUp end={feedCount} separator=',' duration={1.5} />
          </h2>
          <p>News Sources</p>
        </StatBox>
        <StatBox>
          <h2>
            <CountUp end={articlesDelivered.data} separator=',' duration={1.5} />
          </h2>
          <p>Delivered Articles<br />Since {moment(articlesDelivered.addedAt).format('MMMM D, YYYY')}</p>
        </StatBox>
      </Wrapper>
      {/* <Divider /> */}
    </>
  )
}

export default Stats
