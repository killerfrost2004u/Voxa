USE DarkWolvesDB;
GO

-- Delete records where the voice file name is missing or invalid
DELETE FROM JobApplications 
WHERE VoiceRecordPath IS NULL 
   OR VoiceRecordPath = 'null' 
   OR VoiceRecordPath = ''
   OR VoiceRecordPath = 'No_File';

PRINT ' Empty records removed. Now only candidates with audio remain.';