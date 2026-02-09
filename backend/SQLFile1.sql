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

USE DarkWolvesDB;
GO

-- Adding new columns for AI results and Speech Analysis
ALTER TABLE JobApplications ADD Transcription NVARCHAR(MAX);
ALTER TABLE JobApplications ADD AI_Rating NVARCHAR(100);
ALTER TABLE JobApplications ADD AI_Summary NVARCHAR(MAX);
ALTER TABLE JobApplications ADD SpeechRate FLOAT; -- Words per minute
ALTER TABLE JobApplications ADD ConfidenceScore FLOAT; -- Audio clarity
GO

CREATE TABLE ContactMessages (
    MessageID INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100),
    Email NVARCHAR(100),
    Subject NVARCHAR(200),
    Message NVARCHAR(MAX),
    SubmittedAt DATETIME
);

CREATE TABLE ContactMessages (
    MessageID INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100),
    Email NVARCHAR(100),
    Subject NVARCHAR(200),
    Message NVARCHAR(MAX),
    SubmittedAt DATETIME
);