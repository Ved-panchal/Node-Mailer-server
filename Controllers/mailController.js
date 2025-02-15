import MailService from "@sendgrid/mail";
import logger from "../Logger/Logger.js";
import dotenv from "dotenv";
import sequelize from "../db/db.js";

dotenv.config();
MailService.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Custom error class for handling email sending failures
 * Input: Error message and original error object
 * Output: Extended Error instance with custom properties
 */
class EmailSendingError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "EmailSendingError";
    this.originalError = originalError;
  }
}

/**
 * Purpose: Sends bulk emails in chunks to prevent rate limiting and improve reliability
 * Input: Array of email objects containing to, from, subject, and html content
 * Output: Object containing success status, message, and error details if any
 */
export const sendBulkMails = async (emails) => {
  const sentEmails = [];
  const failedEmails = [];
  const chunkSize = 50;

  try {
    if (!emails || emails.length === 0) {
      logger.warn("No emails provided to sendBulkMails");
      return { success: false, message: "No emails to send" };
    }

    try {
      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        await MailService.sendMultiple(chunk);
        const emailAddresses = chunk.map(email => `'${email.to}'`).join(',');
        console.log("Updating 50 Mail ID's Status")
          await sequelize.query(`
            UPDATE Campaign_Data 
            SET 
              Content_ID='${campaign.ContentID}', 
              Sales_Person_Name='${salesPersonData[0].Sales_PersonName}',
              Record_DateTime=getdate(),
              Record_Status=1
            WHERE 
              Campaign_FileName='${campaign.CampaignID}' 
              AND EmailAddress IN (${emailAddresses})
              AND Record_Status=0 
              AND Unsubscribe=0 
              AND WrongID=0
          `);
        console.log("Updation of 50 Mail ID's Status completed successfully.");
        sentEmails.push(...chunk);
        logger.info(`Successfully sent chunk of ${chunk.length} emails`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      logger.info(`Successfully sent ${emails.length} emails`);
      return {
        success: true,
        message: `${emails.length} mails sent successfully`,
      };
    } catch (sendError) {
      logger.error("Error sending bulk emails", {
        error: sendError.message,
        emailCount: emails.length,
      });
      throw new EmailSendingError("Failed to send bulk emails", sendError);
    }
  } catch (error) {
    logger.error("Unexpected error in sendBulkMails", {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Unexpected error in bulk email sending",
      error: error.message,
    };
  }
};

/**
 * Purpose: Sends notification email to team members about campaign status
 * Input: campaignId (string), ContentId (string), MailCount (number)
 * Output: Object containing success status, message, and error details if any
 */
export const sendPersonalMail = async (campaignId, ContentId, MailCount, SalesPersonMail) => {
  // MailService.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    const PersonalEmail = {
      to: [SalesPersonMail, process.env.NOTIFICATION_TO_EMAIL1, process.env.NOTIFICATION_TO_EMAIL2, process.env.NOTIFICATION_TO_EMAIL3],
      cc: [
        process.env.NOTIFICATION_CC_EMAIL1,
        process.env.NOTIFICATION_CC_EMAIL2,
        "dishalunagariya2910@gmail.com",
        "vedpanchal99@gmail.com"
      ],
      from: SalesPersonMail,
      subject: "Mailer Bot - Info Mail",
      html: `
        Hello Team,
        <br><br>
        Here are the mail details:
        <br><br>
        Campaign Name : ${campaignId}
        <br>
        Content ID : ${ContentId}
        <br>
        Sent Mails : ${MailCount}
        <br><br>
        Thanks & regards,
        Team RPA
      `
    };
    // console.log("PersonalEmail",PersonalEmail)
    try {
      await MailService.send(PersonalEmail);
      logger.info(`Personal notification email sent for campaign ${campaignId}`);
      return {
        success: true,
        message: "Personal notification email sent successfully",
      };
    } catch (sendError) {
      logger.error("Error sending personal notification email", {
        campaignId,
        error: sendError.message,
      });
      throw new EmailSendingError(
        "Failed to send personal notification email",
        sendError
      );
    }
  } catch (error) {
    logger.error("Unexpected error in sendPersonalMail", {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Unexpected error in personal mail sending",
      error: error.message,
    };
  }
};