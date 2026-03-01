USE DarkWolvesDB;
GO

ALTER TABLE JobApplications ADD Grammar_Rating NVARCHAR(50);
ALTER TABLE JobApplications ADD Fluency_Rating NVARCHAR(50);
ALTER TABLE JobApplications ADD Pronunciation_Rating NVARCHAR(50);
GO