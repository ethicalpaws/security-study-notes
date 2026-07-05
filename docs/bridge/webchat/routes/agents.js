/**
 * 修桥工程 · 战友信息路由
 */

const { Router } = require('express');
const { config } = require('../lib/config');

function createAgentRoutes() {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(config.agents);
  });

  return router;
}

module.exports = { createAgentRoutes };
