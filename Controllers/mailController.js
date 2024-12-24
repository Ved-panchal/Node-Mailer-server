import MailService from "@sendgrid/mail";
import logger from "../Logger/Logger.js";
import dotenv from "dotenv";

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
  const chunkSize = 150;

  try {
    if (!emails || emails.length === 0) {
      logger.warn("No emails provided to sendBulkMails");
      return { success: false, message: "No emails to send" };
    }

    try {
      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        await MailService.sendMultiple(chunk);
        sentEmails.push(...chunk);
        logger.info(`Successfully sent chunk of ${chunk.length} emails`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between chunks
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
export const sendPersonalMail = async (campaignId, ContentId, MailCount) => {
  try {
    const PersonalEmail = [{
      to: [process.env.NOTIFICATION_TO_EMAIL1, process.env.NOTIFICATION_TO_EMAIL2, process.env.NOTIFICATION_TO_EMAIL3],
      cc: [
        process.env.NOTIFICATION_CC_EMAIL1,
        process.env.NOTIFICATION_CC_EMAIL2,
      ],
      from: process.env.NOTIFICATION_FROM_EMAIL,
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
    }];

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