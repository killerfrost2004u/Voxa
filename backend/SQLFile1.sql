USE DarkWolvesDB;
GO

-- Replace these emails with the people you want to be admins
UPDATE Users
SET IsAdmin = 1
WHERE Email IN (
    'hima.yasser2004@gmail.com', 
    'manager@darkwolves.com',
    'another.admin@gmail.com'
);
GO

-- Add VoiceRecordPath column to JobApplications table
ALTER TABLE JobApplications ADD VoiceRecordPath NVARCHAR(255);
GO