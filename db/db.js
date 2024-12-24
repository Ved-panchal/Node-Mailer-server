// Import required dependencies
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Create and export Sequelize instance with database connection configuration
export const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: 'mssql',
        port: process.env.DB_PORT,
        dialectOptions: {
            options: {
                requestTimeout: 3000000
            }
        },
    }
);

/**
 * Purpose: Establishes and validates connection to the Marketing database using Sequelize
 * Input: None - uses environment variables for connection details
 * Output: Returns Sequelize instance if connection successful, undefined if connection fails
 */
const database = async() => {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");
        return sequelize;
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
}

export { database }