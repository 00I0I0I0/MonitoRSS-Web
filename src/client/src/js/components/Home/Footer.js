import React from 'react'
import pages from '../../constants/pages'

function Footer () {
  return (
    <div>
      <a href={pages.TERMS}>Terms & Conditions</a> | <a href={pages.PRIVACY_POLICY}>Privacy Policy</a> | <a href={pages.COOKIE_POLICY}>Cookie Policy</a>
    </div>
  )
}

export default Footer
