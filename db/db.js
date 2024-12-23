import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize('Marketing-Database', 'sa', 'ibm@@123', {
    host: 'STAACRS',
    dialect: 'mssql',
    port: 51701,
    dialectOptions: {
      options: {
        requestTimeout: 3000000
      }
    },
  });
const database = async() => {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
        return sequelize;
      } catch (error) {
        console.error("Unable to connect to the database:", error);
      }
}

export {database}