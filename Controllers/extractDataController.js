import { sequelize } from "../db/db.js";
import { sendBulkMails,sendPersonalMail } from "./mailController.js";
import logger from "../Logger/Logger.js";


class EmailSendingError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "EmailSendingError";
    this.originalError = originalError;
  }
}

/**
 * Purpose: Custom error class for handling database operation failures
 * Input: Error message and original error object
 * Output: Extended Error instance with custom properties
 */
class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = "DatabaseError";
    this.originalError = originalError;
  }
}

/**
 * Purpose: Executes a SELECT query on the database with error handling and logging
 * Input: SQL query string and error context description for logging
 * Output: Query results as array of objects or throws DatabaseError on failure
 */
const SelectQuery = async (query, errorContext = "Generic Query") => {
  try {
    return await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      timeout: 3000000,
      raw: true,
    });
  } catch (error) {
    logger.error(`Database Query Error in ${errorContext}`, {
      query,
      errorMessage: error.message,
      stack: error.stack,
    });
    throw new DatabaseError(`Failed to execute query: ${errorContext}`, error);
  }
};

/**
 * Purpose: Replaces placeholder keywords in text with actual values from record
 * Input: Text containing keywords and record object with replacement values
 * Output: Processed text with all keywords replaced with corresponding values
 */
const replaceKeywords = (text, record) => {
  try {
    const replacements = {
      "[CN]": record.Company || "",
      "[IND]": record.Industry || "",
      "[TITLE]": record.Title || "",
      "[NAME]": record.FirstName || "",
      "[MAIL]": record.EmailAddress || "",
    };

    let processedText = text;
    for (const [keyword, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(`\\${keyword}`, "g");
      processedText = processedText.replace(regex, replacement);
    }
    return processedText;
  } catch (error) {
    logger.error("Error in keyword replacement", {
      text,
      record,
      errorMessage: error.message,
    });
    throw error;
  }
};

/**
 * Purpose: Main controller function that processes campaigns and sends bulk emails
 * Input: HTTP request and response objects containing campaign processing parameters
 * Output: JSON response with success status, message, and email count or error details
 */
export const extractDataAndSendMail = async (req, res) => {
  try {
    let campaignData, contentData, salesPersonData;
    const campaignDetails = await SelectQuery(
      "select * FROM Schedule_Campaign where Status=0 order by CONVERT(datetime, StartDate ,105) asc, cast(StartTime as datetime)",
      "Campaign Details Retrieval"
    );

    if (!campaignDetails || campaignDetails.length === 0) {
      logger.info("No campaigns found");
      return res.status(404).json({ 
        status: "Error", 
        message: "No campaigns found" 
      });
    }

    const Data = [];
    let Success = false;

    for (const campaign of campaignDetails) {
      try {
        const startDate = campaign.StartDate.split('-'); // Split by '-'
        const formattedStartDate = `${startDate[2]}-${startDate[1]}-${startDate[0]}`; // Reformat to YYYY-MM-DD

        const campaignStartDate = new Date(`${formattedStartDate}T${campaign.StartTime}:00`);
        const currentDateTime = new Date();
        currentDateTime.setHours(currentDateTime.getHours() + 1);

        console.log("Campaign Start Date:", campaignStartDate.toISOString());
        console.log("Current Date Time:", currentDateTime.toISOString());

        if (campaignStartDate < currentDateTime) {
          campaignData = await SelectQuery(
            `Select * FROM Campaign_Data where Campaign_FileName='${campaign.CampaignID}' and Record_Status=0 and Unsubscribe=0 and WrongID=0`,
            "Campaign Data Retrieval"
          );
          contentData = await SelectQuery(
            `Select * FROM Content_Data where ContentID='${campaign.ContentID}'`,
            "Content Data Retrieval"
          );
          salesPersonData = await SelectQuery(
            `select * FROM Sales_Person_Data where Sales_PersonName='${campaign.Sales_PersonName}'`,
            "Sales Person Data Retrieval"
          );

          if (!contentData || contentData.length === 0) {
            logger.warn(`No content found for ContentID: ${campaign.ContentID}`);
            continue;
          }

          if (!salesPersonData || salesPersonData.length === 0) {
            logger.warn(`No sales person found for: ${campaign.Sales_PersonName}`);
            continue;
          }

          const { Subject, Body } = contentData[0];
          const { EmailID } = salesPersonData[0];
          let encodedEmail = "";

          for (const record of campaignData) {
            try {
              const processedSubject = replaceKeywords(Subject, record);
              const processedBody = replaceKeywords(Body, record);
              let UnsubsLink = "";
              // let buffer = Buffer.alloc(0)

              encodedEmail = Buffer.from(record.EmailAddress).toString("base64");

              UnsubsLink = campaign.CampaignID.includes("SUC")
                ? `https://www.silvertouchtech.co.uk/mailer-unsubscribe/?cemail=${encodedEmail}`
                : "https://www.silvertouch.com/unsubscribe-mailer/";

              const emailTemplate = `Hello ${record.FirstName},<br>
                ${processedBody}<br><br>
                <strong>Disclaimer:</strong> As a CANSPAM and GDPR compliant organization, we would like to explain why you have received this email. We believe that ${record.Company} has a legitimate interest in the White Label services that our domain is offering. Our research has identified your email address as the appropriate contact for the same.
                This email was sent to ${record.EmailAddress}.
                If you don't want to hear from us again, please click on <u><a href="${UnsubsLink}" style="color:blue;">Unsubscribe</a></u>.`;
                // for(var i=0;i<80;i++){
                  Data.push({
                    to: record.EmailAddress,
                    from: EmailID,
                    subject: processedSubject,
                    html: emailTemplate,
                  });
                // }
            } catch (recordError) {
              logger.error("Error processing individual record", {
                recordId: record.EmailAddress,
                error: recordError.message,
              });
              continue;
            }
          }
        }

        // Send emails and update database
        if (Data.length > 0) {
          try {
            console.log("Mails has been created and started Sending....")
            const response = await sendBulkMails(Data);

            if (!response.success) {
              logger.error("Email sending failed", { response });
              throw new EmailSendingError("Failed to send emails", response);
            }

            await sequelize.query(
              `Update Campaign_Data Set Content_ID='${campaign.ContentID}', Sales_Person_Name='${salesPersonData[0].Sales_PersonName}', Record_DateTime=getdate() where Campaign_FileName='${campaign.CampaignID}' and Record_Status=0 and Unsubscribe=0 and WrongID=0`
            );

            await sequelize.query(
              `Update Schedule_Campaign Set Status=1, Total_Sent_Mails=${Data.length} where ID=${campaign.ID}`
            );

            const personalRes = await sendPersonalMail(campaign.CampaignID, campaign.ContentID, Data.length,salesPersonData[0].EmailID);

            if(personalRes.success){
              console.log("personal Mail Sended Succesfully")
            }

            // return res.json({
            //   success: true,
            //   message: "Emails sent successfully",
            //   count: Data.length
            // });
            Success = true;
          } catch (sendError) {
            logger.error("Error in email sending or database update", {
              error: sendError.message,
              stack: sendError.stack,
            });
            Success = false;
            // return res.status(500).json({
            //   success: false,
            //   message: "Failed to send emails or update database",
            //   error: sendError.message,
            // });
          }
        } else {
          logger.info("No emails to send for this campaign");
          // return res.json({
          //   success: true,
          //   message: "No emails to send",
          //   count: 0,
          // });
          Success = false;
        }
      } catch (campaignError) {
        logger.error("Error processing campaign", {
          campaignId: campaign.CampaignID,
          error: campaignError.message,
          stack: campaignError.stack,
        });
        continue;
      }
    }

    if(Success) {
      return res.json({
          success: true,
          message: "Emails sent successfully",
          count: Data.length
        });
    } else {
      return res.json({
        success: true,
        message: "No campaigns processed",
        count: 0,
      });
    }

    
  } catch (error) {
    logger.error("Unexpected error in extractData", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "Unexpected error in campaign processing",
      error: error.message,
    });
  }
};

