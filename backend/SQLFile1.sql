-- 1. Point to your specific database
USE DarkWolvesDB;
GO

-- 2. Update the phone number for the candidate you are testing
UPDATE JobApplications
SET WhatsApp = '+201125537697'   -- ?? REPLACE THIS with your actual phone number
WHERE ApplicationID = 18;        -- ?? REPLACE THIS with the ID you plan to click "Analyze" on
GO

-- 3. Verify it worked by checking the row
SELECT ApplicationID, FullName, WhatsApp 
FROM JobApplications 
WHERE ApplicationID = 18;
GO