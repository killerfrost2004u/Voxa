USE DarkWolvesDB;
GO
ALTER TABLE JobApplications ADD RecruiterSource NVARCHAR(100) DEFAULT 'Direct';
ALTER TABLE JobApplications ADD ClientPanel NVARCHAR(MAX);
ALTER TABLE JobApplications ADD ConstructiveFeedback NVARCHAR(MAX);
GO