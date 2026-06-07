const { Router } = require('express')
const authenticateUser = require('../middleware/authenticateUser')
const {
  getMembershipStatus,
  startTrial
} = require('../controllers/membership.controller')

const membershipRoutes = Router()

membershipRoutes.get('/me/status', authenticateUser, getMembershipStatus)
membershipRoutes.post('/me/start-trial', authenticateUser, startTrial)

module.exports = membershipRoutes
