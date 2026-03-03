-- This creates a new table to store grades per agency
CREATE TABLE ValidatorGrades (
    GradeID INT IDENTITY(1,1) PRIMARY KEY,
    ApplicationID INT NOT NULL, -- Links to the candidate
    AgencyName NVARCHAR(100) NOT NULL, -- "Dark Wolves", "Career Core", etc.
    HumanGrade NVARCHAR(50) NOT NULL, -- "C1", "B2", etc.
    ValidatorNotes NVARCHAR(MAX), -- Their specific notes
    GradedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ApplicationID) REFERENCES JobApplications(ApplicationID) ON DELETE CASCADE
);