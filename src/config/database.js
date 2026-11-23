const { Sequelize } = require('sequelize');
require('dotenv').config();

// Em ambiente de teste, permite usar um banco separado se DB_NAME_TEST estiver definido
const dbName =
  process.env.NODE_ENV === 'test' && process.env.DB_NAME_TEST
    ? process.env.DB_NAME_TEST
    : process.env.DB_NAME;

const sequelize = new Sequelize(dbName, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true
  }
});

module.exports = sequelize;