USE DarkWolvesDB;
GO

ALTER TABLE JobApplications 
ADD Status NVARCHAR(50) DEFAULT 'In Review';
GO