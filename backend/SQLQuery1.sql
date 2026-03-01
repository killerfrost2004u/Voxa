USE DarkWolvesDB;
GO

CREATE TABLE Jobs (
    JobID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(255) NOT NULL,
    Company NVARCHAR(255) NOT NULL,
    Location NVARCHAR(255) DEFAULT 'Remote',
    Salary NVARCHAR(100) DEFAULT 'Competitive Base + Commission',
    Schedule NVARCHAR(255) DEFAULT 'Monday - Friday (US Business Hours)',
    Requirements NVARCHAR(MAX),
    Description NVARCHAR(MAX),
    Status NVARCHAR(50) DEFAULT 'Active' -- Can be 'Active' or 'On Hold'
);
GO

-- Insert a test job so your frontend isn't empty!
INSERT INTO Jobs (Title, Company, Location, Salary, Schedule, Status)
VALUES ('Senior Cold Caller', 'Dark Wolves', 'Remote', '$500/month + 5% Commission', 'Mon-Fri 9AM-5PM EST', 'Active');
GO