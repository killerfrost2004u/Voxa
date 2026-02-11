USE DarkWolvesDB;
GO

-- 1. CLEANUP: Remove broken records that confuse the AI
DELETE FROM JobApplications 
WHERE VoiceRecordPath IS NULL 
   OR VoiceRecordPath = 'null' 
   OR VoiceRecordPath = 'No_File';

-- 2. DOCTOR: Check and Add Missing Columns (Prevents Database Crashes)
-- Core Columns
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'MilitaryStatus')
    ALTER TABLE JobApplications ADD MilitaryStatus NVARCHAR(50);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'NationalID')
    ALTER TABLE JobApplications ADD NationalID NVARCHAR(50);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'Nationality')
    ALTER TABLE JobApplications ADD Nationality NVARCHAR(50);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'Address')
    ALTER TABLE JobApplications ADD Address NVARCHAR(MAX);

-- AI Columns (Crucial for the "Analyzing" step)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'Transcription')
    ALTER TABLE JobApplications ADD Transcription NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'AI_Rating')
    ALTER TABLE JobApplications ADD AI_Rating NVARCHAR(100);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'AI_Summary')
    ALTER TABLE JobApplications ADD AI_Summary NVARCHAR(MAX);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('JobApplications') AND name = 'SpeechRate')
    ALTER TABLE JobApplications ADD SpeechRate FLOAT;

PRINT ' Database Check Complete: All columns are present and clean.';
GO