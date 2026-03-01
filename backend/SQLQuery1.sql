USE DarkWolvesDB;
GO

-- Drop the old table if you already created it
IF OBJECT_ID('Jobs', 'U') IS NOT NULL DROP TABLE Jobs;
GO

-- Create the new detailed Jobs table
CREATE TABLE Jobs (
    JobID INT IDENTITY(1,1) PRIMARY KEY,
    Status NVARCHAR(50) DEFAULT 'Active',
    CompanyName NVARCHAR(255) NOT NULL,
    JobTitle NVARCHAR(255) NOT NULL,
    AccountType NVARCHAR(255),
    WorkingHours NVARCHAR(255),
    InterviewTime NVARCHAR(255),
    SalaryPackage NVARCHAR(255),
    TargetAudience NVARCHAR(255), -- For "Who can apply & Max age"
    Location NVARCHAR(255),
    Training NVARCHAR(255),
    OfferDetails NVARCHAR(MAX)    -- For "OFFER ??"
);
GO