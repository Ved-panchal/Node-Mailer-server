import MailService from "@sendgrid/mail";
import logger from "../Logger/Logger.js";
import dotenv from "dotenv";

dotenv.config();
MailService.setApiKey(process.env.SENDGRID_API_KEY);

// export const sendmail = async (req,res) => {

//   let emails = [
//     {
//       to: ["mitul.nagani@silvertouch.com","ved.sttl@silvertouch.com"],
//       cc: "mitul.sttl@silvertouch.com",
//       from: "cindy.potter@sttldigital.com",
//       subject: "Bulk Emails",
//       html: "<strong>Bulk emails</strong>",
//     },
//   ];

//   try {
//     // await MailService.sendMultiple(emails);
//     await MailService.send(emails);

//     return res.json({
//       success: true,
//       message: "Bulk emails sent successfully",
//       count: emails.length,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.json({
//       success: false,
//       message: "Failed to send bulk emails",
//       error: error.message,
//     });
//   }
// };
class EmailSendingError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "EmailSendingError";
    this.originalError = originalError;
  }
}

export const sendBulkMails = async (emails) => {
  const sentEmails = [];
  const failedEmails = [];

  const chunkSize = 150;
  // const delayBetweenBatches = 60000;
  try {
    if (!emails || emails.length === 0) {
      logger.warn("No emails provided to sendBulkMails");
      return { success: false, message: "No emails to send" };
    }

    // MailService.setApiKey(process.env.SENDGRID_API_KEY);

    try {
      // MailService.sendMultiple(emails);
      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        await MailService.sendMultiple(chunk);
        sentEmails.push(...chunk);
        logger.info(`Successfully sent chunk of ${chunk.length} emails`);
        MailService.setTimeout(5000)
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

// export const sendBulkMails = async (emails) => {
//   try {
//     if (!emails || emails.length === 0) {
//       logger.warn("No emails provided to sendBulkMails");
//       return {
//         success: false,
//         message: "No emails to send",
//         sentCount: 0,
//       };
//     }

//     const sentEmails = [];
//     const failedEmails = [];

//     const chunkSize = 800;
//     const delayBetweenBatches = 60000;

//     for (let i = 0; i < emails.length; i += chunkSize) {
//       const chunk = emails.slice(i, i + chunkSize);

//       try {
//         await MailService.sendMultiple(chunk);
//         sentEmails.push(...chunk);
//         logger.info(`Successfully sent chunk of ${chunk.length} emails`);

//         // Add delay after successful batch send
//         if (i + chunkSize < emails.length) {
//           await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
//         }
//       } catch (sendError) {
//         failedEmails.push(...chunk);

//         logger.error("Error sending email chunk", {
//           chunkSize: chunk.length,
//           error: sendError.message,
//         });
//       }
//     }

//     logger.info(`Bulk email sending completed`, {
//       totalEmails: emails.length,
//       sentCount: sentEmails.length,
//       failedCount: failedEmails.length,
//     });

//     return {
//       success: sentEmails.length > 0,
//       message: `Sent ${sentEmails.length} out of ${emails.length} emails`,
//       sentCount: sentEmails.length,
//       totalEmails: emails.length,
//       failedCount: failedEmails.length,
//     };
//   } catch (error) {
//     logger.error("Unexpected error in sendBulkMails", {
//       error: error.message,
//       stack: error.stack,
//     });

//     return {
//       success: false,
//       message: "Unexpected error in bulk email sending",
//       error: error.message,
//       sentCount: 0,
//     };
//   }
// };

// export const sendBulkMails = async (emails) => {
//   try {
//     if (!emails || emails.length === 0) {
//       logger.warn("No emails provided to sendBulkMails");
//       return {
//         success: false,
//         message: "No emails to send",
//         sentCount: 0,
//       };
//     }

//     const sentEmails = [];
//     const failedEmails = [];

//     const chunkSize = 500;
//     const delayBetweenBatches = 3000;
//     const maxRetries = 3;

//     for (let i = 0; i < emails.length; i += chunkSize) {
//       const chunk = emails.slice(i, i + chunkSize);
//       let chunkSent = false;
//       let retryCount = 0;

//       while (!chunkSent && retryCount < maxRetries) {
//         try {

//           await MailService.sendMultiple(chunk);
//           sentEmails.push(...chunk);
//           chunkSent = true;

//           logger.info(`Successfully sent chunk ${i/chunkSize + 1} of ${chunk.length} emails`, {
//             chunkIndex: i/chunkSize + 1,
//             chunkSize: chunk.length
//           });

//           // Add delay if more batches remain
//           if (i + chunkSize < emails.length) {
//             await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
//           }
//         } catch (sendError) {
//           retryCount++;
//           logger.error(`Chunk sending attempt ${retryCount} failed`, {
//             chunkIndex: i/chunkSize + 1,
//             chunkSize: chunk.length,
//             errorMessage: sendError.message,
//             errorCode: sendError.code,
//             errorType: sendError.constructor.name
//           });

//           // Additional logging for ECONNRESET
//           if (sendError.code === 'ECONNRESET') {
//             logger.warn('Connection reset detected', {
//               retryCount,
//               chunk: chunk.map(email => email.to) // Log recipient emails for debugging
//             });
//           }

//           // If last retry fails, mark chunk as failed
//           if (retryCount >= maxRetries) {
//             failedEmails.push(...chunk);
//             chunkSent = false;
//           } else {
//             // Wait before retrying
//             await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
//           }
//         }
//       }
//     }

//     logger.info(`Bulk email sending completed`, {
//       totalEmails: emails.length,
//       sentCount: sentEmails.length,
//       failedCount: failedEmails.length,
//     });

//     return {
//       success: sentEmails.length > 0,
//       message: `Sent ${sentEmails.length} out of ${emails.length} emails`,
//       sentCount: sentEmails.length,
//       totalEmails: emails.length,
//       failedCount: failedEmails.length,
//       failedEmails: failedEmails.map(email => email.to)
//     };
//   } catch (error) {
//     logger.error("Unexpected error in sendBulkMails", {
//       error: error.message,
//       stack: error.stack,
//     });

//     return {
//       success: false,
//       message: "Unexpected error in bulk email sending",
//       error: error.message,
//       sentCount: 0,
//     };
//   }
// };

export const sendPersonalMail = async (campaignId, ContentId, MailCount) => {
  // MailService.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    const PersonalEmail = [
      {
        to: [
          // "rinku.dudhrejiya@silvertouch.com",
          // "sandip.sharma@silvertouch.com",
          "mitul.nagani@silvertouch.com"
        ],
        cc: [
          "ved.panchal@silvertouch.com",
          // "mitul.nagani@silvertouch.com",
          "disha.lunagariya@silvertouch.com",
        ],
        from: "cindy.potter@sttldigital.com",
        subject: "Mailer Bot - Info Mail",
        html: `Hello Team,
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
        Team RPA`,
      },
    ];

    try {
      await MailService.send(PersonalEmail);
      logger.info(
        `Personal notification email sent for campaign ${campaignId}`
      );
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
